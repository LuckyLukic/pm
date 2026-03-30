import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { initialData, type BoardData } from "@/lib/kanban";

const cloneBoard = (board: BoardData): BoardData => {
  return structuredClone(board);
};

const toPath = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.pathname;
  return input.url;
};

describe("Home board API integration", () => {
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

        return new Response("Not found", { status: 404 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads board from API and persists edits through PUT", async () => {
    render(<Home />);

    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByRole("heading", { name: /replay studio/i })
    ).toBeInTheDocument();

    const firstColumn = screen.getAllByTestId(/column-/i)[0];
    const columnTitleInput = within(firstColumn).getByLabelText("Column title");
    await userEvent.clear(columnTitleInput);
    await userEvent.type(columnTitleInput, "Persisted Name");

    await waitFor(() => {
      expect(persistedBoard.columns[0].title).toBe("Persisted Name");
    });

    const fetchMock = vi.mocked(fetch);
    expect(
      fetchMock.mock.calls.some(
        ([path, options]) =>
          toPath(path as RequestInfo | URL) === "/api/projects/1/board" &&
          options?.method === "PUT" &&
          (options.headers as Record<string, string>)?.["X-User"] === "user"
      )
    ).toBe(true);
  });
});
