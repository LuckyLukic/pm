"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { fetchBoard, saveBoard } from "@/lib/boardApi";
import type { BoardData } from "@/lib/kanban";

const AUTH_KEY = "pm.authenticated";
const VALID_USERNAME = "user";
const VALID_PASSWORD = "password";

const readAuthFlag = () => {
  try {
    return window.sessionStorage.getItem(AUTH_KEY) === "true";
  } catch {
    return false;
  }
};

const writeAuthFlag = (isAuthenticated: boolean) => {
  try {
    if (isAuthenticated) {
      window.sessionStorage.setItem(AUTH_KEY, "true");
      return;
    }
    window.sessionStorage.removeItem(AUTH_KEY);
  } catch {
    // Ignore storage failures and keep auth state in memory for this session.
  }
};

export default function Home() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [board, setBoard] = useState<BoardData | null>(null);
  const [isBoardLoading, setIsBoardLoading] = useState(false);
  const [isBoardSaving, setIsBoardSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [boardReloadKey, setBoardReloadKey] = useState(0);
  const latestSaveRequest = useRef(0);

  useEffect(() => {
    const isLoggedIn = readAuthFlag();
    setIsAuthenticated(isLoggedIn);
    setIsAuthReady(true);
  }, []);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    const loadBoard = async () => {
      setIsBoardLoading(true);
      setLoadError("");
      try {
        const loadedBoard = await fetchBoard(VALID_USERNAME);
        if (cancelled) {
          return;
        }
        setBoard(loadedBoard);
      } catch {
        if (cancelled) {
          return;
        }
        setLoadError("Unable to load board. Check API and retry.");
        setBoard(null);
      } finally {
        if (!cancelled) {
          setIsBoardLoading(false);
        }
      }
    };

    void loadBoard();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, isAuthenticated, boardReloadKey]);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      writeAuthFlag(true);
      setIsAuthenticated(true);
      setError("");
      return;
    }
    setError("Invalid credentials. Use user / password.");
  };

  const handleLogout = () => {
    writeAuthFlag(false);
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setError("");
    setBoard(null);
    setLoadError("");
    setSaveError("");
    setIsBoardSaving(false);
  };

  const persistBoard = async (nextBoard: BoardData) => {
    const requestId = latestSaveRequest.current + 1;
    latestSaveRequest.current = requestId;
    setIsBoardSaving(true);
    setSaveError("");

    try {
      await saveBoard(VALID_USERNAME, nextBoard);
    } catch {
      if (requestId !== latestSaveRequest.current) {
        return;
      }
      setSaveError("Could not save board changes. Edit again to retry.");
    } finally {
      if (requestId === latestSaveRequest.current) {
        setIsBoardSaving(false);
      }
    }
  };

  const handleBoardChange = (nextBoard: BoardData) => {
    setBoard(nextBoard);
    void persistBoard(nextBoard);
  };

  if (!isAuthReady) {
    return null;
  }

  if (isAuthenticated) {
    if (isBoardLoading && !board) {
      return (
        <main className="relative mx-auto flex min-h-screen w-full max-w-[560px] flex-col justify-center px-6 py-12">
          <section className="rounded-3xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
            <h1 className="font-display text-3xl font-semibold text-[var(--navy-dark)]">
              Loading board...
            </h1>
            <p className="mt-3 text-sm text-[var(--gray-text)]">
              Fetching the latest board state from the backend API.
            </p>
          </section>
        </main>
      );
    }

    if (loadError && !board) {
      return (
        <main className="relative mx-auto flex min-h-screen w-full max-w-[560px] flex-col justify-center px-6 py-12">
          <section className="rounded-3xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
            <h1 className="font-display text-3xl font-semibold text-[var(--navy-dark)]">
              Board unavailable
            </h1>
            <p className="mt-3 text-sm text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={() => setBoardReloadKey((prev) => prev + 1)}
              className="mt-6 rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
            >
              Retry
            </button>
          </section>
        </main>
      );
    }

    if (board) {
      return (
        <KanbanBoard
          board={board}
          onBoardChange={handleBoardChange}
          saveState={saveError ? "error" : isBoardSaving ? "saving" : "idle"}
          saveErrorMessage={saveError || undefined}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <main className="relative mx-auto flex min-h-screen w-full max-w-[560px] flex-col justify-center px-6 py-12">
        <section className="rounded-3xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
          <h1 className="font-display text-3xl font-semibold text-[var(--navy-dark)]">
            Preparing board...
          </h1>
        </section>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[560px] flex-col justify-center px-6 py-12">
      <section className="rounded-3xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gray-text)]">
          Project Management MVP
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
          Sign in to Kanban Studio
        </h1>
        <p className="mt-3 text-sm text-[var(--gray-text)]">
          Use <strong>user</strong> / <strong>password</strong> to continue.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleLogin}>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
              Username
            </span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
