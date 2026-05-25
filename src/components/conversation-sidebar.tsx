import type { Conversation } from "@/lib/app-types";

interface ConversationSidebarProps {
  readonly activeConversationId?: string;
  readonly conversations: Conversation[];
  readonly isStreaming: boolean;
  readonly onNewConversation: () => void;
  readonly onDeleteConversation: (id: string) => void;
  readonly onSelectConversation: (id: string) => void;
}

export function ConversationSidebar({
  activeConversationId,
  conversations,
  isStreaming,
  onDeleteConversation,
  onNewConversation,
  onSelectConversation,
}: ConversationSidebarProps) {
  return (
    <aside className="h-[calc(100vh-1.5rem)] overflow-hidden border border-white/10 bg-[#111722] p-4 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold">Spann</h1>
        <button type="button" onClick={onNewConversation} className="border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-400/20">
          New
        </button>
      </div>

      <div className="mt-4 max-h-[calc(100vh-6rem)] space-y-2 overflow-y-auto">
        {conversations.length === 0 ? <p className="text-sm text-slate-400">No conversations yet.</p> : null}
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={
              "group grid grid-cols-[minmax(0,1fr)_56px] border text-sm transition " +
              (conversation.id === activeConversationId
                ? "border-cyan-300/60 bg-cyan-400/10"
                : "border-white/10 bg-white/3 hover:bg-white/6")
            }
          >
            <button
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              disabled={isStreaming}
              className="min-w-0 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="truncate font-medium">{conversation.title}</div>
              <div className="text-xs text-slate-400">{conversation.message_count} messages</div>
            </button>
            <button
              type="button"
              aria-label={`Delete ${conversation.title}`}
              disabled={isStreaming}
              onClick={() => onDeleteConversation(conversation.id)}
              className="border-l border-white/10 text-xs text-slate-500 opacity-0 transition hover:bg-red-400/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
