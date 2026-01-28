import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { GoogleGenAI } from "@google/genai";

type GenerateOptions = {
  system: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  responseMimeType?: "application/json";
  responseSchema?: Record<string, unknown>;
};

function resolveProvider() {
  const provider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  const model =
    process.env.LLM_MODEL ||
    (provider === "google" ? "gemini-1.5-flash" : "gpt-4o-mini");
  return { provider, model };
}

export async function generateTextWithProvider(options: GenerateOptions) {
  const { provider, model } = resolveProvider();

  if (provider === "google") {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY missing");
    }
    const ai = new GoogleGenAI({ apiKey });
    const combined = `${options.system}\n\n${options.prompt}`;
    const response = await ai.models.generateContent({
      model,
      contents: combined,
      config: {
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
        responseMimeType: options.responseMimeType,
        responseSchema: options.responseSchema
      }
    });
    const text = response.text ?? "";
    if (!text) {
      throw new Error("Empty response from Google GenAI");
    }
    return text;
  }

  const { text } = await generateText({
    model: openai(model),
    system: options.system,
    prompt: options.prompt,
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens
  });
  return text;
}
