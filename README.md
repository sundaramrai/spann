# Spann

A lightweight chatbot application with a custom LLM logging wrapper, ingestion endpoint, PostgreSQL storage, conversation resume, and an operational dashboard.

The default local setup uses Ollama through its OpenAI-compatible API, so you do not need an OpenAI key to run the project locally.

## Features

- Streaming chatbot using an OpenAI-compatible foundation model API
- Multi-turn conversations with short context
- Cancel in-flight responses
- List and resume conversations
- Lightweight SDK/wrapper around LLM calls
- Near real-time inference log ingestion
- PostgreSQL storage for conversations, messages, and inference logs
- Dashboard for request count, average latency, success/error counts, provider throughput, and recent logs
- Docker Compose app + PostgreSQL setup
- Basic PII redaction for log previews

## Tech Stack

- Next.js App Router
- TypeScript
- AI SDK
- OpenAI-compatible provider via `@ai-sdk/openai`
- Ollama for local model serving by default
- PostgreSQL
- Zod
- pnpm

## Setup

1. Install dependencies:

```bash
pnpm install
```

1. Copy env file:

```bash
copy .env.example .env
```

1. Install Ollama and pull the default local model:

```bash
ollama pull llama3.2
```

1. Start PostgreSQL:

```bash
pnpm db:up
```

1. Run migrations:

```bash
pnpm db:migrate
```

1. Start development server:

```bash
pnpm dev
```

Open <http://localhost:3000>.

## Hosted Provider Option

The app uses an OpenAI-compatible provider wrapper. To use a hosted provider instead of local Ollama, update `.env`:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4.1-mini
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your-api-key
```

You can also use another OpenAI-compatible provider by changing `LLM_PROVIDER`, `LLM_MODEL`, `LLM_BASE_URL`, and `LLM_API_KEY`.

## Docker Compose Full Stack

For the full Docker Compose path, keep Ollama running on your host machine and run:

```bash
docker compose up --build
```

The app container uses `DOCKER_LLM_BASE_URL=http://host.docker.internal:11434/v1` so it can reach Ollama on the host. PostgreSQL runs inside Docker through `DOCKER_DATABASE_URL`. The app runs migrations before starting the dev server inside the container.

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/spann
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LOG_INGEST_API_KEY=local-dev-log-key
MAX_PROMPT_CHARS=4000
DOCKER_LLM_BASE_URL=http://host.docker.internal:11434/v1
```

## Assignment Coverage

Implemented:

- Chatbot with multi-turn context
- Streaming model responses
- Cancel in-flight responses
- Conversation list and resume
- Lightweight inference logging wrapper
- Near real-time log ingestion endpoint
- Zod payload validation
- PostgreSQL storage for chat messages, inference logs, and metadata
- Latency, request volume, provider throughput, and error dashboard
- Docker Compose one-command app + database setup
- Basic PII redaction for stored previews

Partially implemented / future work:

- Multi-provider support is environment-configurable for OpenAI-compatible providers; runtime provider routing and fallback are listed as future work.
- Event-based ingestion is documented as the next scaling step; the current version inserts logs through an HTTP ingestion endpoint.
- Self-hosted Kubernetes deployment is documented as future work, not implemented in this lightweight version.

## Architecture Overview

- `/api/chat` receives chat messages, stores them, and streams a model response.
- `src/lib/logger-sdk.ts` wraps the model call and captures inference metadata.
- `/api/inference-logs` receives SDK log payloads, validates them, and stores them.
- `/api/conversations` and `/api/conversations/[id]` power list/resume UI.
- `/api/dashboard` powers latency, throughput, and error dashboard cards.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for ingestion flow, logging strategy, scaling notes, and failure handling assumptions.

## Schema Design Decisions

### conversations

Stores durable conversation identity and title. This supports list/resume without relying on browser storage.

### chat_messages

Stores user and assistant messages separately from logs. This keeps product chat history independent from observability records.

### inference_logs

Stores one row per model call with provider, model, status, latency, token usage, redacted previews, and metadata.

## Tradeoffs

- Logs are inserted through an HTTP ingestion endpoint after inference finishes. A queue would be better at high scale.
- Token usage is stored when the provider returns it; otherwise values remain null.
- PII redaction is intentionally lightweight and preview-only, not a full compliance solution.
- Authentication and multi-user isolation are not implemented in this assignment version.
- Ollama is convenient for local development, but a hosted model provider is easier for public demos.

## Improvements With More Time

- Add authentication and per-user conversation ownership
- Add rate limiting on chat and ingestion endpoints
- Add queue-based event ingestion
- Add provider fallback and routing UI
- Add richer charts and time-window filters
- Add OpenTelemetry traces
- Deploy on Kubernetes with separate web, worker, and database services

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
