import type { Conversation } from "@/lib/app-types";

interface ConversationSidebarProps {
  readonly activeConversationId?: string;
  readonly conversations: Conversation[];
  readonly isStreaming: boolean;
  readonly onNewConversation: () => void;
  readonly onSelectConversation: (id: string) => void;
}

export function ConversationSidebar({
  activeConversationId,
  conversations,
  isStreaming,
  onNewConversation,
  onSelectConversation,
}: ConversationSidebarProps) {
  return (
    <aside className="border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold">Spann</h1>
        <button type="button" onClick={onNewConversation} className="border border-slate-300 px-2 py-1 text-xs">
          New
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelectConversation(conversation.id)}
            disabled={isStreaming}
            className={
              "w-full border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60 " +
              (conversation.id === activeConversationId ? "border-slate-950" : "border-slate-200")
            }
          >
            <div className="truncate font-medium">{conversation.title}</div>
            <div className="text-xs text-slate-500">{conversation.message_count} messages</div>
          </button>
        ))}
      </div>
    </aside>
  );
}
