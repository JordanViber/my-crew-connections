import { expect, test } from "@playwright/test";

const email = `e2e-${Date.now()}@example.com`;
const password = "test-password-123";
const iphone15Viewport = { width: 393, height: 852 };

async function createAccount(page: Parameters<typeof test>[0]["page"], emailAddress: string, passwordValue: string) {
  await page.goto("/auth/create");
  await expect(page.getByRole("heading", { name: "Create your account.", exact: true })).toBeVisible();
  await page.getByLabel("First name").fill("Taylor");
  await page.getByLabel("Last name").fill("Tester");
  await page.getByLabel("Phone number").fill("555-0101");
  await page.getByLabel("Email").fill(emailAddress);
  await page.getByLabel("Password", { exact: true }).fill(passwordValue);
  await page.getByLabel("Confirm password", { exact: true }).fill(passwordValue);
  await page.getByRole("button", { name: "Create account" }).click();
}

async function prepareLocalAccount(page: Parameters<typeof test>[0]["page"], emailAddress: string, passwordValue: string) {
  const localEmailInput = page.getByPlaceholder("Enter an email for this device");

  if (!(await localEmailInput.isVisible())) {
    await page.locator("details summary").click();
  }

  await localEmailInput.fill(emailAddress);
  await page.getByPlaceholder("Choose a password for this device").fill(passwordValue);
  await page.getByRole("button", { name: "Prepare local account" }).click();
  await expect(page.getByText(/local account is ready/i)).toBeVisible();
}

