import type { RefObject } from "react";
import { MessageContent } from "@/components/message-content";
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
    <section className="flex h-[calc(100vh-1.5rem)] min-h-0 flex-col border border-white/10 bg-[#111722] shadow-xl">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold">Chat</h2>
          <p className="text-xs text-slate-400">Streaming with retrieval and inference logs</p>
        </div>
        {isStreaming ? <span className="text-xs font-medium text-cyan-300">Streaming</span> : null}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="mx-auto mt-16 max-w-sm text-center">
            <h3 className="text-sm font-semibold">Start a conversation</h3>
            <p className="mt-1 text-sm text-slate-400">Ask a question. Recent turns are kept as short context.</p>
          </div>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
            className={
              "max-w-[82%] px-4 py-3 " +
              (message.role === "user"
                ? "ml-auto bg-cyan-400/15 text-cyan-50 ring-1 ring-cyan-300/20"
                : "border border-white/10 bg-[#182131] text-slate-100")
            }
          >
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-60">
              {message.role === "user" ? "You" : "Assistant"}
            </div>
            <MessageContent content={message.content} />
          </article>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/10 p-3">
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          className="min-h-20 w-full resize-none border border-white/10 bg-[#0c111a] p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
          placeholder="Ask anything..."
        />
        <div className="mt-3 flex justify-end gap-2">
          {isStreaming ? (
            <button type="button" onClick={onCancel} className="border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canSend}
            onClick={onSend}
            className="bg-cyan-300 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
