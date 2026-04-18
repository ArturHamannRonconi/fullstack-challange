import { describe, expect, it, mock } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";
import type { IRealTimeDb } from "@crash/real-time-db";

import { OperationEntity } from "../../../src/domain/entities/operation/operation.entity";
import { OperationTypeValueObject } from "../../../src/domain/value-objects/operation-type/operation-type.value-object";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { SettleCashedOutService } from "../../../src/application/services/settle-cashed-out/settle-cashed-out.service";
import type { WalletRepository } from "../../../src/infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../src/infrastructure/nosql/wallet-balance.store";

const USER_ID = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";
const ROUND_ID = IdValueObject.getDefault().value;
const BET_ID = IdValueObject.getDefault().value;

const money = (cents: bigint) =>
  MoneyValueObject.init({ value: cents }).result as MoneyValueObject;

function buildWallet(initialCents = 50_000n): WalletAggregateRoot {
  const deposit = OperationEntity.init({
    type: OperationTypeValueObject.deposit(),
    funds: money(initialCents),
    createdAt: DateValueObject.getDefault(),
  }).result as OperationEntity;
  return WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId: UserIdValueObject.init({ value: USER_ID }).result as UserIdValueObject,
    balance: money(initialCents),
    reserveds: [],
    historic: [deposit],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as WalletAggregateRoot;
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

describe("SettleCashedOutService", () => {
  it("returns 404 when wallet is not found", async () => {
    const service = new SettleCashedOutService(makeRepo(), new WalletBalanceStore(makeDb()));
    const out = await service.execute({
      messageId: "m1",
      userId: USER_ID,
      roundId: ROUND_ID,
      betId: BET_ID,
      netProfitCents: "100",
      stakedAmountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("idempotent skip when no reserve exists for the bet", async () => {
    const wallet = buildWallet();
    const save = mock(async () => {});
    const repo = makeRepo({ findByUserId: mock(async () => wallet), save });
    const service = new SettleCashedOutService(repo, new WalletBalanceStore(makeDb()));

    const out = await service.execute({
      messageId: "m1",
      userId: USER_ID,
      roundId: ROUND_ID,
      betId: BET_ID,
      netProfitCents: "100",
      stakedAmountCents: "1000",
    });
    expect(out.isSuccess).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it("settles (WIN) a reserved bet and credits net profit", async () => {
    const wallet = buildWallet();
    wallet.reserveFunds(
      IdValueObject.init({ value: ROUND_ID }).result as IdValueObject,
      IdValueObject.init({ value: BET_ID }).result as IdValueObject,
      money(1_000n),
    );
    const save = mock(async () => {});
    const repo = makeRepo({ findByUserId: mock(async () => wallet), save });
    const service = new SettleCashedOutService(repo, new WalletBalanceStore(makeDb()));

    const beforeBalance = wallet.balance.cents;
    const out = await service.execute({
      messageId: "m1",
      userId: USER_ID,
      roundId: ROUND_ID,
      betId: BET_ID,
      netProfitCents: "500",
      stakedAmountCents: "1000",
    });

    expect(out.isSuccess).toBe(true);
    expect(wallet.reserveds).toHaveLength(0);
    // Net profit of 500 cents added to balance.
    expect(wallet.balance.cents).toBe(beforeBalance + 500n);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the repository throws", async () => {
    const repo = makeRepo({
      findByUserId: mock(async () => {
        throw new Error("db down");
      }),
    });
    const service = new SettleCashedOutService(repo, new WalletBalanceStore(makeDb()));
    const out = await service.execute({
      messageId: "m1",
      userId: USER_ID,
      roundId: ROUND_ID,
      betId: BET_ID,
      netProfitCents: "100",
      stakedAmountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });
});
