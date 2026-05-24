import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  LLM_API_KEY: z.string().min(1),
  LLM_BASE_URL: z.url(),
  LLM_MODEL: z.string().min(1),
  LLM_PROVIDER: z.string().min(1),
  LOG_INGEST_API_KEY: z.string().min(1),
  MAX_PROMPT_CHARS: z.coerce.number().int().positive(),
});

export function getEnv() {
  return envSchema.parse(process.env);
}