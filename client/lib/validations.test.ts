import {
  buildQuickGroupConnections,
  groupMemberSchema,
  groupSchema,
  MAX_QUICK_GROUP_PEOPLE,
  parseCommaSeparatedList,
} from "@/lib/validations";

const GROUP_ID = "11111111-1111-4111-8111-111111111111";
const CONNECTION_ID = "22222222-2222-4222-8222-222222222222";

describe("validations", () => {
  it("normalizes comma separated tags", () => {
    expect(parseCommaSeparatedList(" close friend, local, , dinner buddy ")).toEqual([
      "close friend",
      "local",
      "dinner buddy",
    ]);
  });
});

describe("buildQuickGroupConnections", () => {
  it("pairs repeated quick-add rows", () => {
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

  it("supports mismatched repeated-field lengths by pairing missing values as blanks", () => {
    expect(buildQuickGroupConnections({
      names: ["Alex"],
      emails: ["alex@example.com", "jordan@example.com"],
      legacyName: "",
      legacyEmail: "",
    })).toEqual([
      { name: "Alex", email: "alex@example.com" },
      { name: "", email: "jordan@example.com" },
    ]);
  });

  it("drops fully blank quick-add rows", () => {
    expect(buildQuickGroupConnections({
      names: ["", "  "],
      emails: ["", "   "],
      legacyName: "",
      legacyEmail: "",
    })).toEqual([]);
  });

  it("falls back to the legacy quick-add fields", () => {
    expect(buildQuickGroupConnections({
      names: [],
      emails: [],
      legacyName: "Taylor",
      legacyEmail: "",
    })).toEqual([{ name: "Taylor", email: "" }]);
  });

  it("enforces the quick-add row limit", () => {
    const names = Array.from({ length: MAX_QUICK_GROUP_PEOPLE + 1 }, (_, index) => `Person ${index + 1}`);

    expect(() => buildQuickGroupConnections({
      names,
      emails: Array(names.length).fill(""),
      legacyName: "",
      legacyEmail: "",
    })).toThrow();
  });

  it("rejects invalid quick-add emails", () => {
    expect(() => buildQuickGroupConnections({
      names: ["Alex"],
      emails: ["not-an-email"],
      legacyName: "",
      legacyEmail: "",
    })).toThrow();
  });
});

describe("groupSchema", () => {
  it("parses quickConnections", () => {
    const parsed = groupSchema.parse({
      name: "Dinner Crew",
      description: "",
      cadenceValue: 2,
      cadenceUnit: "weeks",
      reminderLeadDays: 3,
      connectionIds: [],
      quickConnections: [
        { name: "Alex", email: "alex@example.com" },
        { name: "Jordan", email: "" },
      ],
      quickConnectionName: "",
      quickConnectionEmail: "",
    });

    expect(parsed.quickConnections).toEqual([
      { name: "Alex", email: "alex@example.com" },
      { name: "Jordan", email: "" },
    ]);
  });
});

describe("groupMemberSchema", () => {
  it("accepts connectionIds without quickConnections", () => {
    const parsed = groupMemberSchema.parse({
      groupId: GROUP_ID,
      connectionIds: [CONNECTION_ID],
      quickConnections: [],
    });

    expect(parsed.connectionIds).toEqual([CONNECTION_ID]);
    expect(parsed.quickConnections).toEqual([]);
  });

  it("accepts quickConnections without connectionIds", () => {
    const parsed = groupMemberSchema.parse({
      groupId: GROUP_ID,
      connectionIds: [],
      quickConnections: [{ name: "Alex", email: "" }],
    });

    expect(parsed.connectionIds).toEqual([]);
    expect(parsed.quickConnections).toEqual([{ name: "Alex", email: "" }]);
  });

  it("rejects empty updates", () => {
    expect(() => groupMemberSchema.parse({
      groupId: GROUP_ID,
      connectionIds: [],
      quickConnections: [],
    })).toThrow("Choose or add at least one person.");
  });
});
