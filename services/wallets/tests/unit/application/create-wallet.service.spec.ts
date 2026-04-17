import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { CreateWalletService } from "../../../src/application/services/create-wallet/create-wallet.service";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import type { WalletRepository } from "../../../src/infrastructure/database/repositories/wallet.repository";

const USER_UUID = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

function buildWallet(balanceCents = 50_000n) {
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

function repoMock(existing: WalletAggregateRoot | null): WalletRepository {
  return {
    findByUserId: mock(() => Promise.resolve(existing)),
    findById: mock(() => Promise.resolve(existing)),
    save: mock(() => Promise.resolve()),
  };
}

describe("CreateWalletService", () => {
  beforeEach(() => {
    process.env.WALLET_INITIAL_BALANCE_CENTS = "50000";
  });

  it("creates a new wallet with initial balance + DEPOSIT op and persists it", async () => {
    const repo = repoMock(null);
    const service = new CreateWalletService(repo);

    const out = await service.execute({ userId: USER_UUID });
    expect(out.isSuccess).toBe(true);

    const { wallet, wasCreated } = out.result as {
      wallet: WalletAggregateRoot;
      wasCreated: boolean;
    };
    expect(wasCreated).toBe(true);
    expect(wallet.userId.value).toBe(USER_UUID);
    expect(wallet.balance.cents).toBe(50_000n);
    expect(wallet.historic.length).toBe(1);
    expect(wallet.historic[0].type.value).toBe("DEPOSIT");
    expect(wallet.historic[0].funds.cents).toBe(50_000n);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("respects a custom WALLET_INITIAL_BALANCE_CENTS env var", async () => {
    process.env.WALLET_INITIAL_BALANCE_CENTS = "12345";
    const repo = repoMock(null);
    const service = new CreateWalletService(repo);

    const out = await service.execute({ userId: USER_UUID });
    expect(out.isSuccess).toBe(true);
    const { wallet } = out.result as { wallet: WalletAggregateRoot };
    expect(wallet.balance.cents).toBe(12_345n);
  });

  it("is idempotent: returns the existing wallet without saving", async () => {
    const existing = buildWallet(42_000n);
    const repo = repoMock(existing);
    const service = new CreateWalletService(repo);

    const out = await service.execute({ userId: USER_UUID });
    expect(out.isSuccess).toBe(true);
    const { wallet, wasCreated } = out.result as {
      wallet: WalletAggregateRoot;
      wasCreated: boolean;
    };
    expect(wasCreated).toBe(false);
    expect(wallet).toBe(existing);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("rejects an invalid userId (UUID expected)", async () => {
    const repo = repoMock(null);
    const service = new CreateWalletService(repo);

    const out = await service.execute({ userId: "not-a-uuid" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { message: string }).message).toContain("UUID");
    expect(repo.findByUserId).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("returns 500 when repository.save throws", async () => {
    const repo: WalletRepository = {
      findByUserId: mock(() => Promise.resolve(null)),
      findById: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.reject(new Error("boom"))),
    };
    const service = new CreateWalletService(repo);

    const out = await service.execute({ userId: USER_UUID });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });

  it("returns 500 when repository.findByUserId throws", async () => {
    const repo: WalletRepository = {
      findByUserId: mock(() => Promise.reject(new Error("db down"))),
      findById: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.resolve()),
    };
    const service = new CreateWalletService(repo);

    const out = await service.execute({ userId: USER_UUID });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });

  it("falls back to 50000 cents when WALLET_INITIAL_BALANCE_CENTS is unset", async () => {
    delete process.env.WALLET_INITIAL_BALANCE_CENTS;
    const repo = repoMock(null);
    const service = new CreateWalletService(repo);

    const out = await service.execute({ userId: USER_UUID });
    const { wallet } = out.result as { wallet: WalletAggregateRoot };
    expect(wallet.balance.cents).toBe(50_000n);
  });
});
