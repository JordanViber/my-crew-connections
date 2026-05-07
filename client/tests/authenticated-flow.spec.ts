import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const email = `e2e-${Date.now()}@example.com`;
const password = process.env.E2E_TEST_PASSWORD ?? `e2e-${randomUUID()}`;
const iphone15Viewport = { width: 393, height: 852 };

async function createAccount(page: Parameters<typeof test>[0]["page"], emailAddress: string, passwordValue: string) {
  await page.goto("/auth/create");
  await expect(page.getByRole("heading", { name: "Create your account.", exact: true })).toBeVisible();
  await page.locator('input[name="firstName"]:visible').fill("Taylor");
  await page.locator('input[name="lastName"]:visible').fill("Tester");
  await page.locator('input[name="phoneNumber"]:visible').fill("555-0101");
  await page.locator('input[name="email"]:visible').fill(emailAddress);
  await page.locator('input[name="password"]:visible').fill(passwordValue);
  await page.locator('input[name="confirmPassword"]:visible').fill(passwordValue);
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
  await page.getByPlaceholder("Email or phone").fill(emailAddress);
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

test("signed-in users visiting root are redirected to the dashboard", async ({ page }) => {
  const redirectEmail = `root-redirect-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, redirectEmail, password);
  await signInWithPassword(page, redirectEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/");
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: /your relationship dashboard/i })).toBeVisible();
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
  await page.locator('input[name="photoAlbumLabel"]:visible').fill("Coffee photos");
  await page.locator('input[name="photoAlbumUrl"]:visible').fill("https://photos.example.com/coffee");
  await page.getByRole("button", { name: "Save touchpoint" }).click();

  await expect(page).toHaveURL(/feedback=touchpoint-saved/);
  await expect(page.getByText(/touchpoint logged/i)).toBeVisible();
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.locator('p:visible', { hasText: /good catch-up and easy to repeat/i })).toBeVisible();
  await expect(page.locator('p:visible', { hasText: /coffee at neighborhood cafe/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Coffee photos" })).toHaveAttribute("href", "https://photos.example.com/coffee");
});

test("mobile group creation and touchpoint flow works end to end", async ({ page }) => {
  await page.setViewportSize(iphone15Viewport);
  const groupEmail = `group-${Date.now()}@example.com`;
  const extraMemberEmail = `group-member-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, groupEmail, password);
  await signInWithPassword(page, groupEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/groups");
  await expect(page.getByRole("button", { name: "Active" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a group" })).toBeVisible();
  await page.getByRole("link", { name: "Create a group" }).click();
  await page.getByRole("link", { name: "People" }).click();
  await page.getByRole("link", { name: "Add a person" }).click();
  await page.locator('input[name="displayName"]:visible').fill("Dinner Member One");
  await page.locator('input[name="contactEmail"]:visible').fill(extraMemberEmail);
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);
  await page.goto("/groups?tab=create");
  await page.locator('input[name="name"]:visible').fill("E2E Dinner Crew");
  await page.locator('textarea[name="description"]:visible').fill("Monthly dinner tradition");
  await page.locator('input[name="cadenceValue"]:visible').fill("1");
  await page.locator('select[name="cadenceUnit"]:visible').selectOption("months");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("7");
  await page.locator('input[type="checkbox"][name="connectionIds"]:visible').nth(0).check();
  await page.locator('input[name="quickConnectionName"]:visible').fill("Dinner Member Two");
  await page.getByRole("button", { name: "Create group" }).click();

  await expect(page).toHaveURL(/\/groups\/.+feedback=(group-created-with-members-and-invites|group-created-with-invites)/);
  await expect(page.getByText(/group created/i)).toBeVisible();
  await expect(page.getByText(/no group touchpoint yet/i).first()).toBeVisible();

  await page.getByRole("button", { name: "Log" }).click();
  await page.locator('input[name="activityLabel"]:visible').fill("Dinner");
  await page.locator('input[name="locationLabel"]:visible').fill("Favorite spot");
  await page.locator('textarea[name="note"]:visible').fill("Easy group habit to keep alive.");
  await page.locator('input[name="photoAlbumLabel"]:visible').fill("Dinner photos");
  await page.locator('input[name="photoAlbumUrl"]:visible').fill("https://photos.example.com/group-dinner");
  await page.getByRole("button", { name: "Save group touchpoint" }).click();

  await expect(page).toHaveURL(/feedback=touchpoint-saved/);
  await expect(page.getByText(/touchpoint logged/i)).toBeVisible();
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.locator('p:visible', { hasText: /dinner at favorite spot/i })).toBeVisible();
  await expect(page.locator('p:visible', { hasText: /easy group habit to keep alive/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dinner photos" })).toHaveAttribute("href", "https://photos.example.com/group-dinner");
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
  await page.getByRole("button", { name: "Add plan" }).click();
  await page.locator('input[name="title"]:visible').fill("Coffee with ICS Friend");
  await page.locator('input[name="location"]:visible').fill("Cafe Patio");
  await page.locator('textarea[name="notes"]:visible').fill("Bring the last trip photos.");
  await page.locator('input[name="photoAlbumLabel"]:visible').fill("ICS coffee album");
  await page.locator('input[name="photoAlbumUrl"]:visible').fill("https://photos.example.com/ics-coffee");
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
  await expect(page.getByRole("link", { name: "ICS coffee album" })).toHaveAttribute("href", "https://photos.example.com/ics-coffee");
});

test("group proposals can be accepted, exported, and confirmed", async ({ page, browser }) => {
  test.slow();
  await page.setViewportSize(iphone15Viewport);
  const ownerEmail = `planning-group-owner-${Date.now()}@example.com`;
  const memberEmail = `planning-group-member-${Date.now()}@example.com`;

  const memberContext = await browser.newContext({ viewport: iphone15Viewport });
  const memberPage = await memberContext.newPage();
  await memberPage.goto("/auth");
  await prepareLocalAccount(memberPage, memberEmail, password);

  await page.goto("/auth");
  await prepareLocalAccount(page, ownerEmail, password);
  await signInWithPassword(page, ownerEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/connections?tab=create");
  await page.locator('input[name="displayName"]:visible').fill("Proposal Member");
  await page.locator('input[name="contactEmail"]:visible').fill(memberEmail);
  await page.locator('input[name="sendInviteNow"]:visible').check();
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);
  const inviteUrl = await page.locator('input[readonly]:visible').inputValue();

  await memberPage.goto("/auth");
  await signInWithPassword(memberPage, memberEmail, password);
  await memberPage.waitForURL("**/dashboard");
  await memberPage.goto(inviteUrl);
  await expect(memberPage.getByRole("heading", { name: /claim your connection|accept your connection invite from/i })).toBeVisible();
  await memberPage.getByRole("button", { name: "Claim connection" }).click();
  await memberPage.waitForURL(/\/invite\/.*claimed=1/);
  await memberPage.goto("/dashboard");
  await memberPage.waitForURL("**/dashboard");

  await page.reload();
  await expect(page.getByText(/connected/i).first()).toBeVisible();

  await page.goto("/groups?tab=create");
  await page.locator('input[name="name"]:visible').fill("ICS Group Crew");
  await page.locator('textarea[name="description"]:visible').fill("Calendar export group");
  await page.locator('input[name="cadenceValue"]:visible').fill("1");
  await page.locator('select[name="cadenceUnit"]:visible').selectOption("months");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("7");
  await page.locator('label', { hasText: 'Proposal Member' }).locator('input[type="checkbox"][name="connectionIds"]').first().check();
  await page.locator('input[name="quickConnectionName"]:visible').fill("Proposal Member Two");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/.+feedback=(group-created-with-members-and-invites|group-created-with-invites)/);
  await expect(page.getByText("Proposal Member").first()).toBeVisible();
  const groupUrl = page.url().replace(/\?.*$/, "");

  await memberPage.goto("/dashboard");
  await memberPage.getByRole("button", { name: "Accept" }).first().click();
  await expect(memberPage).toHaveURL(/feedback=group-invite-accepted/, { timeout: 15000 });

  await memberPage.goto(groupUrl);
  await expect(memberPage.getByRole("heading", { name: "ICS Group Crew" })).toBeVisible();
  await expect(memberPage.getByRole("button", { name: "Edit group" })).toHaveCount(0);
  await memberPage.getByRole("button", { name: "Plans" }).click();
  await memberPage.getByRole("button", { name: "Propose hangout" }).click();
  await memberPage.locator('input[name="title"]:visible').fill("Dinner with ICS Group");
  await memberPage.locator('input[name="location"]:visible').fill("Group Patio");
  await memberPage.locator('textarea[name="notes"]:visible').fill("Bring the game-night ideas.");
  await memberPage.getByRole("button", { name: "Send proposal" }).click();

  await expect(memberPage).toHaveURL(/feedback=hangout-proposal-created/, { timeout: 15000 });
  await expect(memberPage.getByText(/proposal sent/i)).toBeVisible();

  await page.goto(groupUrl);
  await page.getByRole("button", { name: "Plans" }).click();
  await expect(page.locator("h3:visible", { hasText: "Dinner with ICS Group" })).toBeVisible();
  await expect(page.getByText("0 accepted / 0 declined / 1 pending").first()).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Accept and export calendar" }).click(),
  ]);

  const path = await download.path();
  expect(path).toBeTruthy();
  expect(download.suggestedFilename()).toContain("dinner-with-ics-group");
  await expect(page).toHaveURL(/feedback=hangout-response-accepted/, { timeout: 15000 });
  await expect(page.getByText(/your response: (accepted|joined)/i).first()).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Plans" }).click();
  await expect(page.getByText("1 accepted / 0 declined / 0 pending").first()).toBeVisible();
  await page.getByRole("button", { name: "Keep plan" }).click();
  await expect(page).toHaveURL(/feedback=hangout-proposal-confirmed/, { timeout: 15000 });
  await expect(page.getByText(/proposal confirmed/i)).toBeVisible();
  await page.getByRole("button", { name: "Plans" }).click();
  await expect(page.getByText(/group plan confirmed/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Log as completed" }).first()).toBeVisible();

  await memberContext.close();
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

  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.locator('input[name="firstName"]:visible').fill("Dashboard");
  await page.locator('input[name="lastName"]:visible').fill("Owner");
  await page.locator('input[name="phoneNumber"]:visible').fill("555-0110");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page).toHaveURL(/\/settings\?feedback=profile-saved/);
  await expect(page.getByText(/profile saved/i)).toBeVisible();
  await expect(page.getByText("5550110", { exact: true })).toBeVisible();
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
  const archiveMemberEmail = `archive-group-member-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, archiveEmail, password);
  await signInWithPassword(page, archiveEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/connections?tab=create");
  await page.locator('input[name="displayName"]:visible').fill("Archive Group Member");
  await page.locator('input[name="contactEmail"]:visible').fill(archiveMemberEmail);
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);

  await page.goto("/groups?tab=create");
  await page.locator('input[name="name"]:visible').fill("Archive Group");
  await page.locator('textarea[name="description"]:visible').fill("Archive this crew");
  await page.locator('input[name="cadenceValue"]:visible').fill("1");
  await page.locator('select[name="cadenceUnit"]:visible').selectOption("months");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("7");
  await page.locator('input[type="checkbox"][name="connectionIds"]:visible').first().check();
  await page.locator('input[name="quickConnectionName"]:visible').fill("Archive Quick Member");
  await page.getByRole("button", { name: "Create group" }).click();

  await expect(page).toHaveURL(/\/groups\/.+feedback=(group-created-with-members-and-invites|group-created-with-invites)/);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive group" }).click();

  await expect(page).toHaveURL(/\/groups\?feedback=group-archived/);
  await expect(page.getByText(/group archived/i)).toBeVisible();
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
  await page.locator('input[name="contactEmail"]:visible').fill(inviteeEmail);
  await page.locator('input[name="sendInviteNow"]:visible').check();
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
  await page.locator('input[name="quickConnectionName"]:visible').fill("Invite Status Local Member");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/.+feedback=(group-created-with-members-and-invites|group-created-with-invites)/);
  await expect(page.getByRole("heading", { name: "Pending invites" })).toBeVisible();
  await expect(page.getByText(/\d+ accepted .* 1 pending/i).first()).toBeVisible();

  const inviteeContext = await browser.newContext({ viewport: iphone15Viewport });
  const inviteePage = await inviteeContext.newPage();
  await inviteePage.goto(inviteUrl);
  await inviteePage.waitForURL(/\/auth\?next=/);
  await expect(inviteePage.getByText("Invite waiting", { exact: true })).toBeVisible();
  await expect(inviteePage.getByText(new RegExp(inviteeEmail, "i")).first()).toBeVisible();
  await prepareLocalAccount(inviteePage, inviteeEmail, password);
  await signInWithPassword(inviteePage, inviteeEmail, password);
  await inviteePage.waitForURL(/\/invite\//);
  await inviteePage.getByRole("button", { name: "Claim connection" }).click();
  await inviteePage.waitForURL(/\/invite\/.*claimed=1/);
  await expect(inviteePage.getByText(/invite claimed/i).first()).toBeVisible();
  await inviteePage.getByRole("link", { name: "Open dashboard" }).click();
  await inviteePage.waitForURL("**/dashboard");
  await inviteePage.goto("/connections");
  await inviteePage.getByRole("button", { name: "Active" }).click();
  await expect(inviteePage.getByText(ownerEmail.split("@")[0], { exact: false }).first()).toBeVisible();
  await inviteeContext.close();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Pending invites" })).toBeVisible();
  await expect(page.getByText(/\d+ accepted .* 1 pending/i).first()).toBeVisible();
  await page.goto("http://127.0.0.1:3100/connections");
  await page.getByRole("button", { name: "Active" }).click();
  await expect(page.getByText("Connected").first()).toBeVisible();
});

test("invite without a sender label switches to the recipient account name after claim", async ({ page, browser }) => {
  await page.setViewportSize(iphone15Viewport);
  const ownerEmail = `owner-blank-label-${Date.now()}@example.com`;
  const inviteeEmail = `invitee-blank-label-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, ownerEmail, password);
  await signInWithPassword(page, ownerEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/connections?tab=create");
  await page.locator('input[name="contactEmail"]:visible').fill(inviteeEmail);
  await page.locator('input[name="sendInviteNow"]:visible').check();
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();

  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);
  await expect(page.getByText(/uses their account name after they join/i)).toBeVisible();
  const inviteUrl = await page.locator('input[readonly]:visible').inputValue();

  const inviteeContext = await browser.newContext({ viewport: iphone15Viewport });
  const inviteePage = await inviteeContext.newPage();
  await inviteePage.goto(inviteUrl);
  await inviteePage.waitForURL(/\/auth\?next=/);
  await inviteePage.getByRole("link", { name: "Create account" }).click();
  await inviteePage.waitForURL(/\/auth\/create\?/);
  await inviteePage.locator('input[name="firstName"]:visible').fill("Taylor");
  await inviteePage.locator('input[name="lastName"]:visible').fill("Tester");
  await inviteePage.locator('input[name="email"]:visible').fill(inviteeEmail);
  await inviteePage.locator('input[name="password"]:visible').fill(password);
  await inviteePage.locator('input[name="confirmPassword"]:visible').fill(password);
  await inviteePage.getByRole("button", { name: "Create account" }).click();
  await inviteePage.waitForURL(/\/invite\//);
  await inviteePage.getByRole("button", { name: "Claim connection" }).click();
  await inviteePage.waitForURL(/\/invite\/.*claimed=1/);
  await inviteeContext.close();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Taylor Tester" })).toBeVisible();
});

test("existing account can claim an invite and receive the reciprocal connection", async ({ page, browser }) => {
  await page.setViewportSize(iphone15Viewport);
  const ownerEmail = `owner-existing-${Date.now()}@example.com`;
  const inviteeEmail = `invitee-existing-${Date.now()}@example.com`;

  const inviteeContext = await browser.newContext({ viewport: iphone15Viewport });
  const inviteePage = await inviteeContext.newPage();
  await inviteePage.goto("/auth");
  await prepareLocalAccount(inviteePage, inviteeEmail, password);

  await page.goto("/auth");
  await prepareLocalAccount(page, ownerEmail, password);
  await signInWithPassword(page, ownerEmail, password);
  await page.waitForURL("**/dashboard");

  await page.goto("/connections?tab=create");
  await page.locator('input[name="displayName"]:visible').fill("Existing Invite Friend");
  await page.locator('input[name="contactEmail"]:visible').fill(inviteeEmail);
  await page.locator('input[name="sendInviteNow"]:visible').check();
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);
  const inviteUrl = await page.locator('input[readonly]:visible').inputValue();

  await inviteePage.goto("/auth");
  await signInWithPassword(inviteePage, inviteeEmail, password);
  await inviteePage.waitForURL("**/dashboard");

  await inviteePage.goto(inviteUrl);
  await expect(inviteePage.getByRole("heading", { name: /claim your connection|accept your connection invite from/i })).toBeVisible();
  await inviteePage.getByRole("button", { name: "Claim connection" }).click();
  await inviteePage.waitForURL(/\/invite\/.*claimed=1/);
  await expect(inviteePage.getByText(/invite claimed/i).first()).toBeVisible();
  await inviteePage.getByRole("link", { name: "Open dashboard" }).click();
  await inviteePage.waitForURL("**/dashboard");
  await inviteePage.goto("/connections");
  await inviteePage.getByRole("button", { name: "Active" }).click();
  await expect(inviteePage.getByText(ownerEmail.split("@")[0], { exact: false }).first()).toBeVisible();
  await inviteeContext.close();
});

test("free-tier recipient cannot claim a connection invite after using their only person slot", async ({ page, browser }) => {
  await page.setViewportSize(iphone15Viewport);
  const ownerEmail = `owner-limit-${Date.now()}@example.com`;
  const inviteeEmail = `invitee-limit-${Date.now()}@example.com`;

  await page.goto("/auth");
  await prepareLocalAccount(page, inviteeEmail, password);
  await page.goto("/auth");
  await prepareLocalAccount(page, ownerEmail, password);
  await signInWithPassword(page, ownerEmail, password);
  await page.waitForURL("**/dashboard");

  const inviteeContext = await browser.newContext({ viewport: iphone15Viewport });
  const inviteePage = await inviteeContext.newPage();
  await inviteePage.goto("/auth");
  await signInWithPassword(inviteePage, inviteeEmail, password);
  await inviteePage.waitForURL("**/dashboard");
  await inviteePage.goto("/connections?tab=create");
  await inviteePage.locator('input[name="displayName"]:visible').fill("Already Using Free Slot");
  await inviteePage.locator('input[name="cadenceValue"]:visible').fill("2");
  await inviteePage.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await inviteePage.getByRole("button", { name: "Create connection" }).click();
  await expect(inviteePage).toHaveURL(/\/connections\/.+feedback=connection-created/);

  await page.goto("/connections?tab=create");
  await page.locator('input[name="displayName"]:visible').fill("Over Limit Friend");
  await page.locator('input[name="contactEmail"]:visible').fill(inviteeEmail);
  await page.locator('input[name="sendInviteNow"]:visible').check();
  await page.locator('input[name="cadenceValue"]:visible').fill("2");
  await page.locator('input[name="reminderLeadDays"]:visible').fill("3");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page).toHaveURL(/\/connections\/.+feedback=connection-created/);
  await expect(page.getByRole("heading", { name: "Invite pending" })).toBeVisible();
  const inviteUrl = await page.locator('input[readonly]:visible').inputValue();

  await inviteePage.goto(inviteUrl);
  await expect(inviteePage.getByRole("heading", { name: /claim your connection|accept your connection invite from/i })).toBeVisible();
  await inviteePage.getByRole("button", { name: "Claim connection" }).click();
  await expect(inviteePage.getByText(/already used your free person slot/i)).toBeVisible();
  await expect(inviteePage.getByRole("button", { name: "Claim connection" })).toBeVisible();

  await inviteePage.goto("/connections");
  await inviteePage.getByRole("button", { name: "Active" }).click();
  await expect(inviteePage.getByRole("heading", { name: "Already Using Free Slot" }).first()).toBeVisible();
  await expect(inviteePage.getByRole("heading", { name: "Already Using Free Slot" }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Invite pending" })).toBeVisible();
  await expect(page.getByText(new RegExp(inviteeEmail, "i")).first()).toBeVisible();

  await inviteeContext.close();
});
