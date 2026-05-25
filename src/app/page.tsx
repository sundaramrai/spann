"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { DashboardPanel } from "@/components/dashboard-panel";
import type { ChatMessage, Conversation, DashboardStats, Role } from "@/lib/app-types";

function createMessage(role: Role, content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content };
}

function setConversationUrl(id?: string, replace = false) {
  const url = id ? `/?id=${encodeURIComponent(id)}` : "/";
  if (replace) {
    globalThis.history.replaceState(null, "", url);
  } else {
    globalThis.history.pushState(null, "", url);
  }
}

export default function Home() {
  const [conversationId, setConversationId] = useState<string>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [stats, setStats] = useState<DashboardStats>();
  const [dashboardWindow, setDashboardWindow] = useState(24);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isStreaming, [input, isStreaming]);

  const refreshConversations = useCallback(async () => {
    const response = await fetch("/api/conversations", { cache: "no-store" });
    const data = await response.json();
    setConversations(data.conversations ?? []);
  }, []);

  const refreshDashboard = useCallback(async (windowHours = dashboardWindow) => {
    const response = await fetch(`/api/dashboard?windowHours=${windowHours}`, { cache: "no-store" });
    setStats(await response.json());
  }, [dashboardWindow]);

  const loadConversation = useCallback(async (id: string, updateUrl = true) => {
    const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
    const data = await response.json();

    setConversationId(id);
    if (updateUrl) setConversationUrl(id);
    setMessages(
      (data.messages ?? []).map((message: { id: string; role: Role; content: string }) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      })),
    );
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshConversations();
      void refreshDashboard();
    });
  }, [dashboardWindow, refreshConversations, refreshDashboard]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const id = new URLSearchParams(globalThis.location.search).get("id");
    if (id) queueMicrotask(() => void loadConversation(id, false));

    function handlePopState() {
      const nextId = new URLSearchParams(globalThis.location.search).get("id");
      if (nextId) {
        void loadConversation(nextId, false);
      } else {
        setConversationId(undefined);
        setMessages([]);
      }
    }

    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, [loadConversation]);

  function newConversation() {
    abortRef.current?.abort();
    setConversationId(undefined);
    setMessages([]);
    setInput("");
    setConversationUrl();
  }

  function cancelConversation() {
    abortRef.current?.abort();
  }

  async function deleteConversation(id: string) {
    if (isStreaming) return;
    const conversation = conversations.find((item) => item.id === id);
    const confirmed = globalThis.confirm(`Delete "${conversation?.title ?? "this conversation"}"? This cannot be undone.`);
    if (!confirmed) return;

    const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!response.ok) return;

    setConversations((current) => current.filter((conversation) => conversation.id !== id));
    if (id === conversationId) {
      setConversationId(undefined);
      setMessages([]);
      setInput("");
      setConversationUrl();
    }
    void refreshDashboard(dashboardWindow);
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

      if (!response.ok || !response.body) {
        const errorPayload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "Chat request failed");
      }

      const nextConversationId = response.headers.get("x-conversation-id");
      if (nextConversationId) {
        setConversationId(nextConversationId);
        if (!conversationId) setConversationUrl(nextConversationId);
      }

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
      void refreshDashboard(dashboardWindow);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#090b10] text-slate-100">
      <div className="grid h-screen w-full grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[300px_minmax(0,1fr)_380px]">
        <ConversationSidebar
          activeConversationId={conversationId}
          conversations={conversations}
          isStreaming={isStreaming}
          onDeleteConversation={(id) => void deleteConversation(id)}
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
        <DashboardPanel
          stats={stats}
          windowHours={dashboardWindow}
          onWindowChange={(value) => setDashboardWindow(value)}
        />
      </div>
    </main>
  );
}
