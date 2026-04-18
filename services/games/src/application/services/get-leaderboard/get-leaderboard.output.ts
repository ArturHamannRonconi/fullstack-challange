import type { LeaderboardEntry } from "../../../infrastructure/database/repositories/round.repository";

export interface IGetLeaderboardOutput {
  items: LeaderboardEntry[];
  total: number;
  page: number;
  perPage: number;
}
