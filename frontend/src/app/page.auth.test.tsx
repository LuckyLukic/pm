import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { initialData } from "@/lib/kanban";

const toPath = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.pathname;
  return input.url;
};

describe("Home auth flow", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = toPath(input);
        const method = init?.method ?? "GET";

        if (path === "/api/auth/login" && method === "POST") {
          const body = JSON.parse(String(init?.body)) as { username: string; password: string };
          if (body.username === "user" && body.password === "password") {
            return new Response(
              JSON.stringify({ username: "user", message: "Login successful." }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ detail: "Invalid username or password." }),
            { status: 401, headers: { "Content-Type": "application/json" } }
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
          return new Response(JSON.stringify({ board: initialData }), {
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

  it("shows error for invalid credentials, signs in with valid credentials, and logs out", async () => {
    render(<Home />);

    await screen.findByRole("heading", { name: /sign in to replay studio/i });

    await userEvent.type(screen.getByLabelText(/username/i), "wrong");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid username or password/i)
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/username/i));
    await userEvent.clear(screen.getByLabelText(/password/i));
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByRole("heading", { name: /replay studio/i })
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("pm.authenticated")).toBe("true");

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(
      await screen.findByRole("heading", { name: /sign in to replay studio/i })
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("pm.authenticated")).toBeNull();
  });
});
