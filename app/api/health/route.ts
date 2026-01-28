import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const provider =
    (process.env.LLM_PROVIDER || "openai").toLowerCase();
  const model =
    process.env.LLM_MODEL ||
    (provider === "google" ? "gemini-1.5-flash" : "gpt-4o-mini");

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGoogle = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const hasKv =
    Boolean(process.env.KV_REST_API_URL) &&
    Boolean(process.env.KV_REST_API_TOKEN);

  return NextResponse.json({
    status: "ok",
    llm: {
      provider,
      model,
      hasOpenAIKey: hasOpenAI,
      hasGoogleKey: hasGoogle
    },
    kv: {
      configured: hasKv
    }
  });
}
