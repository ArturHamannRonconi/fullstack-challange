import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";
import { PrismaClient } from "../../../src/infrastructure/database/generated";

import { OperationEntity } from "../../../src/domain/entities/operation/operation.entity";
import { ReserveEntity } from "../../../src/domain/entities/reserve/reserve.entity";
import { OperationTypeValueObject } from "../../../src/domain/value-objects/operation-type/operation-type.value-object";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { OperationMapper } from "../../../src/infrastructure/database/mappers/operation.mapper";
import { ReserveMapper } from "../../../src/infrastructure/database/mappers/reserve.mapper";
import { WalletMapper } from "../../../src/infrastructure/database/mappers/wallet.mapper";
import { PrismaService } from "../../../src/infrastructure/database/prisma.service";
import { PrismaWalletRepository } from "../../../src/infrastructure/database/repositories/prisma.wallet.repository";

const DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://admin:admin@localhost:5432/wallets";

// Fixed non-`player` UUID. Cleaned up in beforeEach/afterAll so repeated runs stay idempotent.
const TEST_USER_ID = "9e0a4a9a-2d2b-4a77-8e11-000000000001";

const money = (cents: bigint) =>
  MoneyValueObject.init({ value: cents }).result as MoneyValueObject;

function makePrisma(): PrismaService {
  const service = new (class extends PrismaService {
    constructor() {
      super({ datasources: { db: { url: DATABASE_URL } } });
    }
  })();
  return service;
}

function buildWallet(): WalletAggregateRoot {
  const userId = UserIdValueObject.init({ value: TEST_USER_ID })
    .result as UserIdValueObject;
  const deposit = OperationEntity.init({
    type: OperationTypeValueObject.deposit(),
    funds: money(50_000n),
    createdAt: DateValueObject.getDefault(),
  }).result as OperationEntity;

  return WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId,
    balance: money(50_000n),
    reserveds: [],
    historic: [deposit],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as WalletAggregateRoot;
}

describe("PrismaWalletRepository (integration, requires Postgres)", () => {
  let prisma: PrismaService;
  let repo: PrismaWalletRepository;

  beforeAll(async () => {
    prisma = makePrisma();
    await prisma.$connect();
    repo = new PrismaWalletRepository(
      prisma,
      new WalletMapper(new OperationMapper(), new ReserveMapper()),
    );
  });

  beforeEach(async () => {
    // Clean slate per test. ON DELETE CASCADE clears operations/reserves.
    await prisma.wallet.deleteMany({ where: { userId: TEST_USER_ID } });
  });

  afterAll(async () => {
    await prisma.wallet.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.$disconnect();
  });

  describe("save (create path)", () => {
    it("inserts the wallet, operations, and reserves", async () => {
      const wallet = buildWallet();
      await repo.save(wallet);

      const row = await prisma.wallet.findUnique({
        where: { userId: TEST_USER_ID },
        include: { operations: true, reserves: true },
      });
      expect(row).not.toBeNull();
      expect(row?.id).toBe(wallet.id.value);
      expect(row?.balance).toBe(50_000n);
      expect(row?.operations.length).toBe(1);
      expect(row?.operations[0].type).toBe("DEPOSIT");
      expect(row?.operations[0].funds).toBe(50_000n);
      expect(row?.reserves.length).toBe(0);
    });
  });

  describe("findById / findByUserId", () => {
    it("returns null when no wallet exists", async () => {
      expect(await repo.findByUserId(
        UserIdValueObject.init({ value: TEST_USER_ID })
          .result as UserIdValueObject,
      )).toBeNull();
      expect(await repo.findById(IdValueObject.getDefault())).toBeNull();
    });

    it("round-trips an aggregate: save → findByUserId returns equivalent state", async () => {
      const saved = buildWallet();
      await repo.save(saved);

      const userId = UserIdValueObject.init({ value: TEST_USER_ID })
        .result as UserIdValueObject;
      const found = await repo.findByUserId(userId);

      expect(found).not.toBeNull();
      expect(found?.id.value).toBe(saved.id.value);
      expect(found?.userId.value).toBe(TEST_USER_ID);
      expect(found?.balance.cents).toBe(50_000n);
      expect(found?.historic.length).toBe(1);
      expect(found?.historic[0].type.value).toBe("DEPOSIT");
    });

    it("findById returns the same aggregate as findByUserId", async () => {
      const saved = buildWallet();
      await repo.save(saved);
      const foundById = await repo.findById(saved.id);
      expect(foundById).not.toBeNull();
      expect(foundById?.userId.value).toBe(TEST_USER_ID);
    });
  });

  describe("save (update path)", () => {
    it("persists balance mutation and replaces operations/reserves transactionally", async () => {
      const wallet = buildWallet();
      await repo.save(wallet);

      const depositOut = wallet.depositFunds(money(1_000n));
      expect(depositOut.isSuccess).toBe(true);

      await repo.save(wallet);

      const row = await prisma.wallet.findUnique({
        where: { id: wallet.id.value },
        include: { operations: true },
      });
      expect(row?.balance).toBe(51_000n);
      // Repository deletes old ops and rewrites the full historic array.
      expect(row?.operations.length).toBe(2);
      const types = row?.operations.map((op) => op.type).sort();
      expect(types).toEqual(["DEPOSIT", "DEPOSIT"]);
    });

    it("persists reserves added to the aggregate", async () => {
      const wallet = buildWallet();
      await repo.save(wallet);

      const reserveOut = wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(5_000n),
      );
      expect(reserveOut.isSuccess).toBe(true);
      await repo.save(wallet);

      const reserves = await prisma.reserve.findMany({
        where: { walletId: wallet.id.value },
      });
      expect(reserves.length).toBe(1);
      expect(reserves[0].funds).toBe(5_000n);
    });

    it("removes reserves from the aggregate on the next save", async () => {
      const wallet = buildWallet();
      wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(5_000n),
      );
      await repo.save(wallet);

      const reserveId = wallet.reserveds[0].id;
      const settled = wallet.settleReservedFunds(reserveId, money(10_000n));
      expect(settled.isSuccess).toBe(true);

      await repo.save(wallet);

      const remaining = await prisma.reserve.findMany({
        where: { walletId: wallet.id.value },
      });
      expect(remaining.length).toBe(0);
    });
  });

  describe("schema constraints", () => {
    it("rejects a second wallet for the same userId (UNIQUE(userId))", async () => {
      const first = buildWallet();
      await repo.save(first);

      const userId = UserIdValueObject.init({ value: TEST_USER_ID })
        .result as UserIdValueObject;
      const second = WalletAggregateRoot.init({
        id: IdValueObject.getDefault(),
        userId,
        balance: money(1_000n),
        reserveds: [],
        historic: [],
        createdAt: DateValueObject.getDefault(),
        updatedAt: DateValueObject.getDefault(),
      }).result as WalletAggregateRoot;

      await expect(repo.save(second)).rejects.toThrow();
    });
  });
});
