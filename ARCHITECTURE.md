# Architecture

## Ingestion Flow

1. The chat UI sends messages to `POST /api/chat`.
2. The route rate-limits the request, validates payloads, stores user messages, and trims model context to the latest turns.
3. The route calls `src/lib/logger-sdk.ts`.
4. The logger wrapper calls the configured OpenAI-compatible provider and streams text back to the UI.
5. On completion, error, or cancellation, the wrapper posts a log payload to `POST /api/inference-logs`.
6. The ingestion endpoint validates the payload, writes an `ingestion_events` row, processes it into `inference_logs`, and marks the event processed or failed.

## Data Model

- `conversations`: one row per user-visible conversation.
- `chat_messages`: durable message history for resume/list functionality.
- `ingestion_events`: durable boundary for raw log payloads and processing state.
- `inference_logs`: model-call observability data linked back to conversations.

## Logging

Each log stores request ID, provider, model, status, timestamps, latency, optional token usage, conversation ID, and redacted input/output previews. Log delivery is best-effort: ingestion failures are written to server logs and do not fail the chat response.

## Scaling Notes

The current event pipeline is table-backed and processed inline after receipt. At higher traffic, the same `ingestion_events` contract can be consumed by a worker or replaced with a broker. Dashboard reads can use cached rollups if log volume grows.
