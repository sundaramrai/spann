import { loadEnvConfig } from "@next/env";
import { getPool } from "../src/lib/db";

loadEnvConfig(process.cwd());
const sql = `
create extension if not exists pgcrypto;

create table if not exists conversations (
  id uuid primary key,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id text primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists inference_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  message_id text,
  provider text not null,
  model text not null,
  status text not null check (status in ('success', 'error', 'cancelled')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  latency_ms integer not null,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  input_preview text not null,
  output_preview text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_created_idx on chat_messages(conversation_id, created_at);
create index if not exists inference_logs_created_idx on inference_logs(created_at desc);
create index if not exists inference_logs_provider_model_idx on inference_logs(provider, model);
create index if not exists inference_logs_status_idx on inference_logs(status);
`;

async function main() {
  const pool = getPool();
  await pool.query(sql);
  await pool.end();
  process.stdout.write("Database migrated.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

