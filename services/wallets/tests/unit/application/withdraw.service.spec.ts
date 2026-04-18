import { describe, expect, it, mock } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { WithdrawService } from "../../../src/application/services/withdraw/withdraw.service";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { WalletRepository } from "../../../src/infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../src/infrastructure/nosql/wallet-balance.store";

const USER_UUID = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

function stubBalanceStore(): WalletBalanceStore {
  return { set: mock(async () => {}), get: mock(async () => null) } as unknown as WalletBalanceStore;
}

function buildWallet(balanceCents: bigint) {
  return WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId: UserIdValueObject.init({ value: USER_UUID })
      .result as UserIdValueObject,
    balance: MoneyValueObject.init({ value: balanceCents })
      .result as MoneyValueObject,
    reserveds: [],
    historic: [],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as WalletAggregateRoot;
}

function repoMock(wallet: WalletAggregateRoot | null): WalletRepository {
  return {
    findByUserId: mock(() => Promise.resolve(wallet)),
    findById: mock(() => Promise.resolve(wallet)),
    save: mock(() => Promise.resolve()),
    findAllWithReservesForRound: mock(() => Promise.resolve([])),
  };
}

describe("WithdrawService", () => {
  it("withdraws available funds and persists the wallet", async () => {
    const wallet = buildWallet(50_000n);
    const repo = repoMock(wallet);
    const service = new WithdrawService(repo, stubBalanceStore());

    const out = await service.execute({ userId: USER_UUID, amountCents: "1000" });
    expect(out.isSuccess).toBe(true);
    expect(wallet.balance.cents).toBe(49_000n);
    expect(wallet.historic.at(-1)?.type.value).toBe("WITHDRAW");
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when the wallet does not exist", async () => {
    const repo = repoMock(null);
    const service = new WithdrawService(repo, stubBalanceStore());

    const out = await service.execute({ userId: USER_UUID, amountCents: "1000" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("rejects with 422 when balance is insufficient", async () => {
    const wallet = buildWallet(500n);
    const repo = repoMock(wallet);
    const service = new WithdrawService(repo, stubBalanceStore());

    const out = await service.execute({ userId: USER_UUID, amountCents: "1000" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(422);
    expect(wallet.balance.cents).toBe(500n);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("rejects amount below minimum (422)", async () => {
    const wallet = buildWallet(50_000n);
    const repo = repoMock(wallet);
    const service = new WithdrawService(repo, stubBalanceStore());

    const out = await service.execute({ userId: USER_UUID, amountCents: "50" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(422);
  });

  it("rejects amount above maximum (422)", async () => {
    const wallet = buildWallet(200_000n);
    const repo = repoMock(wallet);
    const service = new WithdrawService(repo, stubBalanceStore());

    const out = await service.execute({
      userId: USER_UUID,
      amountCents: "100001",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(422);
  });

  it("rejects invalid userId without touching the repo", async () => {
    const repo = repoMock(buildWallet(50_000n));
    const service = new WithdrawService(repo, stubBalanceStore());

    const out = await service.execute({
      userId: "bad-uuid",
      amountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect(repo.findByUserId).not.toHaveBeenCalled();
  });

  it("rejects non-numeric amount string", async () => {
    const wallet = buildWallet(50_000n);
    const repo = repoMock(wallet);
    const service = new WithdrawService(repo, stubBalanceStore());

    const out = await service.execute({ userId: USER_UUID, amountCents: "xyz" });
    expect(out.isFailure).toBe(true);
  });

  it("returns 500 when repository.save throws", async () => {
    const wallet = buildWallet(50_000n);
    const repo: WalletRepository = {
      findByUserId: mock(() => Promise.resolve(wallet)),
      findById: mock(() => Promise.resolve(wallet)),
      save: mock(() => Promise.reject(new Error("db down"))),
      findAllWithReservesForRound: mock(() => Promise.resolve([])),
    };
    const service = new WithdrawService(repo, stubBalanceStore());

    const out = await service.execute({ userId: USER_UUID, amountCents: "1000" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });

  it("returns 500 when repository.findByUserId throws", async () => {
    const repo: WalletRepository = {
      findByUserId: mock(() => Promise.reject(new Error("connection refused"))),
      findById: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.resolve()),
      findAllWithReservesForRound: mock(() => Promise.resolve([])),
    };
    const service = new WithdrawService(repo, stubBalanceStore());

    const out = await service.execute({ userId: USER_UUID, amountCents: "1000" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });
});
