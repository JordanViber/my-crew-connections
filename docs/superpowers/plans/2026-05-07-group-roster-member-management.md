# Group Roster Member Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make group creation and post-creation member management feel like one coherent roster-building workflow.

**Architecture:** Implement this in two passes. Pass 1 replaces the single quick-add slot on group creation with a reusable roster builder that can select existing people and add multiple new people. Pass 2 reuses that roster model on the group detail page, adds invite/member actions for pending and local-only members, and exposes richer roster state from the dashboard data layer.

**Tech Stack:** Next.js App Router server actions, React client components, Supabase tables already in use (`connections`, `cadence_rules`, `groups`, `group_memberships`, `group_invites`), Zod validation, Vitest, Testing Library, Playwright.

---

## Implementation Passes

### Pass 1: Group Creation Roster Builder

Ship the creation improvement first. A user can create a group with any mix of existing people and multiple new people without leaving `/groups?tab=create`. This pass does not change database schema, RLS, group roles, or post-creation management.

### Pass 2: Post-Creation Roster Management

Bring the group detail page into parity with the new creation model. Owners manage a single roster surface where they can add existing people, quick-add new people, resend/cancel pending invites, add an email to a local-only member, and remove non-owner members. This pass keeps owner-only member management because `getGroupRoleCapabilities` currently returns `canManageMembers: true` only for owners.

---

## Files and Responsibilities

- Create `client/components/group-roster-builder.tsx`: reusable client component for selecting existing connections and maintaining editable new-person rows.
- Create `client/components/group-roster-builder.test.tsx`: component tests for filtering, selecting, removing, and serializing roster rows.
- Modify `client/components/group-create-form.tsx`: replace `GroupMemberPicker` and single quick-add fieldset with `GroupRosterBuilder`.
- Modify `client/lib/validations.ts`: add quick group connection parsing and extend group/member schemas.
- Modify `client/lib/validations.test.ts`: cover quick roster parsing, blank rows, duplicate lengths, invalid emails, and max count.
- Modify `client/app/actions.ts`: add shared quick-connection preparation/creation helpers; update `createGroupAction` in Pass 1 and `addGroupMembersAction` plus member/invite actions in Pass 2.
- Modify `client/app/groups/[id]/page.tsx`: replace separate accepted/pending/add member sections with the roster management panel in Pass 2.
- Modify `client/lib/mvp-data.ts`: add manager-only roster detail data in Pass 2 while preserving existing `memberNames`, `memberConnectionIds`, and `pendingMembers` fields for current directory/search behavior.
- Modify `client/tests/authenticated-flow.spec.ts`: update existing group-creation selectors and add targeted core flows.

---

## Pass 1 Tasks

### Task 1: Add Quick Group Connection Parsing

**Files:**
- Modify: `client/lib/validations.ts`
- Modify: `client/lib/validations.test.ts`

- [ ] **Step 1: Write failing validation tests**

Add these cases to `client/lib/validations.test.ts`:

```ts
import {
  buildQuickGroupConnections,
  groupSchema,
  MAX_QUICK_GROUP_PEOPLE,
  parseCommaSeparatedList,
} from "@/lib/validations";

describe("group quick connections", () => {
  it("pairs repeated quick connection names and emails", () => {
    expect(buildQuickGroupConnections({
      names: [" Alex ", "Jordan"],
      emails: [" alex@example.com ", ""],
      legacyName: "",
      legacyEmail: "",
    })).toEqual([
      { name: "Alex", email: "alex@example.com" },
      { name: "Jordan", email: "" },
    ]);
  });

  it("drops blank quick connection rows", () => {
    expect(buildQuickGroupConnections({
      names: ["", "  "],
      emails: ["", "  "],
      legacyName: "",
      legacyEmail: "",
    })).toEqual([]);
  });

  it("keeps the legacy singular quick connection fields working", () => {
    expect(buildQuickGroupConnections({
      names: [],
      emails: [],
      legacyName: "Sam",
      legacyEmail: "sam@example.com",
    })).toEqual([{ name: "Sam", email: "sam@example.com" }]);
  });

  it("rejects more than the quick group person limit", () => {
    const names = Array.from({ length: MAX_QUICK_GROUP_PEOPLE + 1 }, (_, index) => `Person ${index}`);

    expect(() => buildQuickGroupConnections({
      names,
      emails: [],
      legacyName: "",
      legacyEmail: "",
    })).toThrow();
  });

  it("lets group schema accept repeated quick connections", () => {
    const parsed = groupSchema.parse({
      name: "Dinner Crew",
      description: "",
      cadenceValue: "1",
      cadenceUnit: "months",
      reminderLeadDays: "7",
      connectionIds: [],
      quickConnections: [
        { name: "Alex", email: "alex@example.com" },
        { name: "Jordan", email: "" },
      ],
    });

    expect(parsed.quickConnections).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd client
npm run test -- lib/validations.test.ts
```

Expected: the new tests fail because `buildQuickGroupConnections`, `MAX_QUICK_GROUP_PEOPLE`, and `quickConnections` do not exist yet.

- [ ] **Step 3: Implement validation helpers**

In `client/lib/validations.ts`, add the quick connection schema near `groupSchema`:

```ts
export const MAX_QUICK_GROUP_PEOPLE = 20;

export const quickGroupConnectionSchema = z.object({
  name: z.string().trim().max(80).optional().default(""),
  email: z.email().optional().or(z.literal("")).default(""),
}).superRefine((value, context) => {
  if (!value.name && !value.email) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a name or email for each new person.",
      path: ["name"],
    });
  }
});

export type QuickGroupConnectionInput = z.infer<typeof quickGroupConnectionSchema>;

export function buildQuickGroupConnections({
  names,
  emails,
  legacyName,
  legacyEmail,
}: Readonly<{
  names: string[];
  emails: string[];
  legacyName: string;
  legacyEmail: string;
}>) {
  const pairedLength = Math.max(names.length, emails.length);
  const rows = Array.from({ length: pairedLength }, (_, index) => ({
    name: names[index] ?? "",
    email: emails[index] ?? "",
  })).filter((row) => row.name.trim() || row.email.trim());

  if (rows.length === 0 && (legacyName.trim() || legacyEmail.trim())) {
    rows.push({
      name: legacyName,
      email: legacyEmail,
    });
  }

  return z.array(quickGroupConnectionSchema).max(MAX_QUICK_GROUP_PEOPLE).parse(rows);
}
```

