import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getEnv } from "@/lib/env";
import {
  createIngestionEvent,
  insertInferenceLog,
  markIngestionEventFailed,
  markIngestionEventProcessed,
} from "@/lib/repository";
import { inferenceLogSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-log-api-key");
  if (apiKey !== getEnv().LOG_INGEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = inferenceLogSchema.parse(await request.json());
    const eventId = await createIngestionEvent(payload);
    if (!eventId) return NextResponse.json({ error: "Unable to create ingestion event" }, { status: 500 });

    try {
      await insertInferenceLog(payload);
      await markIngestionEventProcessed(eventId);
    } catch (error) {
      await markIngestionEventFailed(eventId, error instanceof Error ? error.message : "Unknown ingestion error");
      throw error;
    }

    return NextResponse.json({ ok: true, eventId });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid inference log payload" }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to ingest log" }, { status: 500 });
  }
}
