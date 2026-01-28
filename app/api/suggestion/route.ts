import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

export const runtime = "nodejs";

type SuggestionRequest = {
  target: string;
  vision: string;
  constraints: string[];
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SuggestionRequest;
    const provider = pickProvider();

    const system = [
      "你是 ISE 的 AI 审计员。",
      "根据身份与 Vision 生成一个今日 Non-negotiable 建议。",
      "输出必须是一个简短任务，格式类似“完成xxx”。",
      "只输出 JSON，包含 suggestion 字段，不要额外文本。",
      "使用中文输出。"
    ].join("\n");

    const prompt = [
      `身份：${body.target}`,
      `Vision：${body.vision}`,
      `Constraints：${body.constraints.length ? body.constraints.join("、") : "暂无"}`,
      "生成今日建议："
    ].join("\n");

    const { text } = await generateText({
      model: provider,
      system,
      prompt,
      temperature: 0.4,
      maxOutputTokens: 60
    });

    const json = extractJson(text);
    const parsed = json ? (JSON.parse(json) as { suggestion?: string }) : null;
    if (!parsed?.suggestion) {
      return NextResponse.json(
        { error: "SUGGESTION_PARSE_FAILED" },
        { status: 500 }
      );
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
