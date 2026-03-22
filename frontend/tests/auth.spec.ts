import { expect, test } from "@playwright/test";

test("requires sign-in and supports logout", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /sign in to kanban studio/i })
  ).toBeVisible();

  await page.getByLabel("Username").fill("wrong");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(
    page.getByText("Invalid credentials. Use user / password.")
  ).toBeVisible();

  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();

  await page.getByRole("button", { name: /log out/i }).click();

  await expect(
    page.getByRole("heading", { name: /sign in to kanban studio/i })
  ).toBeVisible();
});
