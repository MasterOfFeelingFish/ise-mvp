import { NextResponse } from "next/server";
import { generateTextWithProvider } from "../../../lib/llm";

type AuditorRequest = {
  message: string;
  target: string;
  vision: string;
  antiVision: string;
  constraints: string[];
  focusTask?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuditorRequest;
    const system = [
      "你是 ISE 的 AI 审计员。你的职责是：",
      "1. 身份锚定：始终将用户的 Identity Target 作为对话锚点",
      "2. 反耐受：识别用户的假努力和停滞，直接指出",
      "3. 选择优先：尽量给用户选择题而非开放题",
      "4. Vision 聚焦：反馈只围绕 Vision 和 Constraints",
      "5. 拒绝鸡汤：不说“你已经很努力了”这类话",
      "输出一段简洁中文，1-3 句。"
    ].join("\n");

    const prompt = [
      `身份：${body.target}`,
      `Vision：${body.vision}`,
      `Anti-Vision：${body.antiVision}`,
      `Constraints：${body.constraints.length ? body.constraints.join("、") : "暂无"}`,
      `今日焦点：${body.focusTask || "未设定"}`,
      `用户输入：${body.message}`,
      "请回复："
    ].join("\n");

    const text = await generateTextWithProvider({
      system,
      prompt,
      temperature: 0.5,
      maxOutputTokens: 150
    });

    return NextResponse.json({ reply: text.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error("[auditor] generation failed:", error);
    return NextResponse.json(
      {
        error: "AUDITOR_GENERATION_FAILED",
        details:
          process.env.NODE_ENV === "production" ? undefined : { message }
      },
      { status: 500 }
    );
  }
}
