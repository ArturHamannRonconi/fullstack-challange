import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { IdValueObject } from "ddd-tool-kit";

import { PlayerIdValueObject } from "../../../src/domain/value-objects/player-id/player-id.value-object";
import { RoundAggregateRoot } from "../../../src/domain/round.aggregate-root";
import { BetMapper } from "../../../src/infrastructure/database/mappers/bet.mapper";
import { RoundMapper } from "../../../src/infrastructure/database/mappers/round.mapper";
import { RoundStatusMapper } from "../../../src/infrastructure/database/mappers/round-status.mapper";
import { PrismaService } from "../../../src/infrastructure/database/prisma.service";
import { PrismaRoundRepository } from "../../../src/infrastructure/database/repositories/prisma.round.repository";
import { buildRound, makeBet } from "../controllers/helpers/round-factory";

const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://admin:admin@localhost:5432/games";

// Distinct test player — avoids collision with any real `player` Keycloak UUID.
const TEST_PLAYER_ID = "9e0a4a9a-2d2b-4a77-8e11-000000000777";

function makePrisma(): PrismaService {
  const service = new (class extends PrismaService {
    constructor() {
      super({ datasources: { db: { url: DATABASE_URL } } });
    }
  })();
  return service;
}

function makeRepo(prisma: PrismaService): PrismaRoundRepository {
  return new PrismaRoundRepository(
    prisma,
    new RoundMapper(new BetMapper(), new RoundStatusMapper()),
  );
}

function placedBetOnRound(round: RoundAggregateRoot, playerId: string, stakedCents = 1_000n) {
  // Use the aggregate API so the bet is valid per domain rules.
  const out = round.placeBet({
    playerId: PlayerIdValueObject.init({ value: playerId }).result as PlayerIdValueObject,
    stakedAmount: makeBet(playerId, stakedCents).stakedAmount,
  });
  expect(out.isSuccess).toBe(true);
  return round.bets[round.bets.length - 1];
}

async function wipeRound(prisma: PrismaService, roundId: string) {
  // CASCADE wipes bets + round_statuses.
  await prisma.round.deleteMany({ where: { id: roundId } });
}

