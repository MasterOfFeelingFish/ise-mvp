import { NextResponse } from "next/server";
import { generateTextWithProvider } from "../../../lib/llm";

export const runtime = "nodejs";

type VisionRequest = {
  target: string;
  challenge?: string;
  customTarget?: string;
};

type VisionResponse = {
  vision: string;
  antiVision: string;
};

function resolveTarget(target: string, customTarget?: string) {
  if (target === "自定义") {
    return customTarget?.trim() || "自定义身份";
  }
  return target;
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const fenced = trimmed.replace(/```json\s*([\s\S]*?)```/gi, "$1").trim();
  if (fenced.startsWith("{") && fenced.endsWith("}")) {
    return fenced;
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return null;
}

function parseLoose(text: string) {
  const cleaned = text.replace(/```json\s*([\s\S]*?)```/gi, "$1").trim();
  const visionMatch =
    cleaned.match(/"vision"\s*:\s*"([^"]+)"/i) ||
    cleaned.match(/Vision[:：]\s*([^\n]+)/i);
  const antiMatch =
    cleaned.match(/"antiVision"\s*:\s*"([^"]+)"/i) ||
    cleaned.match(/Anti-?Vision[:：]\s*([^\n]+)/i) ||
    cleaned.match(/反愿景[:：]\s*([^\n]+)/i);
  if (!visionMatch || !antiMatch) return null;
  return {
    vision: visionMatch[1]?.trim(),
    antiVision: antiMatch[1]?.trim()
  };
}

function fallbackVision(target: string) {
  return `成为能持续兑现${target}核心价值的行动者`;
}

function fallbackAntiVision(challenge: string) {
  return `长期停滞在“${challenge}”的惯性中，目标会逐渐失焦`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VisionRequest;
    const target = resolveTarget(body.target, body.customTarget);
    const challenge = body.challenge || "尚未明确";

    const system = [
      "你是 ISE 的 AI 审计员。",
      "根据身份与挑战生成 Vision 与 Anti-Vision。",
      "Vision 要具体、有行动感、可衡量倾向，避免空泛鸡汤。",
      "Anti-Vision 要直接、清晰，强调不改变的代价。",
      "Vision 必须是 1 句话，格式为「成为xxxx的xxxx」，长度 15-30 字。",
      "Anti-Vision 可以稍长，但仍保持 1-2 句话，总长度 40-90 字。",
      "风格参考：简洁、克制、直击要害。",
      "只输出 JSON，且必须是严格 JSON（双引号、无注释、无多余文本）。",
      "返回格式示例：{\"vision\":\"...\",\"antiVision\":\"...\"}",
      "使用中文输出。"
    ].join("\n");

    const prompt = [
      `目标身份：${target}`,
      `主要挑战：${challenge}`,
      "生成 Vision 与 Anti-Vision："
    ].join("\n");

    const text = await generateTextWithProvider({
      system,
      prompt,
      temperature: 0.6,
      maxOutputTokens: 120,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          vision: { type: "string" },
          antiVision: { type: "string" }
        },
        required: ["vision", "antiVision"],
        additionalProperties: false
      }
    });

    let parsed: VisionResponse | null = null;
    try {
      const json = extractJson(text);
      parsed = json ? (JSON.parse(json) as VisionResponse) : null;
    } catch {
      parsed = null;
    }

    if (!parsed?.vision || !parsed?.antiVision) {
      const loose = parseLoose(text);
      if (loose?.vision && loose?.antiVision) {
        return NextResponse.json({
          vision: loose.vision.trim(),
          antiVision: loose.antiVision.trim()
        });
      }
      return NextResponse.json({
        vision: fallbackVision(target),
        antiVision: fallbackAntiVision(challenge)
      });
    }

    return NextResponse.json({
      vision: parsed.vision.trim(),
      antiVision: parsed.antiVision.trim()
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown_error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[vision] generation failed:", error);
    return NextResponse.json(
      {
        error: "VISION_GENERATION_FAILED",
        details:
          process.env.NODE_ENV === "production"
            ? undefined
            : { message, stack }
      },
      { status: 500 }
    );
  }
}
