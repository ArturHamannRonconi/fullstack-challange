import { Injectable } from "@nestjs/common";
import { IdValueObject } from "ddd-tool-kit";

import { RoundAggregateRoot } from "../../../domain/round.aggregate-root";
import { PlayerIdValueObject } from "../../../domain/value-objects/player-id/player-id.value-object";
import { PrismaService } from "../prisma.service";
import { RoundMapper } from "../mappers/round.mapper";
import { roundInclude } from "../schema/round.schema";
import type {
  LeaderboardEntry,
  LeaderboardQuery,
  PaginatedBets,
  PaginatedLeaderboard,
  PaginatedRounds,
  RoundRepository,
} from "./round.repository";

@Injectable()
export class PrismaRoundRepository implements RoundRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: RoundMapper,
  ) {}

  async findById(id: IdValueObject): Promise<RoundAggregateRoot | null> {
    const schema = await this.prisma.round.findUnique({
      where: { id: id.value },
      include: roundInclude,
    });
    if (!schema) return null;
    return this.mapper.toRightSide(schema);
  }

  /**
   * The "current" round is simply the most recently created one. The game
   * orchestrator is single-instance, so only one is ever non-crashed at a
   * time. Callers should read `currentStatus` to understand lifecycle.
   */
  async findCurrent(): Promise<RoundAggregateRoot | null> {
    const schema = await this.prisma.round.findFirst({
      orderBy: { createdAt: "desc" },
      include: roundInclude,
    });
    if (!schema) return null;
    return this.mapper.toRightSide(schema);
  }

  async findHistory({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }): Promise<PaginatedRounds> {
    const skip = (page - 1) * perPage;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.round.findMany({
        orderBy: { createdAt: "desc" },
        include: roundInclude,
        skip,
        take: perPage,
      }),
      this.prisma.round.count(),
    ]);

    return {
      items: rows.map((row) => this.mapper.toRightSide(row)),
      total,
    };
  }

  async findLeaderboard({
    page,
    perPage,
    search,
  }: LeaderboardQuery): Promise<PaginatedLeaderboard> {
    const skip = (page - 1) * perPage;
    const hasSearch = !!search && search.trim().length > 0;
    const pattern = hasSearch ? `%${search!.trim().toLowerCase()}%` : null;

    const rows = hasSearch
      ? await this.prisma.$queryRaw<
          Array<{
            player_id: string;
            username: string | null;
            total_profit: bigint;
            total_staked: bigint;
            bets_count: bigint;
            wins: bigint;
            losses: bigint;
          }>
        >`
          SELECT
            b.player_id,
            MAX(b.username) AS username,
            COUNT(*)::bigint AS bets_count,
            COALESCE(SUM(b.staked_amount), 0)::bigint AS total_staked,
            COALESCE(SUM(CASE
              WHEN b.cash_out_point_scaled IS NULL THEN -b.staked_amount
              ELSE (b.staked_amount * b.cash_out_point_scaled / 10000) - b.staked_amount
            END), 0)::bigint AS total_profit,
            SUM(CASE WHEN b.cash_out_point_scaled IS NOT NULL THEN 1 ELSE 0 END)::bigint AS wins,
            SUM(CASE WHEN b.cash_out_point_scaled IS NULL THEN 1 ELSE 0 END)::bigint AS losses
          FROM bets b
          WHERE (
            b.cash_out_point_scaled IS NOT NULL
            OR EXISTS (
              SELECT 1 FROM round_statuses rs
              WHERE rs.round_id = b.round_id AND rs.status = 'CRASHED'
            )
          )
          AND LOWER(COALESCE(b.username, '')) LIKE ${pattern}
          GROUP BY b.player_id
          ORDER BY total_profit DESC
          LIMIT ${perPage} OFFSET ${skip}
        `
      : await this.prisma.$queryRaw<
          Array<{
            player_id: string;
            username: string | null;
            total_profit: bigint;
            total_staked: bigint;
            bets_count: bigint;
            wins: bigint;
            losses: bigint;
          }>
        >`
          SELECT
            b.player_id,
            MAX(b.username) AS username,
            COUNT(*)::bigint AS bets_count,
            COALESCE(SUM(b.staked_amount), 0)::bigint AS total_staked,
            COALESCE(SUM(CASE
              WHEN b.cash_out_point_scaled IS NULL THEN -b.staked_amount
              ELSE (b.staked_amount * b.cash_out_point_scaled / 10000) - b.staked_amount
            END), 0)::bigint AS total_profit,
            SUM(CASE WHEN b.cash_out_point_scaled IS NOT NULL THEN 1 ELSE 0 END)::bigint AS wins,
            SUM(CASE WHEN b.cash_out_point_scaled IS NULL THEN 1 ELSE 0 END)::bigint AS losses
          FROM bets b
          WHERE (
            b.cash_out_point_scaled IS NOT NULL
            OR EXISTS (
              SELECT 1 FROM round_statuses rs
              WHERE rs.round_id = b.round_id AND rs.status = 'CRASHED'
            )
          )
          GROUP BY b.player_id
          ORDER BY total_profit DESC
          LIMIT ${perPage} OFFSET ${skip}
        `;

    const totalRow = hasSearch
      ? await this.prisma.$queryRaw<Array<{ total: bigint }>>`
          SELECT COUNT(DISTINCT b.player_id)::bigint AS total
          FROM bets b
          WHERE (
            b.cash_out_point_scaled IS NOT NULL
            OR EXISTS (
              SELECT 1 FROM round_statuses rs
              WHERE rs.round_id = b.round_id AND rs.status = 'CRASHED'
            )
          )
          AND LOWER(COALESCE(b.username, '')) LIKE ${pattern}
        `
      : await this.prisma.$queryRaw<Array<{ total: bigint }>>`
          SELECT COUNT(DISTINCT b.player_id)::bigint AS total
          FROM bets b
          WHERE (
            b.cash_out_point_scaled IS NOT NULL
            OR EXISTS (
              SELECT 1 FROM round_statuses rs
              WHERE rs.round_id = b.round_id AND rs.status = 'CRASHED'
            )
          )
        `;

    const items: LeaderboardEntry[] = rows.map((r) => ({
      playerId: r.player_id,
      username: r.username,
      totalProfitCents: r.total_profit,
      totalStakedCents: r.total_staked,
      betsCount: Number(r.bets_count),
      wins: Number(r.wins),
      losses: Number(r.losses),
    }));

    const total = Number(totalRow[0]?.total ?? 0n);
    return { items, total };
  }

  async findBetsByPlayer(
    playerId: PlayerIdValueObject,
    { page, perPage }: { page: number; perPage: number },
  ): Promise<PaginatedBets> {
    const skip = (page - 1) * perPage;

    const [bets, total] = await this.prisma.$transaction([
      this.prisma.bet.findMany({
        where: { playerId: playerId.value },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        include: { round: { include: roundInclude } },
      }),
      this.prisma.bet.count({ where: { playerId: playerId.value } }),
    ]);

    const items = bets.map((bet) => ({
      round: this.mapper.toRightSide(bet.round),
      betId: { value: bet.id } as unknown as IdValueObject,
    }));

    return { items, total };
  }

  async save(round: RoundAggregateRoot): Promise<void> {
    const { bets, statusHistory, ...scalars } = this.mapper.toLeftSide(round);

    await this.prisma.$transaction(async (tx) => {
      await tx.round.upsert({
        where: { id: scalars.id },
        create: {
          id: scalars.id,
          serverSeed: scalars.serverSeed,
          seedHash: scalars.seedHash,
          crashPointScaled: scalars.crashPointScaled,
          startedAt: scalars.startedAt,
          createdAt: scalars.createdAt,
          updatedAt: scalars.updatedAt,
        },
        update: {
          startedAt: scalars.startedAt,
          updatedAt: scalars.updatedAt,
        },
      });

      // Upsert bets: each (roundId, playerId) is unique, so idempotent by id.
      for (const bet of bets) {
        await tx.bet.upsert({
          where: { id: bet.id },
          create: {
            id: bet.id,
            roundId: scalars.id,
            playerId: bet.playerId,
            username: bet.username,
            stakedAmount: bet.stakedAmount,
            cashOutPointScaled: bet.cashOutPointScaled,
            createdAt: bet.createdAt,
            updatedAt: bet.updatedAt,
          },
          update: {
            cashOutPointScaled: bet.cashOutPointScaled,
            updatedAt: bet.updatedAt,
          },
        });
      }

      // Status history is append-only; naive approach is to delete + recreate,
      // but that fights primary keys on rewrite. Use upsert by id.
      for (const status of statusHistory) {
        await tx.roundStatus.upsert({
          where: { id: status.id },
          create: {
            id: status.id,
            roundId: scalars.id,
            status: status.status,
            statusDate: status.statusDate,
          },
          update: {},
        });
      }
    });
  }
}
