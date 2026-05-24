import { NextResponse } from "next/server";
import { getConversationMessages } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ messages: await getConversationMessages(id) });
}
