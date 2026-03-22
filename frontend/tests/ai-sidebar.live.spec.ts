import { expect, test, type Page } from "@playwright/test";

const login = async (page: Page) => {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
};

test("live AI chat reaches backend and OpenAI without route mocks", async ({ page }) => {
  const health = await page.request.post("/api/ai/health", {
    data: { prompt: "2+2" },
  });

  test.skip(!health.ok(), "Live OpenAI connectivity is unavailable.");

  await login(page);

  const prompt = `Give a one-line summary of this board. (${Date.now()})`;
  await page.getByLabel("Ask AI").fill(prompt);
  await page.getByRole("button", { name: /^send$/i }).click();

  const assistantMessage = page.locator('[data-testid="ai-message-assistant"]').last();
  await expect(assistantMessage).toBeVisible({ timeout: 30000 });
  await expect(assistantMessage).not.toContainText("Ask for summaries");
});
