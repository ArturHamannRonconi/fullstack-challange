import { IdValueObject } from "ddd-tool-kit";

import { RoundAggregateRoot } from "../../../domain/round.aggregate-root";
import { PlayerIdValueObject } from "../../../domain/value-objects/player-id/player-id.value-object";

export interface PaginatedRounds {
  items: RoundAggregateRoot[];
  total: number;
}

export interface PaginatedBets {
  items: { round: RoundAggregateRoot; betId: IdValueObject }[];
  total: number;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string | null;
  totalProfitCents: bigint;
  totalStakedCents: bigint;
  betsCount: number;
  wins: number;
  losses: number;
}

export interface LeaderboardQuery {
  page: number;
  perPage: number;
  search?: string;
}

export interface PaginatedLeaderboard {
  items: LeaderboardEntry[];
  total: number;
}

export interface RoundRepository {
  save(round: RoundAggregateRoot): Promise<void>;
  findById(id: IdValueObject): Promise<RoundAggregateRoot | null>;
  findCurrent(): Promise<RoundAggregateRoot | null>;
  findHistory(params: { page: number; perPage: number }): Promise<PaginatedRounds>;
  findBetsByPlayer(
    playerId: PlayerIdValueObject,
    params: { page: number; perPage: number },
  ): Promise<PaginatedBets>;
  findLeaderboard(query: LeaderboardQuery): Promise<PaginatedLeaderboard>;
}

export const ROUND_REPOSITORY = Symbol("RoundRepository");
