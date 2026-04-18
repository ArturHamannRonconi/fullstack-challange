import { describe, expect, it, mock } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";
import type { IRealTimeDb } from "@crash/real-time-db";

import { OperationEntity } from "../../../src/domain/entities/operation/operation.entity";
import { OperationTypeValueObject } from "../../../src/domain/value-objects/operation-type/operation-type.value-object";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { SettleCrashedService } from "../../../src/application/services/settle-crashed/settle-crashed.service";
import type { WalletRepository } from "../../../src/infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../src/infrastructure/nosql/wallet-balance.store";

const ROUND_ID = IdValueObject.getDefault().value;
const OTHER_ROUND_ID = IdValueObject.getDefault().value;

const money = (cents: bigint) =>
  MoneyValueObject.init({ value: cents }).result as MoneyValueObject;

function buildWalletWithReserves(userId: string, reserveRoundIds: string[]): WalletAggregateRoot {
  const deposit = OperationEntity.init({
    type: OperationTypeValueObject.deposit(),
    funds: money(100_000n),
    createdAt: DateValueObject.getDefault(),
  }).result as OperationEntity;

  const wallet = WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId: UserIdValueObject.init({ value: userId }).result as UserIdValueObject,
    balance: money(100_000n),
    reserveds: [],
    historic: [deposit],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as WalletAggregateRoot;

  for (const rid of reserveRoundIds) {
    wallet.reserveFunds(
      IdValueObject.init({ value: rid }).result as IdValueObject,
      IdValueObject.getDefault(),
      money(1_000n),
    );
  }
  return wallet;
}

function makeRepo(overrides: Partial<WalletRepository> = {}): WalletRepository {
  return {
    save: mock(async () => {}),
    findById: mock(async () => null),
    findByUserId: mock(async () => null),
    findAllWithReservesForRound: mock(async () => []),
    ...overrides,
  };
}

function makeDb(): IRealTimeDb {
  return {
    get: mock(async () => null),
    set: mock(async () => {}),
    del: mock(async () => {}),
    exists: mock(async () => false),
  };
}

describe("SettleCrashedService", () => {
  it("settles (LOST) every reserve for the crashed round across all wallets", async () => {
    const walletA = buildWalletWithReserves(
      "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
      [ROUND_ID],
    );
    const walletB = buildWalletWithReserves(
      "7ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
      [ROUND_ID, OTHER_ROUND_ID],
    );
    const save = mock(async () => {});
    const repo = makeRepo({
      findAllWithReservesForRound: mock(async () => [walletA, walletB]),
      save,
    });
    const service = new SettleCrashedService(repo, new WalletBalanceStore(makeDb()));

    const out = await service.execute({ messageId: "m1", roundId: ROUND_ID });
    expect(out.isSuccess).toBe(true);
    expect((out.result as { settledCount: number }).settledCount).toBe(2);

    // walletA had its one reserve cleared.
    expect(walletA.reserveds).toHaveLength(0);
    // walletB still has the reserve on OTHER_ROUND_ID.
    expect(walletB.reserveds).toHaveLength(1);
    expect(walletB.reserveds[0].roundId.value).toBe(OTHER_ROUND_ID);
    // Both wallets were saved.
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("returns settledCount=0 when no wallets have reserves for the round", async () => {
    const service = new SettleCrashedService(makeRepo(), new WalletBalanceStore(makeDb()));
    const out = await service.execute({ messageId: "m1", roundId: ROUND_ID });
    expect(out.isSuccess).toBe(true);
    expect((out.result as { settledCount: number }).settledCount).toBe(0);
  });

  it("returns 500 when the repository fails", async () => {
    const repo = makeRepo({
      findAllWithReservesForRound: mock(async () => {
        throw new Error("db down");
      }),
    });
    const service = new SettleCrashedService(repo, new WalletBalanceStore(makeDb()));
    const out = await service.execute({ messageId: "m1", roundId: ROUND_ID });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });
});
