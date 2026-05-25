import { z } from "zod";

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.iso.datetime().optional(),
});

export const chatRequestSchema = z.object({
  conversationId: z.uuid().optional(),
  messages: z.array(chatMessageSchema).min(1).max(24),
});

export const dashboardWindowSchema = z.coerce.number().int().positive().max(168).default(24);

export const inferenceLogSchema = z.object({
  requestId: z.uuid().optional(),
  conversationId: z.uuid(),
  messageId: z.string().min(1).optional(),
  provider: z.string().min(1),
  model: z.string().min(1),
  status: z.enum(["success", "error", "cancelled"]),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
  latencyMs: z.number().nonnegative(),
  promptTokens: z.number().int().nonnegative().nullable(),
  completionTokens: z.number().int().nonnegative().nullable(),
  totalTokens: z.number().int().nonnegative().nullable(),
  inputPreview: z.string(),
  outputPreview: z.string().nullable(),
  errorMessage: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type InferenceLogPayload = z.infer<typeof inferenceLogSchema>;
