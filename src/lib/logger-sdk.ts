import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { getEnv } from "./env";
import { redactPreview } from "./redaction";
import { inferenceLogSchema, type InferenceLogPayload } from "./schemas";

export interface LoggedStreamOptions {
  requestId: string;
  conversationId: string;
  messages: ModelMessage[];
  requestUrl: string;
  system: string;
  signal?: AbortSignal;
  onSuccess?: (text: string) => Promise<void>;
}

async function sendInferenceLog(requestUrl: string, payload: InferenceLogPayload) {
  const env = getEnv();
  try {
    const response = await fetch(new URL("/api/inference-logs", requestUrl), {
      method: "POST",
      headers: { "content-type": "application/json", "x-log-api-key": env.LOG_INGEST_API_KEY },
      body: JSON.stringify(payload),
    });
    if (!response.ok) console.error("Failed to ingest inference log", await response.text());
  } catch (error) {
    console.error("Failed to ingest inference log", error);
  }
}

function getContent(message: ModelMessage | undefined) {
  return typeof message?.content === "string" ? message.content : JSON.stringify(message?.content ?? "");
}

export function createLoggedStream({
  requestId,
  conversationId,
  messages,
  requestUrl,
  system,
  signal,
  onSuccess,
}: LoggedStreamOptions) {
  const env = getEnv();
  const provider = createOpenAI({ name: env.LLM_PROVIDER, baseURL: env.LLM_BASE_URL, apiKey: env.LLM_API_KEY });
  const startedAt = new Date();
  const startedTime = performance.now();
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

  return streamText({
    model: provider.chat(env.LLM_MODEL),
    system,
    messages,
    abortSignal: signal,
    onFinish: async ({ text, usage }) => {
      const endedAt = new Date();
      const promptTokens = usage.inputTokens ?? null;
      const completionTokens = usage.outputTokens ?? null;
      const totalTokens = promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null;
      await onSuccess?.(text);
      await sendInferenceLog(requestUrl, inferenceLogSchema.parse({
        conversationId,
        requestId,
        provider: env.LLM_PROVIDER,
        model: env.LLM_MODEL,
        status: "success",
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        latencyMs: Math.round(performance.now() - startedTime),
        promptTokens,
        completionTokens,
        totalTokens,
        inputPreview: redactPreview(getContent(lastUserMessage)),
        outputPreview: redactPreview(text),
        errorMessage: null,
        metadata: { messageCount: messages.length },
      }));
    },
    onError: async ({ error }) => {
      const endedAt = new Date();
      let errorMessage: string | null;
      if (signal?.aborted) {
        errorMessage = null;
      } else if (error instanceof Error) {
        errorMessage = redactPreview(error.message);
      } else {
        errorMessage = "Unknown error";
      }

      await sendInferenceLog(requestUrl, inferenceLogSchema.parse({
        conversationId,
        requestId,
        provider: env.LLM_PROVIDER,
        model: env.LLM_MODEL,
        status: signal?.aborted ? "cancelled" : "error",
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        latencyMs: Math.round(performance.now() - startedTime),
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        inputPreview: redactPreview(getContent(lastUserMessage)),
        outputPreview: null,
        errorMessage,
        metadata: { messageCount: messages.length },
      }));
    },
  });
}
