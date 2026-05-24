import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { insertInferenceLog } from "@/lib/repository";
import { inferenceLogSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-log-api-key");
  if (apiKey !== getEnv().LOG_INGEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = inferenceLogSchema.parse(await request.json());
  await insertInferenceLog(payload);

  return NextResponse.json({ ok: true });
}
