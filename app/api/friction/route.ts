import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

export const runtime = "nodejs";

type FrictionRequest = {
  taskName: string;
  target: string;
  vision: string;
  antiVision: string;
  history: string[];
};

function pickProvider() {
  const providerName = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  const modelId =
    process.env.LLM_MODEL ||
    (providerName === "google" ? "gemini-1.5-flash" : "gpt-4o-mini");
  return providerName === "google" ? google(modelId) : openai(modelId);
}

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.replace(/```json\s*([\s\S]*?)```/gi, "$1").trim();
  const candidate =
    fenced.startsWith("{") && fenced.endsWith("}") ? fenced : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return candidate.slice(start, end + 1);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FrictionRequest;
    const provider = pickProvider();

    const system = [
      "你是 ISE 的 AI 审计员。",
      "根据任务与上下文识别 2-4 个 Friction Points。",
      "输出必须是 JSON，包含 frictionPoints 字段，值为字符串数组。",
      "每个阻力点不超过 12 个字，避免空泛。",
      "使用中文输出，不要额外文本。"
    ].join("\n");

    const prompt = [
      `身份：${body.target}`,
      `Vision：${body.vision}`,
      `Anti-Vision：${body.antiVision}`,
      `任务：${body.taskName}`,
      `历史进展：${body.history.length ? body.history.join("；") : "暂无"}`,
      "生成 frictionPoints："
    ].join("\n");

    const { text } = await generateText({
      model: provider,
      system,
      prompt,
      temperature: 0.5,
      maxTokens: 120
    });

    const json = extractJson(text);
    const parsed = json
      ? (JSON.parse(json) as { frictionPoints?: string[] })
      : null;
    if (!parsed?.frictionPoints?.length) {
      return NextResponse.json(
        { error: "FRICTION_PARSE_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      frictionPoints: parsed.frictionPoints.map((item) => item.trim())
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error("[friction] generation failed:", error);
    return NextResponse.json(
      {
        error: "FRICTION_GENERATION_FAILED",
        details:
          process.env.NODE_ENV === "production" ? undefined : { message }
      },
      { status: 500 }
    );
  }
}
