export const ROUND_STATUS_TYPES = [
  "BETTING_OPEN",
  "BETTING_CLOSED",
  "ROUND_START",
  "CRASHED",
] as const;

export type RoundStatusType = (typeof ROUND_STATUS_TYPES)[number];

export interface IRoundStatusTypeProps {
  value: RoundStatusType;
}
