export type CadenceUnit = "days" | "weeks" | "months";
export type RelationshipState = "on-track" | "due-soon" | "overdue";

export type RelationshipHealth = {
  state: RelationshipState;
  anchorAt: Date;
  dueAt: Date;
  daysUntilDue: number;
  isFirstTouchpoint: boolean;
  label: string;
  summary: string;
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function startOfDay(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

export function addCadence(anchorAt: Date, cadenceValue: number, cadenceUnit: CadenceUnit) {
  const dueAt = new Date(anchorAt);

  if (cadenceUnit === "days") {
    dueAt.setUTCDate(dueAt.getUTCDate() + cadenceValue);
    return dueAt;
  }

  if (cadenceUnit === "weeks") {
    dueAt.setUTCDate(dueAt.getUTCDate() + cadenceValue * 7);
    return dueAt;
  }

  dueAt.setUTCMonth(dueAt.getUTCMonth() + cadenceValue);
  return dueAt;
}

function pluralizeDays(value: number) {
  return `${value} day${value === 1 ? "" : "s"}`;
}

function getState(daysUntilDue: number, reminderLeadDays: number): RelationshipState {
  if (daysUntilDue < 0) {
    return "overdue";
  }

  if (daysUntilDue <= reminderLeadDays) {
    return "due-soon";
  }

  return "on-track";
}

function getLabel(state: RelationshipState, isFirstTouchpoint: boolean) {
  if (state === "overdue") {
    return isFirstTouchpoint ? "First plan overdue" : "Overdue";
  }

  if (state === "due-soon") {
    return isFirstTouchpoint ? "Plan soon" : "Due soon";
  }

  return isFirstTouchpoint ? "New connection" : "On track";
}

function getSummary(state: RelationshipState, daysUntilDue: number) {
  if (state === "overdue") {
    return `${pluralizeDays(Math.abs(daysUntilDue))} past target`;
  }

  if (state === "due-soon") {
    return `Needs attention in ${pluralizeDays(daysUntilDue)}`;
  }

  return `Next target in ${pluralizeDays(daysUntilDue)}`;
}

export function getRelationshipHealth({
  createdAt,
  lastTouchpointAt,
  cadenceValue,
  cadenceUnit,
  reminderLeadDays,
  referenceAt = new Date(),
}: {
  createdAt: string;
  lastTouchpointAt?: string | null;
  cadenceValue: number;
  cadenceUnit: CadenceUnit;
  reminderLeadDays: number;
  referenceAt?: Date;
}): RelationshipHealth {
  const anchorAt = new Date(lastTouchpointAt ?? createdAt);
  const dueAt = addCadence(anchorAt, cadenceValue, cadenceUnit);
  const referenceDay = startOfDay(referenceAt);
  const dueDay = startOfDay(dueAt);
  const daysUntilDue = Math.ceil((dueDay.getTime() - referenceDay.getTime()) / DAY_IN_MS);
  const isFirstTouchpoint = !lastTouchpointAt;
  const state = getState(daysUntilDue, reminderLeadDays);
  const label = getLabel(state, isFirstTouchpoint);
  const summary = getSummary(state, daysUntilDue);

  return {
    state,
    anchorAt,
    dueAt,
    daysUntilDue,
    isFirstTouchpoint,
    label,
    summary,
  };
}

export function formatCadence(cadenceValue: number, cadenceUnit: CadenceUnit) {
  const singularUnit = cadenceUnit.slice(0, -1);
  const unitLabel = cadenceValue === 1 ? singularUnit : cadenceUnit;
  return `Every ${cadenceValue} ${unitLabel}`;
}

export function formatDateLabel(value?: string | null) {
  if (!value) {
    return "No touchpoints yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}