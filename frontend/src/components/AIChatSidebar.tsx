"use client";

import type { ChatMessage } from "@/lib/boardApi";

type AIChatSidebarProps = {
  messages: ChatMessage[];
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  error?: string;
  lastBoardUpdated?: boolean | null;
};

export const AIChatSidebar = ({
  messages,
  prompt,
  onPromptChange,
  onSubmit,
  isSending,
  error,
  lastBoardUpdated,
}: AIChatSidebarProps) => {
  const canSend = prompt.trim().length > 0 && !isSending;

  return (
    <aside
      className="rounded-[28px] border border-[var(--stroke)] bg-white p-5 shadow-[var(--shadow)]"
      data-testid="ai-sidebar"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
            AI Sidebar
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--navy-dark)]">
            AI Assistant
          </h2>
        </div>
        {lastBoardUpdated === true ? (
          <span className="rounded-full bg-[var(--accent-yellow)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--navy-dark)]">
            Board Updated
          </span>
        ) : null}
      </div>

      <div className="mt-4 max-h-[340px] space-y-3 overflow-y-auto rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--gray-text)]">
            Ask for summaries, card updates, or task moves.
          </p>
        ) : (
          messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              data-testid={`ai-message-${message.role}`}
              className={
                message.role === "user"
                  ? "rounded-xl bg-[var(--primary-blue)]/10 px-3 py-2"
                  : "rounded-xl bg-white px-3 py-2"
              }
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--gray-text)]">
                {message.role}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--navy-dark)]">
                {message.content}
              </p>
            </article>
          ))
        )}
      </div>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSend) {
            return;
          }
          onSubmit();
        }}
      >
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Ask AI
          </span>
          <textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            rows={4}
            className="mt-2 w-full resize-none rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            placeholder="Move card-2 to In Progress and summarize blockers."
            aria-label="Ask AI"
          />
        </label>
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!canSend}
          className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </aside>
  );
};
