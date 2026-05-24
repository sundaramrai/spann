import type { RefObject } from "react";
import type { ChatMessage } from "@/lib/app-types";

interface ChatPanelProps {
  readonly canSend: boolean;
  readonly input: string;
  readonly isStreaming: boolean;
  readonly messages: ChatMessage[];
  readonly messagesEndRef: RefObject<HTMLDivElement | null>;
  readonly onCancel: () => void;
  readonly onInputChange: (value: string) => void;
  readonly onSend: () => void;
}

export function ChatPanel({
  canSend,
  input,
  isStreaming,
  messages,
  messagesEndRef,
  onCancel,
  onInputChange,
  onSend,
}: ChatPanelProps) {
  return (
    <section className="flex min-h-[calc(100vh-2rem)] flex-col border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold">Chatbot</h2>
        <p className="text-sm text-slate-500">Streaming responses with near real-time inference logging.</p>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">Ask a question to start a logged conversation.</p>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
            className={
              "max-w-3xl px-4 py-3 " +
              (message.role === "user" ? "ml-auto bg-slate-950 text-white" : "border border-slate-200 bg-slate-50")
            }
          >
            <div className="mb-1 text-xs font-medium opacity-70">{message.role === "user" ? "You" : "Assistant"}</div>
            <div className="whitespace-pre-wrap text-sm leading-6">{message.content || "..."}</div>
          </article>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 p-4">
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          className="min-h-24 w-full resize-none border border-slate-300 p-3 text-sm outline-none focus:border-slate-500"
          placeholder="Ask anything..."
        />
        <div className="mt-3 flex justify-end gap-2">
          {isStreaming ? (
            <button type="button" onClick={onCancel} className="border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canSend}
            onClick={onSend}
            className="bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
