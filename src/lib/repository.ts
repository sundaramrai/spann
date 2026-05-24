import { randomUUID } from "node:crypto";
import { query } from "./db";
import type { ChatMessage, InferenceLogPayload } from "./schemas";

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface DashboardStats {
  totalRequests: number;
  averageLatencyMs: number;
  errorCount: number;
  successCount: number;
  requestsByProvider: Array<{ provider: string; count: number }>;
  recentLogs: Array<{
    id: string;
    provider: string;
    model: string;
    status: string;
    latency_ms: number;
    created_at: string;
    input_preview: string;
    error_message: string | null;
  }>;
}

export async function createConversation(title: string) {
  const id = randomUUID();
  await query('insert into conversations (id, title) values ($1, $2)', [id, title]);
  return id;
}

export async function upsertConversation(id: string, title: string) {
  await query(
    `insert into conversations (id, title)
     values ($1, $2)
     on conflict (id) do update set updated_at = now()`,
    [id, title],
  );
}

export async function insertMessage(
  conversationId: string,
  message: Pick<ChatMessage, "id" | "role" | "content">,
) {
  await query(
    `insert into chat_messages (id, conversation_id, role, content)
     values ($1, $2, $3, $4)
     on conflict (id) do nothing`,
    [message.id, conversationId, message.role, message.content],
  );
}

export async function listConversations() {
  const result = await query<ConversationSummary>(
    `select c.id,
            c.title,
            c.created_at::text,
            c.updated_at::text,
            count(m.id)::int as message_count
       from conversations c
       left join chat_messages m on m.conversation_id = c.id
      group by c.id
      order by c.updated_at desc
      limit 50`,
  );
  return result.rows;
}

export async function getConversationMessages(conversationId: string) {
  const result = await query<{
    id: string;
    role: ChatMessage["role"];
    content: string;
    created_at: string;
  }>(
    `select id, role, content, created_at::text
       from chat_messages
      where conversation_id = $1
      order by created_at asc`,
    [conversationId],
  );
  return result.rows;
}

export async function insertInferenceLog(log: InferenceLogPayload) {
  await query(
    `insert into inference_logs (
       conversation_id, message_id, provider, model, status, started_at, ended_at,
       latency_ms, prompt_tokens, completion_tokens, total_tokens, input_preview,
       output_preview, error_message, metadata
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      log.conversationId,
      log.messageId ?? null,
      log.provider,
      log.model,
      log.status,
      log.startedAt,
      log.endedAt,
      log.latencyMs,
      log.promptTokens,
      log.completionTokens,
      log.totalTokens,
      log.inputPreview,
      log.outputPreview,
      log.errorMessage,
      JSON.stringify(log.metadata),
    ],
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [totals, providers, recent] = await Promise.all([
    query<{
      total_requests: string;
      average_latency_ms: string | null;
      error_count: string;
      success_count: string;
    }>(
      `select count(*) as total_requests,
              avg(latency_ms)::int as average_latency_ms,
              count(*) filter (where status = 'error') as error_count,
              count(*) filter (where status = 'success') as success_count
         from inference_logs`,
    ),
    query<{ provider: string; count: string }>(
      `select provider, count(*) as count
         from inference_logs
        group by provider
        order by count(*) desc`,
    ),
    query<DashboardStats["recentLogs"][number]>(
      `select id::text,
              provider,
              model,
              status,
              latency_ms,
              created_at::text,
              input_preview,
              error_message
         from inference_logs
        order by created_at desc
        limit 10`,
    ),
  ]);

  const totalRow = totals.rows[0];
  return {
    totalRequests: Number(totalRow?.total_requests ?? 0),
    averageLatencyMs: Number(totalRow?.average_latency_ms ?? 0),
    errorCount: Number(totalRow?.error_count ?? 0),
    successCount: Number(totalRow?.success_count ?? 0),
    requestsByProvider: providers.rows.map((row) => ({ provider: row.provider, count: Number(row.count) })),
    recentLogs: recent.rows,
  };
}
