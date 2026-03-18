import { expect, test } from "@playwright/test";

test("landing page highlights the MVP loop", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /make staying close feel more natural/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /start with magic link|open your dashboard/i })).toBeVisible();
});

test("protected dashboard redirects unauthenticated visitors to auth", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/auth/);
  await expect(page.getByRole("heading", { name: /start with the smallest possible step/i })).toBeVisible();
});