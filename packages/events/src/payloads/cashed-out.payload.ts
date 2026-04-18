export interface CashedOutPayload {
  roundId: string;
  betId: string;
  playerId: string;
  username?: string;
  multiplierScaled: string;
  stakedAmountCents: string;
  totalPayoutCents: string;
  netProfitCents: string;
}
