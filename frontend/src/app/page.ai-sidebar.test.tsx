import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { initialData, type BoardData } from "@/lib/kanban";

const cloneBoard = (board: BoardData): BoardData => structuredClone(board);

const toPath = (input: RequestInfo | URL) => {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.pathname;
  }
  return input.url;
};

describe("Home AI sidebar flow", () => {
  let persistedBoard: BoardData;

  beforeEach(() => {
    persistedBoard = cloneBoard(initialData);
    window.sessionStorage.clear();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = toPath(input);
        const method = init?.method ?? "GET";

        if (path === "/api/auth/login" && method === "POST") {
          return new Response(
            JSON.stringify({ username: "user", message: "Login successful." }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (path === "/api/projects" && method === "GET") {
          return new Response(
            JSON.stringify([{ id: 1, name: "My Project" }]),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (path === "/api/tags" && method === "GET") {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (path === "/api/projects/1/board" && method === "GET") {
          return new Response(JSON.stringify({ board: persistedBoard }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (path === "/api/projects/1/board" && method === "PUT") {
          const payload = JSON.parse(String(init!.body)) as { board: BoardData };
          persistedBoard = payload.board;
          return new Response(JSON.stringify({ board: persistedBoard }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (path === "/api/projects/1/ai/chat" && method === "POST") {
          const payload = JSON.parse(String(init!.body)) as {
            prompt: string;
            chat_history: Array<{ role: string; content: string }>;
          };
          expect(payload.prompt).toBe("Rename first column to AI Backlog");
          expect(payload.chat_history.at(-1)?.content).toBe(
            "Rename first column to AI Backlog"
          );

          const aiBoard = cloneBoard(persistedBoard);
          aiBoard.columns[0].title = "AI Backlog";
          persistedBoard = aiBoard;

          return new Response(
            JSON.stringify({
              assistant_response: "Done. First column renamed to AI Backlog.",
              board: aiBoard,
              board_updated: true,
              used_fallback: false,
              model: "gpt-5.4-mini",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response("Not found", { status: 404 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends chat prompt, renders assistant reply, and refreshes board from AI response", async () => {
    render(<Home />);

    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByRole("heading", { name: /replay studio/i });

    await userEvent.type(
      screen.getByLabelText(/ask ai/i),
      "Rename first column to AI Backlog"
    );
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(
      await screen.findByText(/done\. first column renamed to ai backlog\./i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByLabelText("Column title")[0]).toHaveValue("AI Backlog");
    });

    const fetchMock = vi.mocked(fetch);
    expect(
      fetchMock.mock.calls.some(
        ([path, options]) =>
          toPath(path as RequestInfo | URL) === "/api/projects/1/ai/chat" &&
          options?.method === "POST" &&
          (options.headers as Record<string, string>)?.["X-User"] === "user"
      )
    ).toBe(true);
  });
});
