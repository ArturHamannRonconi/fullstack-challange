export interface IPlaceBetInput {
  playerId: string;
  username?: string;
  /** Bet amount in cents as a decimal string (wire contract). */
  amountCents: string;
}
