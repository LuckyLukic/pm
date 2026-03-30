"use client";

import { useEffect } from "react";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ProjectDropdown } from "@/components/ProjectDropdown";
import { useAuth } from "@/hooks/useAuth";
import { useBoard } from "@/hooks/useBoard";
import { useAiChat } from "@/hooks/useAiChat";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";

export default function Home() {
  const auth = useAuth();
  const proj = useProjects(auth.isAuthenticated, auth.validUsername);
  const boardState = useBoard(auth.isAuthenticated, auth.validUsername, proj.selectedProjectId);
  const tagsState = useTags(auth.isAuthenticated, auth.validUsername);
  const chat = useAiChat(auth.validUsername, proj.selectedProjectId, boardState.board, boardState.setBoard, tagsState.reload);

  // Reset board and chat when project changes
  useEffect(() => {
    boardState.reset();
    chat.reset();
    if (proj.selectedProjectId !== null) {
      boardState.reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj.selectedProjectId]);

  const handleLogout = () => {
    auth.handleLogout();
    proj.reset();
    boardState.reset();
    chat.reset();
    tagsState.reset();
  };

  if (auth.isAuthenticated) {
    if (proj.isLoading) {
      return (
        <CenteredCard>
          <div className="flex flex-col items-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--stroke-strong)] border-t-[var(--secondary-purple)]" />
            <h1 className="mt-5 font-display text-xl font-semibold text-[var(--navy-dark)]">
              Loading projects
            </h1>
          </div>
        </CenteredCard>
      );
    }

    if (proj.selectedProjectId !== null && boardState.isLoading && !boardState.board) {
      return (
        <CenteredCard>
          <div className="flex flex-col items-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--stroke-strong)] border-t-[var(--secondary-purple)]" />
            <h1 className="mt-5 font-display text-xl font-semibold text-[var(--navy-dark)]">
              Loading board
            </h1>
            <p className="mt-2 text-sm text-[var(--gray-text)]">
              Fetching the latest board state...
            </p>
          </div>
        </CenteredCard>
      );
    }

    if (boardState.loadError && !boardState.board) {
      return (
        <CenteredCard>
          <h1 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
            Board unavailable
          </h1>
          <p className="mt-2 text-sm text-red-600">{boardState.loadError}</p>
          <button
            type="button"
            onClick={boardState.reload}
            className="mt-5 w-full rounded-[var(--radius-md)] bg-[var(--secondary-purple)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Try again
          </button>
        </CenteredCard>
      );
    }

    if (boardState.board) {
      return (
        <ErrorBoundary>
          <KanbanBoard
            board={boardState.board}
            onBoardChange={boardState.handleBoardChange}
            saveState={boardState.saveError ? "error" : boardState.isSaving ? "saving" : "idle"}
            saveErrorMessage={boardState.saveError || undefined}
            onLogout={handleLogout}
            tags={tagsState.tags}
            onCreateTag={tagsState.createTag}
            onUpdateTag={tagsState.updateTag}
            onDeleteTag={tagsState.deleteTag}
            projectControls={
              <ProjectDropdown
                projects={proj.projects}
                selectedProject={proj.selectedProject}
                onSelect={proj.selectProject}
                onCreate={async (name) => { await proj.createProject(name); }}
                onRename={async (id, name) => { await proj.renameProject(id, name); }}
                onDelete={async (id) => { await proj.deleteProject(id); }}
              />
            }
            sidebar={
              <AIChatSidebar
                messages={chat.chatHistory}
                prompt={chat.chatPrompt}
                onPromptChange={chat.setChatPrompt}
                onSubmit={() => { void chat.handleSend(); }}
                onCancel={chat.handleCancel}
                isSending={chat.isSending}
                error={chat.chatError || undefined}
                lastBoardUpdated={chat.lastBoardUpdated}
                mode={chat.mode}
                onModeChange={chat.setMode}
                pendingPlan={chat.pendingPlan}
                isConfirming={chat.isConfirming}
                onConfirmPlan={() => { void chat.handleConfirmPlan(); }}
                onDiscardPlan={chat.handleDiscardPlan}
              />
            }
          />
        </ErrorBoundary>
      );
    }

    return (
      <CenteredCard>
        <div className="flex flex-col items-center py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--stroke-strong)] border-t-[var(--secondary-purple)]" />
          <h1 className="mt-5 font-display text-xl font-semibold text-[var(--navy-dark)]">
            Preparing board
          </h1>
        </div>
      </CenteredCard>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--secondary-purple)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy-dark)]">
          {auth.mode === "login" ? "Sign in to Replay Studio" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-text)]">
          {auth.mode === "login"
            ? "Enter your credentials to continue."
            : "Get started with your project board."}
        </p>
      </div>

      <nav className="mb-6 flex rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1" aria-label="Auth mode">
        <button
          type="button"
          onClick={() => auth.switchMode("login")}
          className={`flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition ${
            auth.mode === "login"
              ? "bg-white text-[var(--navy-dark)] shadow-[var(--shadow-sm)]"
              : "text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => auth.switchMode("register")}
          className={`flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition ${
            auth.mode === "register"
              ? "bg-white text-[var(--navy-dark)] shadow-[var(--shadow-sm)]"
              : "text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
          }`}
        >
          Register
        </button>
      </nav>

      {auth.successMessage ? (
        <div className="mb-4 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {auth.successMessage}
        </div>
      ) : null}

      {auth.mode === "login" ? (
        <form className="space-y-4" onSubmit={(e) => { void auth.handleLogin(e); }}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--navy-dark)]">
              Username
            </span>
            <input
              type="text"
              value={auth.username}
              onChange={(event) => auth.setUsername(event.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--stroke-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--secondary-purple)] focus:ring-2 focus:ring-[var(--stroke-focus)]"
              autoComplete="username"
              placeholder="Enter your username"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--navy-dark)]">
              Password
            </span>
            <input
              type="password"
              value={auth.password}
              onChange={(event) => auth.setPassword(event.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--stroke-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--secondary-purple)] focus:ring-2 focus:ring-[var(--stroke-focus)]"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </label>

          {auth.error ? (
            <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {auth.error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={auth.isLoading}
            className="w-full rounded-[var(--radius-md)] bg-[var(--secondary-purple)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {auth.isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { void auth.handleRegister(e); }}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--navy-dark)]">
              Username
            </span>
            <input
              type="text"
              value={auth.username}
              onChange={(event) => auth.setUsername(event.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--stroke-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--secondary-purple)] focus:ring-2 focus:ring-[var(--stroke-focus)]"
              autoComplete="username"
              placeholder="Choose a username"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--navy-dark)]">
              Password
            </span>
            <input
              type="password"
              value={auth.password}
              onChange={(event) => auth.setPassword(event.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--stroke-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--secondary-purple)] focus:ring-2 focus:ring-[var(--stroke-focus)]"
              autoComplete="new-password"
              placeholder="Create a password"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--navy-dark)]">
              Confirm password
            </span>
            <input
              type="password"
              value={auth.confirmPassword}
              onChange={(event) => auth.setConfirmPassword(event.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--stroke-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--secondary-purple)] focus:ring-2 focus:ring-[var(--stroke-focus)]"
              autoComplete="new-password"
              placeholder="Confirm your password"
              required
            />
          </label>

          {auth.error ? (
            <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {auth.error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={auth.isLoading}
            className="w-full rounded-[var(--radius-md)] bg-[var(--secondary-purple)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {auth.isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--surface)] px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.08)_0%,_transparent_70%)]" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.08)_0%,_transparent_70%)]" />
      </div>
      <section className="relative w-full max-w-[420px] rounded-[var(--radius-xl)] border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow-xl)]">
        {children}
      </section>
    </main>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center px-4 py-12">
      <section className="rounded-[var(--radius-xl)] border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow-lg)]">
        {children}
      </section>
    </main>
  );
}
