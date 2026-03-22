import { expect, test, type Page } from "@playwright/test";

const login = async (page: Page) => {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
};

test("renders AI reply and refreshes board after AI update", async ({ page }) => {
  await login(page);

  const boardResponse = await page.request.get("/api/board", {
    headers: { "X-User": "user" },
  });
  expect(boardResponse.ok()).toBeTruthy();
  const boardPayload = (await boardResponse.json()) as {
    board: {
      columns: Array<{ id: string; title: string; cardIds: string[] }>;
      cards: Record<string, { id: string; title: string; details: string }>;
    };
  };

  const updatedTitle = `AI Backlog ${Date.now()}`;
  boardPayload.board.columns[0].title = updatedTitle;

  await page.route("**/api/ai/chat", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as {
      prompt: string;
      chat_history: Array<{ role: string; content: string }>;
    };
    expect(body.prompt).toBe("Rename first column");
    expect(body.chat_history.at(-1)?.role).toBe("user");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        assistant_response: "Updated first column title.",
        board: boardPayload.board,
        board_updated: true,
        used_fallback: false,
        model: "gpt-5.4-mini",
      }),
    });
  });

  await page.getByLabel("Ask AI").fill("Rename first column");
  await page.getByRole("button", { name: /^send$/i }).click();

  await expect(page.getByText("Updated first column title.")).toBeVisible();
  await expect(page.getByLabel("Column title").first()).toHaveValue(updatedTitle);
  await expect(page.getByText("Board Updated")).toBeVisible();
});
