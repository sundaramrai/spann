import { NextResponse } from "next/server";
import { listConversations } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ conversations: await listConversations() });
}
