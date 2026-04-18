export interface BetPlacedPayload {
  roundId: string;
  betId: string;
  playerId: string;
  username?: string;
  stakedAmountCents: string;
}