Then update `groupSchema`:

```ts
export const groupSchema = baseCadenceSchema.extend({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().default(""),
  connectionIds: z.array(uuidSchema).default([]),
  quickConnections: z.array(quickGroupConnectionSchema).max(MAX_QUICK_GROUP_PEOPLE).default([]),
  quickConnectionName: z.string().trim().max(80).optional().default(""),
  quickConnectionEmail: z.email().optional().or(z.literal("")).default(""),
});
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
cd client
npm run test -- lib/validations.test.ts
```

Expected: `client/lib/validations.test.ts` passes.

- [ ] **Step 5: Commit**

```bash
git add client/lib/validations.ts client/lib/validations.test.ts
git commit -m "test: cover group quick connection parsing"
```

### Task 2: Update Server Action Quick-Add Handling

**Files:**
- Modify: `client/app/actions.ts`

- [ ] **Step 1: Import the new helper and type**

Update the validations import in `client/app/actions.ts`:

```ts
import {
  accountEmailSchema,
  accountPasswordSchema,
  accountProfileSchema,
  appFeedbackSchema,
  billingIntervalSchema,
  buildQuickGroupConnections,
  connectionSchema,
  getString,
  getStringList,
  groupMemberSchema,
  groupSchema,
  hangoutIdSchema,
  hangoutResponseSchema,
  hangoutSchema,
  inviteEmailSchema,
  parseTargetReference,
  parseCommaSeparatedList,
  touchpointSchema,
  touchpointUpdateSchema,
  updateConnectionSchema,
  updateGroupSchema,
  type QuickGroupConnectionInput,
} from "@/lib/validations";
```

- [ ] **Step 2: Add preparation helpers below `MIN_GROUP_SIZE`**

Add these helpers below `const MIN_GROUP_SIZE = 3;`:

```ts
type QuickGroupConnectionDraft = {
  displayName: string;
  contactEmail: string | null;
};

type PreparedQuickGroupConnections = {
  existingConnectionIds: string[];
  connectionsToCreate: QuickGroupConnectionDraft[];
};

async function prepareQuickGroupConnections(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  ownerUserId: string,
  quickConnections: QuickGroupConnectionInput[],
) {
  const existingConnectionIds = new Set<string>();
  const connectionsToCreate: QuickGroupConnectionDraft[] = [];
  const seenEmails = new Set<string>();

  for (const quickConnection of quickConnections) {
    const normalizedEmail = quickConnection.email ? normalizeInviteEmail(quickConnection.email) : null;

    if (normalizedEmail && seenEmails.has(normalizedEmail)) {
      continue;
    }

    if (normalizedEmail) {
      seenEmails.add(normalizedEmail);
      const conflict = await findConnectionEmailConflict(supabase, ownerUserId, normalizedEmail);

      if (conflict) {
        existingConnectionIds.add(conflict.connectionId);
        continue;
      }
    }

    const displayName = quickConnection.name || getFallbackDisplayNameFromEmail(normalizedEmail);

    if (!displayName) {
      throw new Error("Failed to prepare group member: enter a name for each person without an email.");
    }

    connectionsToCreate.push({
      displayName,
      contactEmail: normalizedEmail,
    });
  }

  return {
    existingConnectionIds: [...existingConnectionIds],
    connectionsToCreate,
  } satisfies PreparedQuickGroupConnections;
}

async function createPreparedQuickGroupConnections(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  ownerUserId: string,
  drafts: QuickGroupConnectionDraft[],
) {
  const createdConnectionIds: string[] = [];

  for (const draft of drafts) {
    const { data: quickConnection, error: quickConnectionError } = await supabase
      .from("connections")
      .insert({
        owner_user_id: ownerUserId,
        display_name: draft.displayName,
        prefers_profile_name: false,
        contact_email: draft.contactEmail,
        tags: [],
        notes: null,
        preferred_activities: null,
      })
      .select("id")
      .single();

    assertMutation(quickConnectionError, "Failed to quick-add connection for group");

    if (!quickConnection) {
      throw new Error("Failed to quick-add connection for group: no record returned.");
    }

    const { error: quickCadenceError } = await supabase.from("cadence_rules").insert({
      owner_user_id: ownerUserId,
      target_type: "connection",
      target_id: quickConnection.id,
      cadence_value: 3,
      cadence_unit: "weeks",
      reminder_lead_days: 5,
    });

    assertMutation(quickCadenceError, "Failed to create quick-added connection cadence");
    createdConnectionIds.push(quickConnection.id);
  }

  return createdConnectionIds;
}
```

- [ ] **Step 3: Update `createGroupAction` parsing and minimum-count flow**

In `createGroupAction`, parse repeated quick rows:

```ts
const quickConnections = buildQuickGroupConnections({
  names: getStringList(formData, "quickConnectionNames"),
  emails: getStringList(formData, "quickConnectionEmails"),
  legacyName: getString(formData, "quickConnectionName"),
  legacyEmail: getString(formData, "quickConnectionEmail"),
});

const payload = groupSchema.parse({
  name: getString(formData, "name"),
  description: getString(formData, "description"),
  cadenceValue: getString(formData, "cadenceValue"),
  cadenceUnit: getString(formData, "cadenceUnit"),
  reminderLeadDays: getString(formData, "reminderLeadDays"),
  connectionIds: getStringList(formData, "connectionIds"),
  quickConnections,
  quickConnectionName: "",
  quickConnectionEmail: "",
});
```

Replace the current singular quick-add block with this flow:

```ts
const selectedConnectionIds = new Set(payload.connectionIds);
const preparedQuickConnections = await prepareQuickGroupConnections(
  supabase,
  user.id,
  payload.quickConnections,
);

preparedQuickConnections.existingConnectionIds.forEach((connectionId) => {
  selectedConnectionIds.add(connectionId);
});

if (selectedConnectionIds.size + preparedQuickConnections.connectionsToCreate.length < MIN_GROUP_SIZE - 1) {
  redirect(withFeedback("/groups?tab=create", "group-minimum-members"));
}

const createdQuickConnectionIds = await createPreparedQuickGroupConnections(
  supabase,
  user.id,
  preparedQuickConnections.connectionsToCreate,
);

createdQuickConnectionIds.forEach((connectionId) => {
  selectedConnectionIds.add(connectionId);
});

if (selectedConnectionIds.size < MIN_GROUP_SIZE - 1) {
  redirect(withFeedback("/groups?tab=create", "group-minimum-members"));
}
```

