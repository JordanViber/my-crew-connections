export type HangoutProposalState = "pending" | "confirmed";
export type HangoutResponseStatus = "pending" | "accepted" | "declined";

export type HangoutResponseCounts = {
  accepted: number;
  declined: number;
  pending: number;
  total: number;
};

export function countHangoutResponses(statuses: Array<HangoutResponseStatus | undefined>) {
  return statuses.reduce<HangoutResponseCounts>(
    (counts, status) => {
      if (status === "accepted") {
        counts.accepted += 1;
      } else if (status === "declined") {
        counts.declined += 1;
      } else {
        counts.pending += 1;
      }

      counts.total += 1;
      return counts;
    },
    {
      accepted: 0,
      declined: 0,
      pending: 0,
      total: 0,
    },
  );
}