import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "nodejs";

export async function GET() {
  const provider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  const model =
    process.env.LLM_MODEL ||
    (provider === "google" ? "gemini-1.5-flash" : "gpt-4o-mini");

  try {
    if (provider === "google") {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { ok: false, error: "GOOGLE_GENERATIVE_AI_API_KEY missing" },
          { status: 400 }
        );
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: "ping",
        config: { maxOutputTokens: 5 }
      });
      return NextResponse.json({
        ok: true,
        provider,
        model,
        text: response.text ?? ""
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY missing" },
        { status: 400 }
      );
    }
    const { text } = await generateText({
      model: openai(model),
      prompt: "ping",
      maxOutputTokens: 5
    });
    return NextResponse.json({ ok: true, provider, model, text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error("[llm-test] failed:", error);
    return NextResponse.json(
      { ok: false, provider, model, error: message },
      { status: 500 }
    );
  }
}
