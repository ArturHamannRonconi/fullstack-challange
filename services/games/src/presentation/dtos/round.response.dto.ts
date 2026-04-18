import type { RoundStatusType } from "../../domain/value-objects/round-status-type/round-status-type.props";

export class BetResponseDto {
  id!: string;
  playerId!: string;
  username?: string;
  stakedAmountCents!: string;
  cashOutPointScaled?: string;
  isCashedOut!: boolean;
  createdAt!: string;
  updatedAt!: string;
}

export class RoundStatusResponseDto {
  id!: string;
  status!: RoundStatusType;
  statusDate!: string;
}

export class RoundResponseDto {
  id!: string;
  seedHash!: string;
  /** Only present if round has crashed. */
  serverSeed?: string;
  crashPointScaled!: number;
  currentStatus!: RoundStatusType | null;
  startedAtMs?: number;
  bets!: BetResponseDto[];
  statusHistory!: RoundStatusResponseDto[];
  createdAt!: string;
  updatedAt!: string;
}

export class RoundsHistoryResponseDto {
  items!: RoundResponseDto[];
  total!: number;
  page!: number;
  perPage!: number;
}

export class VerifyRoundResponseDto {
  roundId!: string;
  serverSeed!: string;
  seedHash!: string;
  crashPointScaled!: number;
  isValid!: boolean;
}

export class MyBetResponseDto {
  roundId!: string;
  seedHash!: string;
  crashPointScaled!: number;
  currentStatus!: RoundStatusType | null;
  roundCreatedAt!: string;
  bet!: BetResponseDto;
}

export class MyBetsResponseDto {
  items!: MyBetResponseDto[];
  total!: number;
  page!: number;
  perPage!: number;
}

export class PlaceBetResponseDto {
  bet!: BetResponseDto;
  roundId!: string;
  balanceCents!: string;
  availableCents!: string;
}

export class CashoutResponseDto {
  bet!: BetResponseDto;
  roundId!: string;
  multiplierScaled!: string;
  totalPayoutCents!: string;
  netProfitCents!: string;
}

export class LeaderboardEntryResponseDto {
  playerId!: string;
  username!: string | null;
  totalProfitCents!: string;
  totalStakedCents!: string;
  betsCount!: number;
  wins!: number;
  losses!: number;
}

export class LeaderboardResponseDto {
  items!: LeaderboardEntryResponseDto[];
  total!: number;
  page!: number;
  perPage!: number;
}
