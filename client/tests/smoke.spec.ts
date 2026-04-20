import { expect, test } from "@playwright/test";

test("landing page highlights the MVP loop", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /make staying close feel more natural/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /open sign in|open your dashboard/i })).toBeVisible();
});

test("protected dashboard redirects unauthenticated visitors to dual-path auth", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/auth/);
  await expect(page.getByRole("heading", { name: /get into the mvp with the fastest path first/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /primary: local password/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /secondary: magic link/i })).toBeVisible();
});
