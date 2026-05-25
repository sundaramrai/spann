import type { ChatMessage as SchemaChatMessage } from "./schemas";

export type ChatMessage = Pick<SchemaChatMessage, "id" | "role" | "content">;
export type Role = ChatMessage["role"];

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface DashboardStats {
  windowHours: number;
  totalRequests: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  errorCount: number;
  successCount: number;
  cancelledCount: number;
  errorRate: number;
  totalTokens: number;
  requestsPerHour: number;
  requestsByProvider: Array<{ provider: string; count: number }>;
  requestsByModel: Array<{ model: string; count: number }>;
  statusCounts: Array<{ status: string; count: number }>;
  hourlyRequests: Array<{ hour: string; count: number }>;
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
