"use client";

import type { ChatMessage } from "@/lib/boardApi";
import type { PendingPlan } from "@/hooks/useAiChat";

export type AiMode = "chat" | "plan";

type AIChatSidebarProps = {
  messages: ChatMessage[];
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  isSending: boolean;
  error?: string;
  lastBoardUpdated?: boolean | null;
  mode: AiMode;
  onModeChange: (mode: AiMode) => void;
  pendingPlan?: PendingPlan | null;
  isConfirming?: boolean;
  onConfirmPlan?: () => void;
  onDiscardPlan?: () => void;
};

export const AIChatSidebar = ({
  messages,
  prompt,
  onPromptChange,
  onSubmit,
  onCancel,
  isSending,
  error,
  lastBoardUpdated,
  mode,
  onModeChange,
  pendingPlan,
  isConfirming,
  onConfirmPlan,
  onDiscardPlan,
}: AIChatSidebarProps) => {
  const canSend = prompt.trim().length > 0 && !isSending;

  return (
    <aside
      className="flex h-full flex-col"
      data-testid="ai-sidebar"
    >
      <div className="flex items-center justify-between border-b border-[var(--stroke)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-blue)]/10">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-[var(--navy-dark)]">
            AI Assistant
          </h2>
        </div>
        {lastBoardUpdated === true ? (
          <span className="rounded-[var(--radius-full)] bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
            Board updated
          </span>
        ) : null}
      </div>

      {/* Mode toggle */}
      <div className="border-b border-[var(--stroke)] px-4 py-2">
        <div className="flex rounded-[var(--radius-sm)] bg-[var(--surface-muted)] p-0.5">
          <button
            type="button"
            onClick={() => onModeChange("chat")}
            className={`flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition ${
              mode === "chat"
                ? "bg-white text-[var(--navy-dark)] shadow-[var(--shadow-sm)]"
                : "text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => onModeChange("plan")}
            className={`flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition ${
              mode === "plan"
                ? "bg-white text-[var(--navy-dark)] shadow-[var(--shadow-sm)]"
                : "text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
            }`}
          >
            Plan
          </button>
        </div>
      </div>

      <div aria-live="polite" className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {mode === "plan" ? (
                  <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="14" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></>
                ) : (
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                )}
              </svg>
            </div>
            <p className="text-sm text-[var(--gray-text)]">
              {mode === "plan"
                ? "Describe your project and AI will create an action plan with tasks on your board."
                : "Ask for summaries, card updates, or task moves."}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                data-testid={`ai-message-${message.role}`}
                className={
                  message.role === "user"
                    ? "rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5"
                    : "rounded-[var(--radius-md)] border border-[var(--stroke)] bg-white px-3 py-2.5"
                }
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-light)]">
                  {message.role === "user" ? "You" : "AI"}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--navy-dark)]">
                  {message.content}
                </p>
              </article>
            ))}

            {/* Loading indicator */}
            {isSending ? (
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--stroke)] bg-white px-3 py-3">
                <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[var(--stroke-strong)] border-t-[var(--secondary-purple)]" />
                <p className="text-sm text-[var(--gray-text)]">
                  {mode === "plan" ? "Generating plan..." : "AI is thinking..."}
                </p>
              </div>
            ) : null}

            {/* Pending plan action card */}
            {pendingPlan ? (
              <div
                className="rounded-[var(--radius-md)] border-2 border-[var(--accent-yellow)] bg-amber-50 px-3 py-3"
                data-testid="pending-plan-card"
              >
                <div className="mb-2 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-yellow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="8" y1="9" x2="16" y2="9" />
                    <line x1="8" y1="13" x2="14" y2="13" />
                  </svg>
                  <p className="text-xs font-semibold text-[var(--navy-dark)]">
                    Plan ready for review
                  </p>
                </div>
                <p className="mb-3 text-xs text-[var(--gray-text)]">
                  Review the plan above. Confirm to apply it to your board, edit to refine, or discard.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onConfirmPlan}
                    disabled={isConfirming}
                    className="flex-1 rounded-[var(--radius-sm)] bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    data-testid="confirm-plan-button"
                  >
                    {isConfirming ? "Applying..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={onDiscardPlan}
                    disabled={isConfirming}
                    className="flex-1 rounded-[var(--radius-sm)] border border-[var(--stroke-strong)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--gray-text)] transition hover:text-red-500 disabled:opacity-50"
                    data-testid="discard-plan-button"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="border-t border-[var(--stroke)] p-4">
        {error ? (
          <div className="mb-3 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        ) : null}

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSend) {
              return;
            }
            onSubmit();
          }}
        >
          <textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            rows={mode === "plan" ? 5 : 3}
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--stroke-strong)] bg-white px-3 py-2.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--secondary-purple)] focus:ring-1 focus:ring-[var(--stroke-focus)]"
            placeholder={
              pendingPlan
                ? "Describe changes to refine the plan..."
                : mode === "plan"
                  ? "Describe your project goals, features, and requirements..."
                  : "Ask AI to update your board..."
            }
            aria-label="Ask AI"
          />
          {isSending && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-[var(--radius-md)] border border-[var(--stroke-strong)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] transition hover:bg-[var(--surface-muted)]"
            >
              Cancel
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              className="w-full rounded-[var(--radius-md)] bg-[var(--secondary-purple)] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {mode === "plan" ? "Planning..." : "Thinking..."}
                </span>
              ) : pendingPlan ? (
                "Refine Plan"
              ) : (
                mode === "plan" ? "Generate Plan" : "Send"
              )}
            </button>
          )}
        </form>
      </div>
    </aside>
  );
};