This order is required: prepare conflicts first, enforce the minimum second, and only then create new connections. Failed group submissions must not leave orphan quick-added contacts behind.

- [ ] **Step 4: Run tests that exercise current group creation**

Run:

```bash
cd client
npm run test
```

Expected: all Vitest tests pass. Existing Playwright tests may still need selector updates in Task 4 because the UI has not changed yet.

- [ ] **Step 5: Commit**

```bash
git add client/app/actions.ts
git commit -m "feat: support multiple quick group members on the server"
```

### Task 3: Build the Reusable Roster Builder Component

**Files:**
- Create: `client/components/group-roster-builder.tsx`
- Create: `client/components/group-roster-builder.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `client/components/group-roster-builder.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { GroupRosterBuilder } from "@/components/group-roster-builder";
import type { RelationshipSummary } from "@/lib/mvp-data";

const connections: RelationshipSummary[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    targetType: "connection",
    title: "Chloe",
    subtitle: "Movie nights",
    notes: "Dinner crew",
    cadenceLabel: "Every 3 weeks",
    cadenceValue: 3,
    cadenceUnit: "weeks",
    reminderLeadDays: 5,
    lastTouchpointLabel: "No touchpoints yet",
    memberNames: [],
    memberConnectionIds: [],
    pendingMembers: [],
    pendingMemberConnectionIds: [],
    pendingMemberCount: 0,
    nextHangoutLabel: null,
    linkState: "unlinked",
    health: {
      state: "on-track",
      anchorAt: new Date("2026-04-01T00:00:00.000Z"),
      dueAt: new Date("2026-04-22T00:00:00.000Z"),
      daysUntilDue: 15,
      isFirstTouchpoint: true,
      label: "No touchpoint yet",
      summary: "Next target in 15 days",
    },
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    targetType: "connection",
    title: "Jordan",
    subtitle: "Run club",
    notes: "Saturday runs",
    cadenceLabel: "Every 2 weeks",
    cadenceValue: 2,
    cadenceUnit: "weeks",
    reminderLeadDays: 3,
    lastTouchpointLabel: "Apr 1, 2026",
    memberNames: [],
    memberConnectionIds: [],
    pendingMembers: [],
    pendingMemberConnectionIds: [],
    pendingMemberCount: 0,
    nextHangoutLabel: null,
    linkState: "pending",
    pendingInviteEmail: "jordan@example.com",
    health: {
      state: "due-soon",
      anchorAt: new Date("2026-04-01T00:00:00.000Z"),
      dueAt: new Date("2026-04-14T00:00:00.000Z"),
      daysUntilDue: 1,
      isFirstTouchpoint: false,
      label: "Due soon",
      summary: "Needs attention in 1 day",
    },
  },
];

