import { describe, expect, it, mock } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { GetMyWalletService } from "../../../src/application/services/get-my-wallet/get-my-wallet.service";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { WalletRepository } from "../../../src/infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../src/infrastructure/nosql/wallet-balance.store";

const USER_UUID = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

function stubBalanceStore(): WalletBalanceStore {
  return { set: mock(async () => {}), get: mock(async () => null) } as unknown as WalletBalanceStore;
}

function buildWallet() {
  return WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId: UserIdValueObject.init({ value: USER_UUID })
      .result as UserIdValueObject,
    balance: MoneyValueObject.init({ value: 50_000n }).result as MoneyValueObject,
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

describe("GetMyWalletService", () => {
  it("returns the wallet when it exists", async () => {
    const wallet = buildWallet();
    const repo = repoMock(wallet);
    const service = new GetMyWalletService(repo, stubBalanceStore());

    const out = await service.execute({ userId: USER_UUID });
    expect(out.isSuccess).toBe(true);
    expect((out.result as { wallet: WalletAggregateRoot }).wallet).toBe(wallet);
  });

  it("returns 404 when wallet is not found", async () => {
    const repo = repoMock(null);
    const service = new GetMyWalletService(repo, stubBalanceStore());

    const out = await service.execute({ userId: USER_UUID });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("rejects invalid userId before hitting the repo", async () => {
    const repo = repoMock(buildWallet());
    const service = new GetMyWalletService(repo, stubBalanceStore());

    const out = await service.execute({ userId: "nope" });
    expect(out.isFailure).toBe(true);
    expect(repo.findByUserId).not.toHaveBeenCalled();
  });

  it("returns 500 when repository throws", async () => {
    const repo: WalletRepository = {
      findByUserId: mock(() => Promise.reject(new Error("db"))),
      findById: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.resolve()),
      findAllWithReservesForRound: mock(() => Promise.resolve([])),
    };
    const service = new GetMyWalletService(repo, stubBalanceStore());

    const out = await service.execute({ userId: USER_UUID });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });
});
