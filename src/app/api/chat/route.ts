import { randomUUID } from "node:crypto";
import { generateId, type ModelMessage } from "ai";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getEnv } from "@/lib/env";
import { createLoggedStream } from "@/lib/logger-sdk";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createConversation, insertMessage, upsertConversation } from "@/lib/repository";
import { chatRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTEXT_MESSAGE_LIMIT = 12;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 12;

function trimContext(messages: ModelMessage[]) {
  return messages.slice(-CONTEXT_MESSAGE_LIMIT);
}

export async function POST(request: Request) {
  const requestId = randomUUID();

  try {
    const rateLimit = checkRateLimit(getClientIp(request), RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many chat requests. Try again shortly.", requestId },
        { status: 429, headers: { "retry-after": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
      );
    }

    const env = getEnv();
    const parsed = chatRequestSchema.parse(await request.json());
    const totalChars = parsed.messages.reduce((sum, message) => sum + message.content.length, 0);
    if (totalChars > env.MAX_PROMPT_CHARS) {
      return NextResponse.json({ error: "Prompt is too large.", requestId }, { status: 413 });
    }

    const lastUserMessage = [...parsed.messages].reverse().find((message) => message.role === "user");
    const conversationId = parsed.conversationId ?? await createConversation(lastUserMessage?.content.slice(0, 80) || "New conversation");
    if (parsed.conversationId) await upsertConversation(conversationId, lastUserMessage?.content.slice(0, 80) || "Conversation");
    for (const message of parsed.messages) await insertMessage(conversationId, message);

    const currentDate = new Date().toLocaleDateString("en-US", { dateStyle: "full", timeZone: "Asia/Kolkata" });
    const system = [
      `Current date: ${currentDate}.`,
      "Keep answers concise and useful.",
      "If a question depends on current or real-time facts, say that this app has no live web retrieval configured.",
    ].join("\n");
    const modelMessages = trimContext(parsed.messages.map((message) => ({ role: message.role, content: message.content })));

    const result = createLoggedStream({
      requestId,
      conversationId,
      messages: modelMessages,
      requestUrl: request.url,
      system,
      signal: request.signal,
      onSuccess: async (text) => insertMessage(conversationId, { id: generateId(), role: "assistant", content: text }),
    });

    return result.toTextStreamResponse({ headers: { "x-conversation-id": conversationId } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid chat payload.", requestId }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to process chat request.", requestId }, { status: 500 });
  }
}
