import { NextResponse } from "next/server";
import { generateTextWithProvider } from "../../../lib/llm";

type SuggestionRequest = {
  target: string;
  vision: string;
  constraints: string[];
};

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.replace(/```json\s*([\s\S]*?)```/gi, "$1").trim();
  const candidate = fenced.startsWith("{") && fenced.endsWith("}")
    ? fenced
    : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return candidate.slice(start, end + 1);
  }
  return null;
}

function parseLoose(text: string) {
  const cleaned = text.replace(/```json\s*([\s\S]*?)```/gi, "$1").trim();
  const match =
    cleaned.match(/"suggestion"\s*:\s*"([^"]+)"/i) ||
    cleaned.match(/建议[:：]\s*([^\n]+)/i);
  if (!match) return null;
  return match[1]?.trim();
}

function fallbackSuggestion(target: string, vision: string) {
  const shortVision = vision.replace(/^[“"']|[”"']$/g, "").slice(0, 14);
  return `完成${shortVision || target}的核心推进`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SuggestionRequest;
    const system = [
      "你是 ISE 的 AI 审计员。",
      "根据身份与 Vision 生成一个今日 Non-negotiable 建议。",
      "输出必须是一个简短任务，格式类似“完成xxx”。",
      "只输出 JSON，且必须是严格 JSON（双引号、无注释、无多余文本）。",
      "返回格式示例：{\"suggestion\":\"...\"}",
      "使用中文输出。"
    ].join("\n");

    const prompt = [
      `身份：${body.target}`,
      `Vision：${body.vision}`,
      `Constraints：${body.constraints.length ? body.constraints.join("、") : "暂无"}`,
      "生成今日建议："
    ].join("\n");

    const text = await generateTextWithProvider({
      system,
      prompt,
      temperature: 0.4,
      maxOutputTokens: 60,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          suggestion: { type: "string" }
        },
        required: ["suggestion"],
        additionalProperties: false
      }
    });

    const json = extractJson(text);
    const parsed = json ? (JSON.parse(json) as { suggestion?: string }) : null;
    if (!parsed?.suggestion) {
      const loose = parseLoose(text);
      return NextResponse.json({
        suggestion: loose || fallbackSuggestion(body.target, body.vision)
      });
    }

    return NextResponse.json({ suggestion: parsed.suggestion.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error("[suggestion] generation failed:", error);
    return NextResponse.json(
      {
        error: "SUGGESTION_GENERATION_FAILED",
        details:
          process.env.NODE_ENV === "production" ? undefined : { message }
      },
      { status: 500 }
    );
  }
}
