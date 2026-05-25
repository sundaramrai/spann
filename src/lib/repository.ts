import { randomUUID } from "node:crypto";
import { query } from "./db";
import type { Conversation, DashboardStats } from "./app-types";
import type { ChatMessage, InferenceLogPayload } from "./schemas";

let ingestionSchemaReady: Promise<void> | null = null;

async function ensureIngestionSchema() {
  ingestionSchemaReady ??= query(
    `create table if not exists ingestion_events (
       id uuid primary key default gen_random_uuid(),
       request_id uuid,
       status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
       payload jsonb not null,
       error_message text,
       received_at timestamptz not null default now(),
       processed_at timestamptz
     );

     alter table inference_logs add column if not exists request_id uuid;

     create index if not exists inference_logs_request_id_idx on inference_logs(request_id);
     create index if not exists ingestion_events_status_received_idx on ingestion_events(status, received_at);`,
  ).then(() => undefined);

  await ingestionSchemaReady;
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
  const result = await query<Conversation>(
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

export async function deleteConversation(conversationId: string) {
  const result = await query<{ id: string }>(
    `delete from conversations
      where id = $1
      returning id::text`,
    [conversationId],
  );
  return Boolean(result.rowCount);
}

export async function insertInferenceLog(log: InferenceLogPayload) {
  await ensureIngestionSchema();
  await query(
    `insert into inference_logs (
       request_id, conversation_id, message_id, provider, model, status, started_at, ended_at,
       latency_ms, prompt_tokens, completion_tokens, total_tokens, input_preview,
       output_preview, error_message, metadata
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      log.requestId ?? null,
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

export async function createIngestionEvent(log: InferenceLogPayload) {
  await ensureIngestionSchema();
  const result = await query<{ id: string }>(
    `insert into ingestion_events (request_id, payload)
     values ($1, $2)
     returning id::text`,
    [log.requestId ?? null, JSON.stringify(log)],
  );
  return result.rows[0]?.id;
}

export async function markIngestionEventProcessed(id: string) {
  await query(
    `update ingestion_events
        set status = 'processed', processed_at = now(), error_message = null
      where id = $1`,
    [id],
  );
}

export async function markIngestionEventFailed(id: string, error: string) {
  await query(
    `update ingestion_events
        set status = 'failed', processed_at = now(), error_message = $2
      where id = $1`,
    [id, error],
  );
}

export async function getDashboardStats(windowHours = 24): Promise<DashboardStats> {
  const sinceClause = "created_at >= now() - ($1::int * interval '1 hour')";
  const [totals, providers, models, statuses, hourly, recent] = await Promise.all([
    query<{
      total_requests: string;
      average_latency_ms: string | null;
      p95_latency_ms: string | null;
      error_count: string;
      success_count: string;
      cancelled_count: string;
      total_tokens: string | null;
    }>(
      `select count(*) as total_requests,
              avg(latency_ms)::int as average_latency_ms,
              (percentile_cont(0.95) within group (order by latency_ms))::int as p95_latency_ms,
              count(*) filter (where status = 'error') as error_count,
              count(*) filter (where status = 'cancelled') as cancelled_count,
              coalesce(sum(total_tokens), 0)::text as total_tokens,
              count(*) filter (where status = 'success') as success_count
         from inference_logs
        where ${sinceClause}`,
      [windowHours],
    ),
    query<{ provider: string; count: string }>(
      `select provider, count(*) as count
         from inference_logs
        where ${sinceClause}
        group by provider
        order by count(*) desc
        limit 6`,
      [windowHours],
    ),
    query<{ model: string; count: string }>(
      `select model, count(*) as count
         from inference_logs
        where ${sinceClause}
        group by model
        order by count(*) desc
        limit 6`,
      [windowHours],
    ),
    query<{ status: string; count: string }>(
      `select status, count(*) as count
         from inference_logs
        where ${sinceClause}
        group by status
        order by count(*) desc`,
      [windowHours],
    ),
    query<{ hour: string; count: string }>(
      `select date_trunc('hour', created_at)::text as hour, count(*) as count
         from inference_logs
        where ${sinceClause}
        group by 1
        order by 1 asc
        limit 48`,
      [windowHours],
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
        where ${sinceClause}
        order by created_at desc
        limit 6`,
      [windowHours],
    ),
  ]);

  const totalRow = totals.rows[0];
  const totalRequests = Number(totalRow?.total_requests ?? 0);
  const errorCount = Number(totalRow?.error_count ?? 0);
  return {
    windowHours,
    totalRequests,
    averageLatencyMs: Number(totalRow?.average_latency_ms ?? 0),
    p95LatencyMs: Number(totalRow?.p95_latency_ms ?? 0),
    errorCount,
    successCount: Number(totalRow?.success_count ?? 0),
    cancelledCount: Number(totalRow?.cancelled_count ?? 0),
    errorRate: totalRequests > 0 ? Math.round((errorCount / totalRequests) * 1000) / 10 : 0,
    totalTokens: Number(totalRow?.total_tokens ?? 0),
    requestsPerHour: Math.round((totalRequests / windowHours) * 10) / 10,
    requestsByProvider: providers.rows.map((row) => ({ provider: row.provider, count: Number(row.count) })),
    requestsByModel: models.rows.map((row) => ({ model: row.model, count: Number(row.count) })),
    statusCounts: statuses.rows.map((row) => ({ status: row.status, count: Number(row.count) })),
    hourlyRequests: hourly.rows.map((row) => ({ hour: row.hour, count: Number(row.count) })),
    recentLogs: recent.rows,
  };
}
