# Architecture Notes

## Ingestion Flow

1. The chat UI sends messages to `POST /api/chat`.
2. The route stores user messages in PostgreSQL.
3. The route calls the lightweight logging wrapper in `src/lib/logger-sdk.ts`.
4. The wrapper calls the configured OpenAI-compatible provider and streams text back to the UI.
5. On completion or error, the wrapper sends a log payload to `POST /api/inference-logs`.
6. The ingestion endpoint validates the payload with Zod and stores it in `inference_logs`.

## Logging Strategy

The wrapper captures provider, model, latency, status, timestamps, token usage when available, conversation ID, and redacted input/output previews. Logs are sent near real time after each inference finishes or fails.

## Schema Design

- `conversations`: one row per user-visible conversation.
- `chat_messages`: durable message history for resume/list functionality.
- `inference_logs`: model-call observability facts for dashboards and debugging.

This separates product data from observability data while linking logs back to conversations.

## Scaling Considerations

For this lightweight version, logs are inserted synchronously after inference completion. At higher traffic, the ingestion endpoint can push events to a queue and process them asynchronously. Dashboard reads can be cached or backed by rollup tables.

## Failure Handling Assumptions

If log ingestion fails, the model response should still succeed. The SDK logs ingestion failures server-side and avoids breaking the user response. API keys are server-side only. Basic PII redaction is applied to previews before storage.
