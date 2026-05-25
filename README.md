# Spann

A lightweight Next.js chatbot with PostgreSQL-backed conversations, inference logging, and a small operations dashboard. Local development defaults to Ollama through its OpenAI-compatible API.

## Features

- Streaming chat against an OpenAI-compatible model provider
- Conversation list/resume with `?id=<conversation-id>` URLs and short context trimming
- Event-backed inference ingestion with redacted previews
- Dashboard for latency, p95, errors, throughput, tokens, and recent logs
- Request rate limiting and validation errors
- Docker Compose setup for the app and PostgreSQL

## Tech Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- AI SDK and `@ai-sdk/openai`
- PostgreSQL, `pg`, Zod
- pnpm, Docker Compose

## Setup

1. Install dependencies.

```bash
pnpm install
```

1. Copy env file.

```bash
copy .env.example .env
```

1. Install Ollama and pull the default local model.

```bash
ollama pull llama3.2
```

1. Start PostgreSQL and run migrations.

```bash
pnpm db:up
pnpm db:migrate
```

1. Start the dev server.

```bash
pnpm.cmd dev
```

Open <http://localhost:3000>.

## Hosted Provider Option

To use a hosted OpenAI-compatible provider, update `.env`:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4.1-mini
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your-api-key
```

Other compatible providers work by changing the same four values.

## Docker Compose

Keep Ollama running on the host, then run:

```bash
docker compose up --build
```

The app container uses `DOCKER_LLM_BASE_URL` to reach Ollama on the host and `DOCKER_DATABASE_URL` to reach the Compose PostgreSQL service. The image builds the Next.js app, runs migrations, then starts `next start`.

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/spann
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LOG_INGEST_API_KEY=local-dev-log-key
MAX_PROMPT_CHARS=4000
DOCKER_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/spann
DOCKER_LLM_BASE_URL=http://host.docker.internal:11434/v1
```

## Architecture Overview

- `/api/chat` stores chat messages and streams model responses.
- `src/lib/logger-sdk.ts` wraps model calls and emits inference logs.
- `/api/inference-logs` validates log payloads, records an ingestion event, and stores processed logs.
- `/api/conversations` and `/api/conversations/[id]` power conversation list/resume and URL-based chat loading.
- `/api/dashboard` returns aggregate dashboard data.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the concise data flow.

## Tradeoffs

- Logs cross a durable `ingestion_events` table before being processed into `inference_logs`; a separate worker or broker would be better at high scale.
- Token usage is stored only when the provider returns it.
- PII redaction is lightweight and preview-only, not a compliance system.
- Authentication, multi-user isolation, provider fallback, and Kubernetes deployment are out of scope for this lightweight version.

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm db:up
pnpm db:migrate
pnpm db:down
```
