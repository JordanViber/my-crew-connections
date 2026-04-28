import { expect, test } from "@playwright/test";

test("landing page highlights the core relationship loop", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /stay close without carrying the whole social calendar in your head/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /create account|open your dashboard/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /i already have an account|explore the relationship workspace/i })).toBeVisible();
});

test("protected dashboard redirects unauthenticated visitors to the auth page", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/auth/);
  await expect(page.getByRole("heading", { name: /stay close to the people who matter/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /password sign-in/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /email sign-in link/i })).toBeVisible();
});
