export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
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
    input_preview: string;
    error_message: string | null;
  }>;
}
