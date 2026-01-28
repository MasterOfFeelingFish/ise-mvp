import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

const STATE_KEY = "ise-mvp-state";

function hasKvConfig() {
  return (
    Boolean(process.env.KV_REST_API_URL) &&
    Boolean(process.env.KV_REST_API_TOKEN)
  );
}

export async function GET() {
  try {
    if (!hasKvConfig()) {
      return NextResponse.json(
        { error: "KV_NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    const data = await kv.get(STATE_KEY);
    return NextResponse.json({ state: data ?? null });
  } catch (error) {
    console.error("[state] kv get failed:", error);
    return NextResponse.json({ error: "KV_READ_FAILED" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    if (!hasKvConfig()) {
      return NextResponse.json(
        { error: "KV_NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    const body = (await request.json()) as { state?: unknown };
    if (!body.state) {
      return NextResponse.json(
        { error: "STATE_MISSING" },
        { status: 400 }
      );
    }
    await kv.set(STATE_KEY, body.state);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[state] kv set failed:", error);
    return NextResponse.json({ error: "KV_WRITE_FAILED" }, { status: 503 });
  }
}