describe("GroupRosterBuilder", () => {
  it("adds and removes existing people from the roster", () => {
    render(<GroupRosterBuilder connections={connections} minPeople={2} mode="create" />);

    fireEvent.change(screen.getByRole("textbox", { name: /search existing people/i }), {
      target: { value: "movie" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add chloe/i }));

    expect(screen.getByText("Chloe")).toBeVisible();
    expect(document.querySelector('input[type="hidden"][name="connectionIds"]')).toHaveAttribute("value", connections[0].id);

    fireEvent.click(screen.getByRole("button", { name: /remove chloe/i }));
    expect(document.querySelector('input[type="hidden"][name="connectionIds"]')).not.toBeInTheDocument();
  });

  it("serializes multiple new people with repeated field names", () => {
    render(<GroupRosterBuilder connections={[]} minPeople={2} mode="create" />);

    const nameInputs = screen.getAllByRole("textbox", { name: /new person name/i });
    const emailInputs = screen.getAllByRole("textbox", { name: /new person email/i });

    fireEvent.change(nameInputs[0], { target: { value: "Alex" } });
    fireEvent.change(emailInputs[0], { target: { value: "alex@example.com" } });
    fireEvent.change(nameInputs[1], { target: { value: "Jordan" } });

    const names = Array.from(document.querySelectorAll('input[name="quickConnectionNames"]')).map((input) => (input as HTMLInputElement).value);
    const emails = Array.from(document.querySelectorAll('input[name="quickConnectionEmails"]')).map((input) => (input as HTMLInputElement).value);

    expect(names).toEqual(["Alex", "Jordan"]);
    expect(emails).toEqual(["alex@example.com", ""]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd client
npm run test -- components/group-roster-builder.test.tsx
```

Expected: FAIL because `GroupRosterBuilder` does not exist.

- [ ] **Step 3: Create `GroupRosterBuilder`**

Create `client/components/group-roster-builder.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { ConnectionLinkBadge } from "@/components/connection-link-badge";
import {
  countGroupMemberStatuses,
  sortConnectionsForGroupMembers,
  summarizeGroupMemberStatuses,
} from "@/lib/group-members";
import type { RelationshipSummary } from "@/lib/mvp-data";

type QuickRosterRow = {
  id: string;
  name: string;
  email: string;
};

type GroupRosterBuilderProps = Readonly<{
  connections: RelationshipSummary[];
  excludedConnectionIds?: string[];
  initialSelectedConnectionIds?: string[];
  minPeople?: number;
  mode: "create" | "manage";
}>;

function createQuickRow(): QuickRosterRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
  };
}

function getJoinModeLabel(connection: RelationshipSummary) {
  if (connection.linkedUserId) {
    return "App account connected; group invite will wait for acceptance.";
  }

  if (connection.pendingInviteEmail) {
    return "Person invite pending; group invite waits for acceptance.";
  }

  if (connection.contactEmail) {
    return "Email on file; group invite can be sent.";
  }

  return "Local person; joins immediately.";
}

export function GroupRosterBuilder({
  connections,
  excludedConnectionIds = [],
  initialSelectedConnectionIds = [],
  minPeople = 0,
  mode,
}: GroupRosterBuilderProps) {
  const [search, setSearch] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState(() => new Set(initialSelectedConnectionIds));
  const [quickRows, setQuickRows] = useState<QuickRosterRow[]>(() => (
    mode === "create" ? [createQuickRow(), createQuickRow()] : [createQuickRow()]
  ));

  const excludedIds = useMemo(() => new Set(excludedConnectionIds), [excludedConnectionIds]);
  const selectedConnections = useMemo(
    () => sortConnectionsForGroupMembers(connections.filter((connection) => selectedConnectionIds.has(connection.id))),
    [connections, selectedConnectionIds],
  );
  const availableConnections = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sortConnectionsForGroupMembers(connections.filter((connection) => {
      if (excludedIds.has(connection.id) || selectedConnectionIds.has(connection.id)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        connection.title,
        connection.subtitle,
        connection.notes ?? "",
        connection.pendingInviteEmail ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    }));
  }, [connections, excludedIds, search, selectedConnectionIds]);
  const filledQuickRows = quickRows.filter((row) => row.name.trim() || row.email.trim());
  const rosterCount = selectedConnections.length + filledQuickRows.length;
  const remainingPeople = Math.max(0, minPeople - rosterCount);
  const statusSummary = summarizeGroupMemberStatuses(
    countGroupMemberStatuses(selectedConnections.map((connection) => connection.linkState)),
  );

  function selectConnection(connectionId: string) {
    setSelectedConnectionIds((current) => new Set([...current, connectionId]));
  }

  function removeConnection(connectionId: string) {
    setSelectedConnectionIds((current) => {
      const next = new Set(current);
      next.delete(connectionId);
      return next;
    });
  }

  function updateQuickRow(rowId: string, field: "name" | "email", value: string) {
    setQuickRows((current) => current.map((row) => (
      row.id === rowId ? { ...row, [field]: value } : row
    )));
  }

  function removeQuickRow(rowId: string) {
    setQuickRows((current) => current.length > 1 ? current.filter((row) => row.id !== rowId) : [createQuickRow()]);
  }

  return (
    <fieldset className="grid gap-3 rounded-lg border border-border/85 bg-white/75 p-3.5">
      <legend className="field-label px-2">{mode === "create" ? "Group roster" : "Add people to roster"}</legend>
      <p className="text-sm leading-6 text-foreground/68">
        Add existing people or type new people here. People with app accounts or saved emails are invited; local-only people join immediately.
      </p>
      <p className="text-sm font-semibold text-foreground/70">
        {remainingPeople > 0 ? `${remainingPeople} more ${remainingPeople === 1 ? "person" : "people"} needed.` : `${rosterCount} ${rosterCount === 1 ? "person" : "people"} ready.`}
      </p>

      {selectedConnections.map((connection) => (
        <input key={connection.id} name="connectionIds" type="hidden" value={connection.id} />
      ))}
      {quickRows.map((row) => (
        <div key={`${row.id}-hidden`} className="hidden">
          <input name="quickConnectionNames" readOnly value={row.name} />
          <input name="quickConnectionEmails" readOnly value={row.email} />
        </div>
      ))}

      <div className="grid gap-3">
        {selectedConnections.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-xs leading-5 text-foreground/56">{statusSummary}</p>
            {selectedConnections.map((connection) => (
              <div key={connection.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-white/78 p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{connection.title}</p>
                    <ConnectionLinkBadge
                      linkState={connection.linkState}
                      pendingInviteEmail={connection.pendingInviteEmail}
                      linkedLabel="App account connected"
                      pendingLabel="Person invite pending"
                      unlinkedLabel="Local person"
                    />
                  </div>
                  <p className="mt-1 text-sm text-foreground/62">{getJoinModeLabel(connection)}</p>
                </div>
                <button className="button-secondary" onClick={() => removeConnection(connection.id)} type="button">
                  Remove {connection.title}
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3">
          {quickRows.map((row, index) => (
            <div key={row.id} className="grid gap-3 rounded-lg border border-border/80 bg-white/78 p-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="grid gap-2">
                <span className="field-label">New person name</span>
                <input
                  className="field-input"
                  onChange={(event) => updateQuickRow(row.id, "name", event.target.value)}
                  placeholder={index === 0 ? "Alex" : "Jordan"}
                  type="text"
                  value={row.name}
                />
              </label>
              <label className="grid gap-2">
                <span className="field-label">New person email</span>
                <input
                  className="field-input"
                  onChange={(event) => updateQuickRow(row.id, "email", event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={row.email}
                />
              </label>
              <button className="button-secondary self-end" onClick={() => removeQuickRow(row.id)} type="button">
                Remove
              </button>
            </div>
          ))}
          <button className="button-secondary w-full sm:w-auto" onClick={() => setQuickRows((current) => [...current, createQuickRow()])} type="button">
            Add another new person
          </button>
        </div>

        <label className="grid gap-2">
          <span className="field-label">Search existing people</span>
          <input
            className="field-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, tags, notes, or invite email"
            type="text"
            value={search}
          />
        </label>
        <div className="grid gap-2">
          {availableConnections.length === 0 ? (
            <p className="text-sm leading-6 text-foreground/65">
              {connections.length === 0 ? "No existing people yet. Add new people above." : "No available people match this search."}
            </p>
          ) : (
            availableConnections.map((connection) => (
              <button
                key={connection.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-white/76 p-3 text-left text-sm text-foreground/78"
                onClick={() => selectConnection(connection.id)}
                type="button"
              >
                <span>
                  <span className="block font-semibold text-foreground">{connection.title}</span>
                  <span className="mt-1 block text-foreground/62">{getJoinModeLabel(connection)}</span>
                </span>
                <span className="text-sm font-semibold text-accent-strong">Add {connection.title}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 4: Run the focused component test**

Run:

```bash
cd client
npm run test -- components/group-roster-builder.test.tsx
```

Expected: component tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/components/group-roster-builder.tsx client/components/group-roster-builder.test.tsx
git commit -m "feat: add reusable group roster builder"
```

### Task 4: Replace the Creation Form Member UI

**Files:**
- Modify: `client/components/group-create-form.tsx`
- Modify: `client/tests/authenticated-flow.spec.ts`

- [ ] **Step 1: Swap imports and render the roster builder**

In `client/components/group-create-form.tsx`, replace:

```ts
import { GroupMemberPicker } from "@/components/group-member-picker";
```

with:

```ts
import { GroupRosterBuilder } from "@/components/group-roster-builder";
```

Then replace the `GroupMemberPicker` and `Quick add someone new` fieldset with:

```tsx
<GroupRosterBuilder connections={connections} minPeople={2} mode="create" />
```

Keep the explanatory paragraph below the roster:

```tsx
<p className="text-sm leading-6 text-foreground/64">
  The group starts appearing in the dashboard reminder queue immediately. People with a saved email will show as pending until they accept.
</p>
```

Remove the `Add people first` secondary link from this form because the roster builder handles new people in place.

- [ ] **Step 2: Update Playwright selectors for existing flows**

In `client/tests/authenticated-flow.spec.ts`, replace usages like:

```ts
await page.locator('input[name="quickConnectionName"]:visible').fill("Dinner Member Two");
```

with:

```ts
await page.getByRole("textbox", { name: /new person name/i }).first().fill("Dinner Member Two");
```

When a test selects an existing person through the old checkbox:

```ts
await page.locator('input[type="checkbox"][name="connectionIds"]:visible').nth(0).check();
```

use an add button from the roster:

```ts
await page.getByRole("button", { name: /add .*member/i }).first().click();
```

Use a more specific regex when the test data name is known:

```ts
await page.getByRole("button", { name: /add proposal member/i }).click();
```

- [ ] **Step 3: Add a no-existing-connections creation flow**

Add a Playwright test or extend the mobile group creation test so it creates a group using two new-person rows and no existing people:

```ts
await page.goto("/groups?tab=create");
await page.locator('input[name="name"]:visible').fill("New People Dinner Crew");
await page.locator('textarea[name="description"]:visible').fill("Started entirely from the group roster");
await page.getByRole("textbox", { name: /new person name/i }).nth(0).fill("Alex New");
await page.getByRole("textbox", { name: /new person email/i }).nth(0).fill(`alex-new-${Date.now()}@example.com`);
await page.getByRole("textbox", { name: /new person name/i }).nth(1).fill("Jordan Local");
await page.getByRole("button", { name: "Create group" }).click();
await expect(page).toHaveURL(/\/groups\/.+feedback=(group-created-with-members-and-invites|group-created-with-invites|group-created)/);
await expect(page.getByText(/group created/i)).toBeVisible();
await expect(page.getByText(/Alex New|Jordan Local/)).toBeVisible();
```

- [ ] **Step 4: Run tests**

Run:

```bash
cd client
npm run test
npm run lint
npx playwright test tests/authenticated-flow.spec.ts -g "group"
```

Expected: Vitest and lint pass. Targeted Playwright group flows pass locally.

- [ ] **Step 5: Commit**

```bash
git add client/components/group-create-form.tsx client/tests/authenticated-flow.spec.ts
git commit -m "feat: use roster builder for group creation"
```

---

## Pass 2 Tasks

### Task 5: Support Quick-Added People When Adding Members After Creation

**Files:**
- Modify: `client/lib/validations.ts`
- Modify: `client/lib/validations.test.ts`
- Modify: `client/app/actions.ts`

- [ ] **Step 1: Extend `groupMemberSchema` with quick connections**

In `client/lib/validations.ts`, replace `groupMemberSchema` with:

```ts
export const groupMemberSchema = z.object({
  groupId: uuidSchema,
  connectionIds: z.array(uuidSchema).default([]),
  quickConnections: z.array(quickGroupConnectionSchema).max(MAX_QUICK_GROUP_PEOPLE).default([]),
}).superRefine((value, context) => {
  if (value.connectionIds.length === 0 && value.quickConnections.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose or add at least one person.",
      path: ["connectionIds"],
    });
  }
});
```

- [ ] **Step 2: Add schema tests**

Add to `client/lib/validations.test.ts`:

```ts
import { groupMemberSchema } from "@/lib/validations";

describe("groupMemberSchema", () => {
  it("accepts quick connections without existing connection IDs", () => {
    expect(groupMemberSchema.parse({
      groupId: "11111111-1111-4111-8111-111111111111",
      connectionIds: [],
      quickConnections: [{ name: "Alex", email: "" }],
    }).quickConnections).toHaveLength(1);
  });

  it("rejects an empty member update", () => {
    expect(() => groupMemberSchema.parse({
      groupId: "11111111-1111-4111-8111-111111111111",
      connectionIds: [],
      quickConnections: [],
    })).toThrow();
  });
});
```

- [ ] **Step 3: Update `addGroupMembersAction`**

In `client/app/actions.ts`, parse repeated quick rows in `addGroupMembersAction`:

```ts
const quickConnections = buildQuickGroupConnections({
  names: getStringList(formData, "quickConnectionNames"),
  emails: getStringList(formData, "quickConnectionEmails"),
  legacyName: "",
  legacyEmail: "",
});

const payload = groupMemberSchema.parse({
  groupId: getString(formData, "groupId"),
  connectionIds: getStringList(formData, "connectionIds"),
  quickConnections,
});
```

Before calling `addConnectionsToGroup`, resolve quick connections:

```ts
const selectedConnectionIds = new Set(payload.connectionIds);
const preparedQuickConnections = await prepareQuickGroupConnections(
  supabase,
  user.id,
  payload.quickConnections,
);

preparedQuickConnections.existingConnectionIds.forEach((connectionId) => {
  selectedConnectionIds.add(connectionId);
});

const createdQuickConnectionIds = await createPreparedQuickGroupConnections(
  supabase,
  user.id,
  preparedQuickConnections.connectionsToCreate,
);

createdQuickConnectionIds.forEach((connectionId) => {
  selectedConnectionIds.add(connectionId);
});
```

Then pass `[...selectedConnectionIds]` into `addConnectionsToGroup`.

- [ ] **Step 4: Run focused tests**

Run:

```bash
cd client
npm run test -- lib/validations.test.ts
```

Expected: validation tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/lib/validations.ts client/lib/validations.test.ts client/app/actions.ts
git commit -m "feat: allow quick-added members after group creation"
```

### Task 6: Add Roster Detail Data for Group Management

**Files:**
- Modify: `client/lib/mvp-data.ts`
- Add or modify test: `client/lib/group-directory.test.ts` only if existing summary behavior changes; otherwise add `client/lib/group-roster-members.test.ts` with extracted helper coverage.

- [ ] **Step 1: Add a roster member type**

In `client/lib/mvp-data.ts`, export:

```ts
export type GroupRosterMember = {
  key: string;
  name: string;
  role: GroupRole;
  status: "accepted-app" | "accepted-local" | "pending-invite";
  connectionId?: string;
  userId?: string;
  invitedEmail?: string;
};
```

Extend `RelationshipSummary` with:

```ts
rosterMembers?: GroupRosterMember[];
```

- [ ] **Step 2: Build manager-visible roster members**

In `getDashboardData`, when mapping `groupSummaries`, create roster members from active memberships and active group invites:

```ts
const rosterMembers = capabilities.canManageMembers
  ? [
      ...memberships
        .filter((membership) => membership.group_id === group.id)
        .map((membership) => {
          const name = resolveGroupMemberName({
            membership,
            connectionMap: new Map(groupConnections.map((connection) => [connection.id, connection])),
            profiles: groupProfiles,
            viewerUserId: userId,
            viewerProfileName,
          });

          return {
            key: membership.user_id ? `user:${membership.user_id}` : `connection:${membership.connection_id}`,
            name: name ?? "Someone",
            role: membership.role as GroupRole,
            status: membership.user_id ? "accepted-app" : "accepted-local",
            connectionId: membership.connection_id ?? undefined,
            userId: membership.user_id ?? undefined,
          } satisfies GroupRosterMember;
        }),
      ...pendingMembers.map((member) => ({
        key: `pending:${member.connectionId}`,
        name: member.name,
        role: "member" as GroupRole,
        status: "pending-invite" as const,
        connectionId: member.connectionId,
        invitedEmail: member.invitedEmail,
      })),
    ]
  : undefined;
```

Assign `rosterMembers` on the returned group summary. Preserve all current summary fields so the group directory remains stable.

- [ ] **Step 3: Avoid duplicate local-and-pending rows**

When a local member has an active group invite for the same `connectionId`, show one row with `status: "pending-invite"` and keep the name from the connection. Use this merge rule:

```ts
const pendingConnectionIds = new Set(pendingMembers.map((member) => member.connectionId));
const acceptedRosterMembers = memberships
  .filter((membership) => membership.group_id === group.id)
  .filter((membership) => !membership.connection_id || !pendingConnectionIds.has(membership.connection_id));
```

Use `acceptedRosterMembers` in the roster member map.

- [ ] **Step 4: Run tests**

Run:

```bash
cd client
npm run test -- lib/group-directory.test.ts
```

Expected: existing group directory tests pass. Add a helper test if the roster merge logic is extracted.

- [ ] **Step 5: Commit**

```bash
git add client/lib/mvp-data.ts client/lib/group-directory.test.ts
git commit -m "feat: expose group roster member details"
```

### Task 7: Add Member and Invite Actions

**Files:**
- Modify: `client/app/actions.ts`
- Modify: `client/lib/feedback.ts`

- [ ] **Step 1: Add action schemas**

Add schemas to `client/lib/validations.ts` if these fields are not parsed inline:

```ts
export const groupRosterConnectionActionSchema = z.object({
  groupId: uuidSchema,
  connectionId: uuidSchema,
});

export const groupRosterUserActionSchema = z.object({
  groupId: uuidSchema,
  userId: uuidSchema,
});

export const inviteLocalGroupMemberSchema = groupRosterConnectionActionSchema.extend({
  contactEmail: z.email(),
});
```

Import them into `client/app/actions.ts`.

- [ ] **Step 2: Add owner guard helper**

Add this helper near other group access helpers:

```ts
async function assertCanManageGroupMembers(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  ownerUserId: string,
  groupId: string,
) {
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", groupId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  assertMutation(groupError, "Failed to load group for member changes");

  if (!group) {
    throw new Error("Failed to manage group members: group not found.");
  }

  return group;
}
```

- [ ] **Step 3: Add remove action**

Add `removeGroupMemberAction`:

```ts
export async function removeGroupMemberAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const groupId = getString(formData, "groupId");
  const connectionId = getString(formData, "connectionId");
  const userId = getString(formData, "userId");
  await assertCanManageGroupMembers(supabase, user.id, groupId);

  if (!connectionId && !userId) {
    throw new Error("Failed to remove group member: missing member identifier.");
  }

  let query = supabase
    .from("group_memberships")
    .update({ removed_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .is("removed_at", null);

  query = connectionId ? query.eq("connection_id", connectionId) : query.eq("user_id", userId);
  const { error } = await query;

  assertMutation(error, "Failed to remove group member");
  revalidateRelationshipPaths("group", groupId);
  redirect(withFeedback(`/groups/${groupId}`, "group-member-removed"));
}
```

Do not allow owner removal through the UI. The action may still receive `user.id`; if it does, throw:

```ts
if (userId === user.id) {
  throw new Error("Failed to remove group member: owners cannot remove themselves.");
}
```

- [ ] **Step 4: Add cancel invite action**

Add `cancelGroupInviteAction`:

```ts
export async function cancelGroupInviteAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const groupId = getString(formData, "groupId");
  const connectionId = getString(formData, "connectionId");
  await assertCanManageGroupMembers(supabase, user.id, groupId);

  const { error } = await supabase
    .from("group_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("owner_user_id", user.id)
    .eq("group_id", groupId)
    .eq("connection_id", connectionId)
    .is("accepted_at", null)
    .is("declined_at", null)
    .is("revoked_at", null);

  assertMutation(error, "Failed to cancel group invite");
  revalidateRelationshipPaths("group", groupId);
  redirect(withFeedback(`/groups/${groupId}`, "group-invite-canceled"));
}
```

- [ ] **Step 5: Add resend invite action**

Add `resendGroupInviteAction`:

```ts
export async function resendGroupInviteAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const groupId = getString(formData, "groupId");
  const connectionId = getString(formData, "connectionId");
  const group = await assertCanManageGroupMembers(supabase, user.id, groupId);

  const [{ data: invite, error: inviteError }, { data: connection, error: connectionError }] = await Promise.all([
    supabase
      .from("group_invites")
      .select("token, invited_email")
      .eq("owner_user_id", user.id)
      .eq("group_id", groupId)
      .eq("connection_id", connectionId)
      .is("accepted_at", null)
      .is("declined_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("connections")
      .select("display_name")
      .eq("owner_user_id", user.id)
      .eq("id", connectionId)
      .maybeSingle(),
  ]);

  assertMutation(inviteError, "Failed to load group invite");
  assertMutation(connectionError, "Failed to load group invite connection");

  if (!invite || !connection) {
    throw new Error("Failed to resend group invite: invite not found.");
  }

  await notifyGroupInvite(
    supabase,
    invite.invited_email,
    invite.token,
    group.name,
    connection.display_name,
    user.user_metadata?.display_name ?? user.email,
  );

  revalidateRelationshipPaths("group", groupId);
  redirect(withFeedback(`/groups/${groupId}`, "group-invite-resent"));
}
```

- [ ] **Step 6: Add invite-local action**

Add `inviteLocalGroupMemberAction`:

```ts
export async function inviteLocalGroupMemberAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const groupId = getString(formData, "groupId");
  const connectionId = getString(formData, "connectionId");
  const contactEmail = normalizeInviteEmail(getString(formData, "contactEmail"));
  const group = await assertCanManageGroupMembers(supabase, user.id, groupId);

  const { data: membership, error: membershipError } = await supabase
    .from("group_memberships")
    .select("connection_id")
    .eq("group_id", groupId)
    .eq("connection_id", connectionId)
    .is("removed_at", null)
    .maybeSingle();

  assertMutation(membershipError, "Failed to load local group member");

  if (!membership) {
    throw new Error("Failed to invite local member: local group member not found.");
  }

  const { data: connection, error: connectionError } = await supabase
    .from("connections")
    .update({ contact_email: contactEmail })
    .eq("owner_user_id", user.id)
    .eq("id", connectionId)
    .select("id, display_name")
    .maybeSingle();

  assertMutation(connectionError, "Failed to save local member email");

  if (!connection) {
    throw new Error("Failed to invite local member: connection not found.");
  }

  const { error: revokeInviteError } = await supabase
    .from("group_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("owner_user_id", user.id)
    .eq("group_id", groupId)
    .eq("connection_id", connectionId)
    .is("accepted_at", null)
    .is("declined_at", null)
    .is("revoked_at", null);

  assertMutation(revokeInviteError, "Failed to replace local member group invite");

  const token = crypto.randomUUID();
  const { error: inviteError } = await supabase.from("group_invites").insert({
    owner_user_id: user.id,
    group_id: groupId,
    connection_id: connectionId,
    invited_email: contactEmail,
    token,
  });

  assertMutation(inviteError, "Failed to create local member group invite");
  await notifyGroupInvite(
    supabase,
    contactEmail,
    token,
    group.name,
    connection.display_name,
    user.user_metadata?.display_name ?? user.email,
  );

  revalidateRelationshipPaths("group", groupId);
  redirect(withFeedback(`/groups/${groupId}`, "local-member-invited"));
}
```

- [ ] **Step 7: Add feedback copy**

In `client/lib/feedback.ts`, add:

```ts
"group-member-removed": {
  title: "Member removed",
  body: "That person is no longer active in this group.",
  tone: "success",
},
"group-invite-canceled": {
  title: "Invite canceled",
  body: "The pending group invite is no longer active.",
  tone: "success",
},
"group-invite-resent": {
  title: "Invite resent",
  body: "We sent the group invite again.",
  tone: "success",
},
"local-member-invited": {
  title: "Invite started",
  body: "That local member now has a group invite waiting on their email.",
  tone: "success",
},
```

- [ ] **Step 8: Run lint and tests**

Run:

```bash
cd client
npm run test
npm run lint
```

Expected: Vitest and lint pass.

- [ ] **Step 9: Commit**

```bash
git add client/app/actions.ts client/lib/feedback.ts client/lib/validations.ts
git commit -m "feat: add group roster member actions"
```

### Task 8: Replace Detail-Page Member Management with Roster Parity

**Files:**
- Modify: `client/app/groups/[id]/page.tsx`
- Optionally create: `client/components/group-member-management-panel.tsx`

- [ ] **Step 1: Import new actions and roster builder**

In `client/app/groups/[id]/page.tsx`, import:

```ts
import { GroupRosterBuilder } from "@/components/group-roster-builder";
import {
  addGroupMembersAction,
  archiveGroupAction,
  cancelGroupInviteAction,
  cancelHangoutAction,
  completeHangoutAction,
  confirmHangoutProposalAction,
  createHangoutAction,
  createTouchpointAction,
  inviteLocalGroupMemberAction,
  removeGroupMemberAction,
  resendGroupInviteAction,
  respondToHangoutProposalAction,
  updateGroupAction,
} from "@/app/actions";
```

- [ ] **Step 2: Compute roster inputs**

Near the existing `availableConnections` computation, add:

```ts
const rosterMembers = group.rosterMembers ?? [];
const unavailableConnectionIds = [
  ...group.memberConnectionIds,
  ...group.pendingMemberConnectionIds,
];
```

Keep `availableConnections` as the list of owner connections not already accepted or pending.

- [ ] **Step 3: Replace accepted/pending/add sections with one management panel**

For owner/manage views, render a single `SectionCard`:

```tsx
<SectionCard
  title="Group roster"
  description="Accepted people are active now. Pending invites are waiting on a response. Local-only people can be invited once you have an email."
>
  <div className="grid gap-3">
    {rosterMembers.length === 0 ? (
      <p className="text-sm leading-7 text-foreground/68">No one else is attached yet.</p>
    ) : (
      rosterMembers.map((member) => (
        <article key={member.key} className="rounded-lg border border-border/85 bg-white/78 p-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-semibold text-foreground">{member.name}</p>
              <p className="mt-1 text-sm text-foreground/65">
                {member.status === "pending-invite"
                  ? `Waiting on ${member.invitedEmail} to accept or decline.`
                  : member.status === "accepted-app"
                    ? "Accepted with app access."
                    : "Local-only member."}
              </p>
            </div>
            {canManageGroup && member.role !== "owner" ? (
              <div className="flex flex-wrap gap-2">
                {member.status === "pending-invite" && member.connectionId ? (
                  <>
                    <form action={resendGroupInviteAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="connectionId" value={member.connectionId} />
                      <button className="button-secondary" type="submit">Resend</button>
                    </form>
                    <form action={cancelGroupInviteAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="connectionId" value={member.connectionId} />
                      <button className="button-secondary" type="submit">Cancel invite</button>
                    </form>
                  </>
                ) : null}
                {member.status === "accepted-local" && member.connectionId ? (
                  <form action={inviteLocalGroupMemberAction} className="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_auto]">
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="connectionId" value={member.connectionId} />
                    <label className="sr-only" htmlFor={`invite-email-${member.connectionId}`}>Email for {member.name}</label>
                    <input id={`invite-email-${member.connectionId}`} className="field-input" name="contactEmail" placeholder="name@example.com" type="email" required />
                    <button className="button-secondary" type="submit">Invite</button>
                  </form>
                ) : null}
                <form action={removeGroupMemberAction}>
                  <input type="hidden" name="groupId" value={group.id} />
                  {member.connectionId ? <input type="hidden" name="connectionId" value={member.connectionId} /> : null}
                  {member.userId ? <input type="hidden" name="userId" value={member.userId} /> : null}
                  <button className="button-secondary" type="submit">Remove</button>
                </form>
              </div>
            ) : null}
          </div>
        </article>
      ))
    )}

    {canManageGroup ? (
      <form action={addGroupMembersAction} className="grid gap-3">
        <input type="hidden" name="groupId" value={group.id} />
        <input type="hidden" name="redirectTo" value={`/groups/${group.id}`} />
        <GroupRosterBuilder
          connections={availableConnections}
          excludedConnectionIds={unavailableConnectionIds}
          mode="manage"
        />
        <button className="button-secondary" type="submit">
          Add or invite roster changes
        </button>
      </form>
    ) : null}
  </div>
</SectionCard>
```

For non-managers, render read-only accepted names using current behavior and keep pending invite counts private except the existing aggregate copy.

- [ ] **Step 4: Remove duplicate member sections**

Remove the old `Manage members` form and separate `Pending invites` section from both mobile and desktop content. Keep one `Group roster` section in the manage tab for each viewport.

- [ ] **Step 5: Run lint**

Run:

```bash
cd client
npm run lint
```

Expected: lint passes. If `page.tsx` becomes too large or repetitive, extract a server component `client/components/group-member-management-panel.tsx` and pass the actions/forms through there.

- [ ] **Step 6: Commit**

```bash
git add client/app/groups/[id]/page.tsx client/components/group-member-management-panel.tsx
git commit -m "feat: unify group detail member management"
```

### Task 9: Add Post-Creation Flow Coverage

**Files:**
- Modify: `client/tests/authenticated-flow.spec.ts`
- Modify: `client/components/group-roster-builder.test.tsx`

- [ ] **Step 1: Add component tests for manage mode**

Add to `client/components/group-roster-builder.test.tsx`:

```tsx
it("starts manage mode with one blank new-person row", () => {
  render(<GroupRosterBuilder connections={[]} mode="manage" />);

  expect(screen.getAllByRole("textbox", { name: /new person name/i })).toHaveLength(1);
});

it("excludes unavailable existing people", () => {
  render(
    <GroupRosterBuilder
      connections={connections}
      excludedConnectionIds={[connections[0].id]}
      mode="manage"
    />,
  );

  expect(screen.queryByRole("button", { name: /add chloe/i })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /add jordan/i })).toBeVisible();
});
```

- [ ] **Step 2: Add Playwright manage-member flow**

Add a targeted test:

```ts
test("group owners can add new people after creation from the roster", async ({ page }) => {
  const ownerEmail = `manage-roster-owner-${Date.now()}@example.com`;
  const password = "Password123!";

  await prepareLocalAccount(page, ownerEmail, password);
  await signInWithPassword(page, ownerEmail, password);

  await page.goto("/groups?tab=create");
  await page.locator('input[name="name"]:visible').fill("Post Creation Roster Crew");
  await page.getByRole("textbox", { name: /new person name/i }).nth(0).fill("Original Local One");
  await page.getByRole("textbox", { name: /new person name/i }).nth(1).fill("Original Local Two");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/.+/);

  await page.getByRole("textbox", { name: /new person name/i }).first().fill("Added After Creation");
  await page.getByRole("textbox", { name: /new person email/i }).first().fill(`added-after-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /add or invite roster changes/i }).click();

  await expect(page.getByText(/members added|members added and invites started|group invites created/i)).toBeVisible();
  await expect(page.getByText("Added After Creation")).toBeVisible();
});
```

- [ ] **Step 3: Add pending invite action smoke coverage**

In the same test, after adding the emailed member:

```ts
await page.getByRole("button", { name: "Resend" }).first().click();
await expect(page.getByText(/invite resent/i)).toBeVisible();
await page.getByRole("button", { name: "Cancel invite" }).first().click();
await expect(page.getByText(/invite canceled/i)).toBeVisible();
```

Do not test email delivery in Playwright; `notifyGroupInvite` already has unit coverage around notification behavior.

- [ ] **Step 4: Run verification**

Run:

```bash
cd client
npm run test
npm run lint
npx playwright test tests/authenticated-flow.spec.ts -g "group owners can add new people after creation from the roster"
```

Expected: Vitest, lint, and the targeted Playwright flow pass.

- [ ] **Step 5: Commit**

```bash
git add client/tests/authenticated-flow.spec.ts client/components/group-roster-builder.test.tsx
git commit -m "test: cover group roster management flows"
```

---

## Final Verification

- [ ] Run full unit suite:

```bash
cd client
npm run test
```

Expected: all Vitest tests pass.

- [ ] Run lint:

```bash
cd client
npm run lint
```

Expected: lint passes without warnings or errors.

- [ ] Run targeted Playwright group coverage:

```bash
cd client
npx playwright test tests/authenticated-flow.spec.ts -g "group"
```

Expected: group-related authenticated flows pass.

- [ ] Manually inspect desktop `/groups?tab=create` and a group detail page at `http://127.0.0.1:3100`:
  - Creation page shows one roster area, not separate existing plus single quick-add sections.
  - Two brand-new people can be entered without adding connections first.
  - Detail page shows one group roster area.
  - Owner can add a new person after creation.
  - Pending invite rows expose resend and cancel actions.
  - Local-only rows expose an email field and invite action.
  - Non-owner members do not see management actions.

---

## Assumptions and Defaults

- No database migration is needed for these two passes.
- New quick-added people are capped at 20 per submit.
- Duplicate quick rows with the same normalized email collapse to one connection/invite. Name-only rows are not deduped because different people can share names.
- Failed creation submissions do not create quick-added contacts before the minimum group size check passes.
- Post-creation removal is allowed for non-owner members and does not enforce the original three-person creation minimum.
- Member management remains owner-only in this plan. Organizer member-management permissions are a separate role-policy decision.
- Local-only members stay active while an invite is pending. When they accept the invite, existing `acceptGroupInviteAction` clears the stale connection membership and creates the app-user membership.
