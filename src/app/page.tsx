"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { DashboardPanel } from "@/components/dashboard-panel";
import type { ChatMessage, Conversation, DashboardStats, Role } from "@/lib/app-types";

function createMessage(role: Role, content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content };
}

export default function Home() {
  const [conversationId, setConversationId] = useState<string>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [stats, setStats] = useState<DashboardStats>();
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isStreaming, [input, isStreaming]);

  async function refreshConversations() {
    const response = await fetch("/api/conversations", { cache: "no-store" });
    const data = await response.json();
    setConversations(data.conversations ?? []);
  }

  async function refreshDashboard() {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    setStats(await response.json());
  }

  useEffect(() => {
    queueMicrotask(() => {
      void refreshConversations();
      void refreshDashboard();
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversation(id: string) {
    if (isStreaming) return;

    const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
    const data = await response.json();

    setConversationId(id);
    setMessages(
      (data.messages ?? []).map((message: { id: string; role: Role; content: string }) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      })),
    );
  }

  function newConversation() {
    abortRef.current?.abort();
    setConversationId(undefined);
    setMessages([]);
    setInput("");
  }

  function cancelConversation() {
    abortRef.current?.abort();
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage = createMessage("user", trimmed);
    const assistantMessage = createMessage("assistant", "");
    const nextMessages = [...messages, userMessage];

    setMessages([...nextMessages, assistantMessage]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, messages: nextMessages }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) throw new Error("Chat request failed");

      const nextConversationId = response.headers.get("x-conversation-id");
      if (nextConversationId) setConversationId(nextConversationId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let output = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        output += decoder.decode(value, { stream: true });
        setMessages([...nextMessages, { ...assistantMessage, content: output }]);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessages([
          ...nextMessages,
          { ...assistantMessage, content: error instanceof Error ? error.message : "Request failed" },
        ]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      void refreshConversations();
      void refreshDashboard();
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr_360px]">
        <ConversationSidebar
          activeConversationId={conversationId}
          conversations={conversations}
          isStreaming={isStreaming}
          onNewConversation={newConversation}
          onSelectConversation={(id) => void loadConversation(id)}
        />
        <ChatPanel
          canSend={canSend}
          input={input}
          isStreaming={isStreaming}
          messages={messages}
          messagesEndRef={messagesEndRef}
          onCancel={cancelConversation}
          onInputChange={setInput}
          onSend={() => void sendMessage()}
        />
        <DashboardPanel stats={stats} />
      </div>
    </main>
  );
}
