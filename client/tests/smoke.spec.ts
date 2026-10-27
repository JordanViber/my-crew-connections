import { expect, test } from "@playwright/test";

test("landing page highlights the core relationship loop", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /keep the people you care about close/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /create account|open your dashboard/i }).first()).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Pricing" })).toBeVisible();
  await expect(page.getByText("1 person + 1 group")).toBeVisible();
  await expect(page.getByText("$5/mo or $55/yr")).toBeVisible();
});

test("protected dashboard redirects unauthenticated visitors to the auth page", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/auth/);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /password sign-in/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /email sign-in code/i })).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Terms" })).toBeVisible();
});

test("guest header and footer stay on public, auth, and missing pages", async ({ page }) => {
  for (const path of ["/", "/pricing", "/privacy", "/terms", "/auth", "/auth/create"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "My Crew Connections" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Pricing" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  }

  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "That page is not here." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Sign up" })).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy" })).toBeVisible();
});

test("home calls to action open sign-up, sign-in, pricing, and legal pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/auth\/create$/);
  await expect(page.getByRole("heading", { name: "Create your account.", exact: true })).toBeVisible();

  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();

  await page.goto("/");
  await page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByRole("heading", { name: /free, or premium when your circle grows/i })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Create free account" }).click();
  await expect(page).toHaveURL(/\/auth\/create$/);

  await page.goto("/");
  await page.getByRole("link", { name: "Continue monthly" }).click();
  await expect(page).toHaveURL(/\/auth\/create\?next=\/pricing/);

  await page.goto("/");
  await page.getByRole("link", { name: "Continue yearly" }).click();
  await expect(page).toHaveURL(/\/auth\/create\?next=\/pricing/);

  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByText("Phone number is optional.")).toBeVisible();
  await expect(page.getByText("Mailing address is optional.").first()).toBeVisible();
  await expect(page.getByText(/Supabase stores the account/)).toBeVisible();
  await expect(page.getByText(/Stripe processes Premium payments/)).toBeVisible();
  await expect(page.getByText(/Vercel hosts the app/)).toBeVisible();
  await expect(page.getByRole("link", { name: "jordankeller@mail.grokbot.com" })).toBeVisible();
  await expect(page.getByText("$5 per month or $55 per year")).toBeVisible();
  await expect(page.getByText(/Cancel from Settings, in Billing/)).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms", exact: true })).toBeVisible();
  await expect(page.getByText("Phone number is optional.")).toBeVisible();
  await expect(page.getByText("Mailing address is optional.").first()).toBeVisible();
  await expect(page.getByText(/Supabase stores the account/)).toBeVisible();
  await expect(page.getByText("$5 per month or $55 per year")).toBeVisible();
  await expect(page.getByText(/does not add a cancellation fee/)).toBeVisible();
  await expect(page.getByRole("link", { name: "jordankeller@mail.grokbot.com" })).toBeVisible();
});

test("sign-up form links to privacy and terms", async ({ page }) => {
  await page.goto("/auth/create");
  const form = page.locator("form");
  await expect(form.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  await expect(form.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  await form.getByRole("link", { name: "Terms" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: "Terms", exact: true })).toBeVisible();
});