async function signInWithPassword(page: Parameters<typeof test>[0]["page"], emailAddress: string, passwordValue: string) {
  await page.getByPlaceholder("Enter your email").fill(emailAddress);
  await page.getByPlaceholder("Enter your password").fill(passwordValue);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("mobile create-account and create-person flow works end to end", async ({ page }) => {
  await page.setViewportSize(iphone15Viewport);

  await createAccount(page, email, password);
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("navigation").getByRole("link", { name: "People" })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Groups" })).toBeVisible();

  await page.goto("/connections");
  await expect(page.getByRole("button", { name: "Active" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add a person" })).toBeVisible();
  await page.getByRole("link", { name: "Add a person" }).click();
  await page.locator('input[name="displayName"]:visible').fill("E2E Friend");
  await page.locator('input[name="tags"]:visible').fill("close friend");
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('select[name="cadenceUnit"]:visible').selectOption("weeks");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();

  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);
  await expect(page.getByText(/person added/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "E2E Friend" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit connection" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save connection" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Not linked yet" })).toBeVisible();
});

test("logging a touchpoint updates the connection timeline", async ({ page }) => {
  await page.setViewportSize(iphone15Viewport);
  const touchpointEmail = `touchpoint-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, touchpointEmail, password);
  await signInWithPassword(page, touchpointEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/connections?tab=create");
  await page.locator('input[name="displayName"]:visible').fill("Timeline Friend");
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();

  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);

  await page.getByRole("button", { name: "Log" }).click();
  await page.locator('select[name="touchpointType"]:visible').selectOption("hangout");
  await page.locator('input[name="activityLabel"]:visible').fill("Coffee");
  await page.locator('input[name="locationLabel"]:visible').fill("Neighborhood cafe");
  await page.locator('textarea[name="note"]:visible').fill("Good catch-up and easy to repeat.");
  await page.getByRole("button", { name: "Save touchpoint" }).click();

  await expect(page).toHaveURL(/feedback=touchpoint-saved/);
  await expect(page.getByText(/touchpoint logged/i)).toBeVisible();
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.locator('p:visible', { hasText: /good catch-up and easy to repeat/i })).toBeVisible();
  await expect(page.locator('p:visible', { hasText: /coffee at neighborhood cafe/i })).toBeVisible();
});

test("mobile group creation and touchpoint flow works end to end", async ({ page }) => {
  await page.setViewportSize(iphone15Viewport);
  const groupEmail = `group-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, groupEmail, password);
  await signInWithPassword(page, groupEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/groups");
  await expect(page.getByRole("button", { name: "Active" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a group" })).toBeVisible();
  await page.getByRole("link", { name: "Create a group" }).click();
  await page.locator('input[name="name"]:visible').fill("E2E Dinner Crew");
  await page.locator('textarea[name="description"]:visible').fill("Monthly dinner tradition");
  await page.locator('input[name="cadenceValue"]:visible').fill("1");
  await page.locator('select[name="cadenceUnit"]:visible').selectOption("months");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("7");
  await page.getByRole("button", { name: "Create group" }).click();

  await expect(page).toHaveURL(/\/groups\/.+feedback=group-created/);
  await expect(page.getByText(/group created/i)).toBeVisible();
  await expect(page.getByText(/no group touchpoint yet/i).first()).toBeVisible();

  await page.getByRole("button", { name: "Log" }).click();
  await page.locator('input[name="activityLabel"]:visible').fill("Dinner");
  await page.locator('input[name="locationLabel"]:visible').fill("Favorite spot");
  await page.locator('textarea[name="note"]:visible').fill("Easy group habit to keep alive.");
  await page.getByRole("button", { name: "Save group touchpoint" }).click();

  await expect(page).toHaveURL(/feedback=touchpoint-saved/);
  await expect(page.getByText(/touchpoint logged/i)).toBeVisible();
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.locator('p:visible', { hasText: /dinner at favorite spot/i })).toBeVisible();
  await expect(page.locator('p:visible', { hasText: /easy group habit to keep alive/i })).toBeVisible();
});

test("saved connection plans can be exported and completed", async ({ page }) => {
  await page.setViewportSize(iphone15Viewport);
  const planningEmail = `planning-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, planningEmail, password);
  await signInWithPassword(page, planningEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/connections?tab=create");
  await page.locator('input[name="displayName"]:visible').fill("ICS Friend");
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);

  await page.getByRole("button", { name: "Plans" }).click();
  await page.locator('input[name="title"]:visible').fill("Coffee with ICS Friend");
  await page.locator('input[name="location"]:visible').fill("Cafe Patio");
  await page.locator('textarea[name="notes"]:visible').fill("Bring the last trip photos.");
  await page.getByRole("button", { name: "Save plan" }).click();

  await expect(page).toHaveURL(/feedback=hangout-saved/);
  await expect(page.getByText(/plan saved/i)).toBeVisible();
  await page.getByRole("button", { name: "Plans" }).click();
  await expect(page.locator("h3:visible", { hasText: "Coffee with ICS Friend" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Export to calendar" }).click(),
  ]);

  const path = await download.path();
  expect(path).toBeTruthy();
  expect(download.suggestedFilename()).toContain("coffee-with-ics-friend");

  await page.getByRole("button", { name: "Log as completed" }).click();
  await expect(page).toHaveURL(/feedback=hangout-completed/);
  await expect(page.getByText(/plan completed/i)).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  await expect(page.locator('p:visible', { hasText: /bring the last trip photos/i })).toBeVisible();
});

test("saved group plans can be exported and canceled", async ({ page }) => {
  await page.setViewportSize(iphone15Viewport);
  const planningEmail = `planning-group-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, planningEmail, password);
  await signInWithPassword(page, planningEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/groups?tab=create");
  await page.locator('input[name="name"]:visible').fill("ICS Group Crew");
  await page.locator('textarea[name="description"]:visible').fill("Calendar export group");
  await page.locator('input[name="cadenceValue"]:visible').fill("1");
  await page.locator('select[name="cadenceUnit"]:visible').selectOption("months");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("7");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/.+feedback=group-created/);

  await page.getByRole("button", { name: "Plans" }).click();
  await page.locator('input[name="title"]:visible').fill("Dinner with ICS Group");
  await page.locator('input[name="location"]:visible').fill("Group Patio");
  await page.locator('textarea[name="notes"]:visible').fill("Bring the game-night ideas.");
  await page.getByRole("button", { name: "Save plan" }).click();

  await expect(page).toHaveURL(/feedback=hangout-saved/);
  await expect(page.getByText(/plan saved/i)).toBeVisible();
  await page.getByRole("button", { name: "Plans" }).click();
  await expect(page.locator("h3:visible", { hasText: "Dinner with ICS Group" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Export to calendar" }).click(),
  ]);

  const path = await download.path();
  expect(path).toBeTruthy();
  expect(download.suggestedFilename()).toContain("dinner-with-ics-group");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel plan" }).click();
  await expect(page).toHaveURL(/feedback=hangout-canceled/);
  await expect(page.getByText(/plan canceled/i)).toBeVisible();
  await page.getByRole("button", { name: "Plans" }).click();
  await expect(page.locator("h3:visible", { hasText: "Dinner with ICS Group" })).toHaveCount(0);
});

test("dashboard quick log and settings updates work on mobile", async ({ page }) => {
  await page.setViewportSize(iphone15Viewport);
  const dashboardEmail = `dashboard-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, dashboardEmail, password);
  await signInWithPassword(page, dashboardEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/connections?tab=create");
  await page.locator('input[name="displayName"]:visible').fill("Dashboard Friend");
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Log" }).click();
  await page.locator('input[name="activityLabel"]:visible').fill("Lunch");
  await page.locator('input[name="locationLabel"]:visible').fill("Corner cafe");
  await page.locator('textarea[name="note"]:visible').fill("Turned a quick catch-up into a real plan.");
  await page.getByRole("button", { name: "Log touchpoint" }).click();

  await expect(page).toHaveURL(/\/dashboard\?feedback=touchpoint-saved/);
  await expect(page.getByText(/touchpoint logged/i)).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  await expect(page.locator('p:visible', { hasText: /turned a quick catch-up into a real plan/i })).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: /account settings/i })).toBeVisible();

  await page.getByLabel("First name").fill("Dashboard");
  await page.getByLabel("Last name").fill("Owner");
  await page.getByLabel("Phone number").fill("555-0110");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page).toHaveURL(/\/settings\?feedback=profile-saved/);
  await expect(page.getByText(/profile saved/i)).toBeVisible();
  await expect(page.getByLabel("Phone number")).toHaveValue("555-0110");
});

test("archiving a connection removes it from active lists", async ({ page }) => {
  await page.setViewportSize(iphone15Viewport);
  const archiveEmail = `archive-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, archiveEmail, password);
  await signInWithPassword(page, archiveEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/connections?tab=create");
  await page.locator('input[name="displayName"]:visible').fill("Archive Friend");
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();

  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive person" }).click();

  await expect(page).toHaveURL(/\/connections\?feedback=connection-archived/);
  await expect(page.getByText(/person archived/i)).toBeVisible();
  await expect(page.getByText("Archive Friend")).toHaveCount(0);
});

test("archiving a group removes it from active lists", async ({ page }) => {
  await page.setViewportSize(iphone15Viewport);
  const archiveEmail = `archive-group-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, archiveEmail, password);
  await signInWithPassword(page, archiveEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/groups?tab=create");
  await page.locator('input[name="name"]:visible').fill("Archive Group");
  await page.locator('textarea[name="description"]:visible').fill("Archive this crew");
  await page.locator('input[name="cadenceValue"]:visible').fill("1");
  await page.locator('select[name="cadenceUnit"]:visible').selectOption("months");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("7");
  await page.getByRole("button", { name: "Create group" }).click();

  await expect(page).toHaveURL(/\/groups\/.+feedback=group-created/);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive group" }).click();

  await expect(page).toHaveURL(/\/groups\?feedback=group-archived/);
  await expect(page.getByText(/group archived/i)).toBeVisible();
  await expect(page.getByText("Archive Group")).toHaveCount(0);
});

test("invite links can be started during creation and then claimed by a second user", async ({ page, browser }) => {
  await page.setViewportSize(iphone15Viewport);
  const ownerEmail = `owner-${Date.now()}@example.com`;
  const inviteeEmail = `invitee-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, ownerEmail, password);
  await signInWithPassword(page, ownerEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/connections?tab=create");
  await page.locator('input[name="displayName"]:visible').fill("Invite Friend");
  await page.locator('input[name="inviteEmail"]:visible').fill(inviteeEmail);
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);
  await expect(page.getByRole("heading", { name: "Invite pending" })).toBeVisible();
  await expect(page.getByText(new RegExp(inviteeEmail, "i")).first()).toBeVisible();
  const inviteUrl = await page.locator('input[readonly]:visible').inputValue();

  await page.goto("http://127.0.0.1:3100/connections");
  await page.getByRole("button", { name: "Active" }).click();
  await expect(page.getByText("Invite sent").first()).toBeVisible();

  await page.goto("http://127.0.0.1:3100/groups?tab=create");
  await page.locator('input[name="name"]:visible').fill("Invite Status Crew");
  await page.locator('input[type="checkbox"][name="connectionIds"]').first().check();
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/.+feedback=group-created/);
  await expect(page.getByText("Invite sent").first()).toBeVisible();

  const inviteeContext = await browser.newContext({ viewport: iphone15Viewport });
  const inviteePage = await inviteeContext.newPage();
  await inviteePage.goto(inviteUrl);
  await expect(inviteePage.getByText(/Invite Friend wants to connect/i)).toBeVisible();
  await inviteePage.getByRole("link", { name: "Sign in to claim" }).click();
  await inviteePage.waitForURL(/\/auth\?next=/);
  await prepareLocalAccount(inviteePage, inviteeEmail, password);
  await signInWithPassword(inviteePage, inviteeEmail, password);
  await inviteePage.waitForURL(/\/invite\//);
  await inviteePage.getByRole("button", { name: "Claim connection" }).click();
  await expect(inviteePage.getByText(/invite claimed/i)).toBeVisible();
  await inviteePage.getByRole("link", { name: "Open people" }).click();
  await inviteePage.waitForURL(/\/connections\?feedback=connection-linked/);
  await inviteePage.getByRole("button", { name: "Active" }).click();
  await expect(inviteePage.getByText(ownerEmail.split("@")[0], { exact: false }).first()).toBeVisible();
  await inviteeContext.close();

  await page.reload();
  await expect(page.getByText("Connected").first()).toBeVisible();
  await page.goto("http://127.0.0.1:3100/connections");
  await page.getByRole("button", { name: "Active" }).click();
  await expect(page.getByText("Connected").first()).toBeVisible();
});

test("existing account can claim an invite and receive the reciprocal connection", async ({ page, browser }) => {
  await page.setViewportSize(iphone15Viewport);
  const ownerEmail = `owner-existing-${Date.now()}@example.com`;
  const inviteeEmail = `invitee-existing-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, inviteeEmail, password);
  await prepareLocalAccount(page, ownerEmail, password);
  await signInWithPassword(page, ownerEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/connections?tab=create");
  await page.locator('input[name="displayName"]:visible').fill("Existing Invite Friend");
  await page.locator('input[name="inviteEmail"]:visible').fill(inviteeEmail);
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);
  const inviteUrl = await page.locator('input[readonly]:visible').inputValue();

  const inviteeContext = await browser.newContext({ viewport: iphone15Viewport });
  const inviteePage = await inviteeContext.newPage();
  await inviteePage.goto("/auth");
  await signInWithPassword(inviteePage, inviteeEmail, password);
  await inviteePage.waitForURL("**/dashboard");

  await inviteePage.goto(inviteUrl);
  await expect(inviteePage.getByRole("heading", { name: /claim your connection/i })).toBeVisible();
  await inviteePage.getByRole("button", { name: "Claim connection" }).click();
  await inviteePage.waitForURL(/\/invite\/.*claimed=1/);
  await inviteePage.getByRole("link", { name: "Open people" }).click();
  await inviteePage.waitForURL(/\/connections\?feedback=connection-linked/);
  await inviteePage.getByRole("button", { name: "Active" }).click();
  await expect(inviteePage.getByText(ownerEmail.split("@")[0], { exact: false }).first()).toBeVisible();
  await inviteeContext.close();
});