describe("PrismaRoundRepository (integration, requires Postgres)", () => {
  let prisma: PrismaService;
  let repo: PrismaRoundRepository;
  const createdRoundIds: string[] = [];

  beforeAll(async () => {
    prisma = makePrisma();
    await prisma.$connect();
    repo = makeRepo(prisma);
  });

  beforeEach(async () => {
    // Clean any leftovers from crashed runs.
    for (const id of createdRoundIds.splice(0)) {
      await wipeRound(prisma, id);
    }
    await prisma.bet.deleteMany({ where: { playerId: TEST_PLAYER_ID } });
  });

  afterAll(async () => {
    await prisma.bet.deleteMany({ where: { playerId: TEST_PLAYER_ID } });
    await prisma.$disconnect();
  });

  describe("save (create path)", () => {
    it("persists round with seed, crash point, and initial status", async () => {
      const round = buildRound({ status: "BETTING_OPEN" });
      createdRoundIds.push(round.id.value);
      await repo.save(round);

      const row = await prisma.round.findUnique({
        where: { id: round.id.value },
        include: { bets: true, statusHistory: true },
      });
      expect(row).not.toBeNull();
      expect(row?.serverSeed).toBe(round.seed.value);
      expect(row?.seedHash).toBe(round.seed.hash);
      expect(row?.crashPointScaled).toBe(round.crashPointScaled);
      expect(row?.statusHistory).toHaveLength(1);
      expect(row?.statusHistory[0].status).toBe("BETTING_OPEN");
      expect(row?.bets).toHaveLength(0);
    });

    it("persists bets inline with the round", async () => {
      const round = buildRound({ status: "BETTING_OPEN" });
      createdRoundIds.push(round.id.value);
      placedBetOnRound(round, TEST_PLAYER_ID, 5_000n);
      await repo.save(round);

      const row = await prisma.round.findUnique({
        where: { id: round.id.value },
        include: { bets: true },
      });
      expect(row?.bets).toHaveLength(1);
      expect(row?.bets[0].playerId).toBe(TEST_PLAYER_ID);
      expect(row?.bets[0].stakedAmount).toBe(5_000n);
      expect(row?.bets[0].cashOutPointScaled).toBeNull();
    });
  });

  describe("findById / findCurrent", () => {
    it("returns null when the round doesn't exist", async () => {
      expect(await repo.findById(IdValueObject.getDefault())).toBeNull();
    });

    it("round-trips a round aggregate through save → findById", async () => {
      const saved = buildRound({ status: "CRASHED" });
      createdRoundIds.push(saved.id.value);
      await repo.save(saved);

      const found = await repo.findById(saved.id);
      expect(found).not.toBeNull();
      expect(found?.id.value).toBe(saved.id.value);
      expect(found?.seed.value).toBe(saved.seed.value);
      expect(found?.crashPointScaled).toBe(saved.crashPointScaled);
      expect(found?.isCrashed).toBe(true);
    });

    it("findCurrent returns the most-recently created round", async () => {
      const older = buildRound({ status: "CRASHED" });
      createdRoundIds.push(older.id.value);
      await repo.save(older);
      // Tiny sleep to guarantee strict createdAt ordering regardless of clock granularity.
      await new Promise((resolve) => setTimeout(resolve, 5));
      const newer = buildRound({ status: "BETTING_OPEN" });
      createdRoundIds.push(newer.id.value);
      await repo.save(newer);

      const current = await repo.findCurrent();
      expect(current?.id.value).toBe(newer.id.value);
    });
  });

  describe("save (update path)", () => {
    it("appends new status transitions without overwriting existing ones", async () => {
      const round = buildRound({ status: "BETTING_OPEN" });
      createdRoundIds.push(round.id.value);
      await repo.save(round);

      round.closeBetting();
      round.startRunning(Date.now());
      round.crash();
      await repo.save(round);

      const row = await prisma.round.findUnique({
        where: { id: round.id.value },
        include: { statusHistory: { orderBy: { statusDate: "asc" } } },
      });
      const sequence = row?.statusHistory.map((s) => s.status);
      expect(sequence).toEqual([
        "BETTING_OPEN",
        "BETTING_CLOSED",
        "ROUND_START",
        "CRASHED",
      ]);
    });

    it("persists bet cash out via upsert (no duplicate bet row)", async () => {
      const round = buildRound({ status: "BETTING_OPEN" });
      createdRoundIds.push(round.id.value);
      placedBetOnRound(round, TEST_PLAYER_ID, 1_000n);
      await repo.save(round);

      round.closeBetting();
      round.startRunning(Date.now());
      const cashout = round.cashOutBetFor(
        PlayerIdValueObject.init({ value: TEST_PLAYER_ID }).result as PlayerIdValueObject,
        25_000n,
      );
      expect(cashout.isSuccess).toBe(true);
      await repo.save(round);

      const bets = await prisma.bet.findMany({ where: { roundId: round.id.value } });
      expect(bets).toHaveLength(1);
      expect(bets[0].cashOutPointScaled).toBe(25_000n);
    });
  });

  describe("findHistory", () => {
    it("returns rounds in createdAt desc order and paginates", async () => {
      const first = buildRound({ status: "CRASHED" });
      createdRoundIds.push(first.id.value);
      await repo.save(first);
      await new Promise((r) => setTimeout(r, 5));
      const second = buildRound({ status: "CRASHED" });
      createdRoundIds.push(second.id.value);
      await repo.save(second);

      const page1 = await repo.findHistory({ page: 1, perPage: 1 });
      expect(page1.total).toBeGreaterThanOrEqual(2);
      expect(page1.items[0].id.value).toBe(second.id.value);

      const page2 = await repo.findHistory({ page: 2, perPage: 1 });
      expect(page2.items[0].id.value).toBe(first.id.value);
    });
  });

  describe("findBetsByPlayer", () => {
    it("returns paginated rounds + bet ids for a player", async () => {
      const round = buildRound({ status: "CRASHED" });
      createdRoundIds.push(round.id.value);
      const bet = placedBetOnRound(round, TEST_PLAYER_ID, 2_000n);
      await repo.save(round);

      const playerId = PlayerIdValueObject.init({ value: TEST_PLAYER_ID })
        .result as PlayerIdValueObject;
      const result = await repo.findBetsByPlayer(playerId, { page: 1, perPage: 10 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].round.id.value).toBe(round.id.value);
      expect(result.items[0].betId.value).toBe(bet.id.value);
    });
  });
});
