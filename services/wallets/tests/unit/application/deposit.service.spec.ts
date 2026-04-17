import { describe, expect, it, mock } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { DepositService } from "../../../src/application/services/deposit/deposit.service";
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

function repoMock(wallet: WalletAggregateRoot | null): WalletRepository {
  return {
    findByUserId: mock(() => Promise.resolve(wallet)),
    findById: mock(() => Promise.resolve(wallet)),
    save: mock(() => Promise.resolve()),
  };
}

describe("DepositService", () => {
  it("deposits funds successfully and saves the wallet", async () => {
    const wallet = buildWallet(50_000n);
    const repo = repoMock(wallet);
    const service = new DepositService(repo);

    const out = await service.execute({ userId: USER_UUID, amountCents: "1000" });
    expect(out.isSuccess).toBe(true);
    expect(wallet.balance.cents).toBe(51_000n);
    expect(wallet.historic.at(-1)?.type.value).toBe("DEPOSIT");
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when the wallet does not exist", async () => {
    const repo = repoMock(null);
    const service = new DepositService(repo);

    const out = await service.execute({ userId: USER_UUID, amountCents: "1000" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("rejects an invalid userId without touching the repo", async () => {
    const repo = repoMock(buildWallet());
    const service = new DepositService(repo);

    const out = await service.execute({
      userId: "invalid",
      amountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect(repo.findByUserId).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric amount string", async () => {
    const repo = repoMock(buildWallet());
    const service = new DepositService(repo);

    const out = await service.execute({ userId: USER_UUID, amountCents: "abc" });
    expect(out.isFailure).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("rejects deposit below the minimum (100 cents) with 422", async () => {
    const wallet = buildWallet();
    const repo = repoMock(wallet);
    const service = new DepositService(repo);

    const out = await service.execute({ userId: USER_UUID, amountCents: "50" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(422);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("rejects deposit above the maximum (100_000 cents) with 422", async () => {
    const wallet = buildWallet();
    const repo = repoMock(wallet);
    const service = new DepositService(repo);

    const out = await service.execute({
      userId: USER_UUID,
      amountCents: "100001",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(422);
  });

  it("returns 500 when repository.findByUserId throws", async () => {
    const repo: WalletRepository = {
      findByUserId: mock(() => Promise.reject(new Error("boom"))),
      findById: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.resolve()),
    };
    const service = new DepositService(repo);

    const out = await service.execute({ userId: USER_UUID, amountCents: "1000" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });

  it("returns 500 when repository.save throws", async () => {
    const wallet = buildWallet();
    const repo: WalletRepository = {
      findByUserId: mock(() => Promise.resolve(wallet)),
      findById: mock(() => Promise.resolve(wallet)),
      save: mock(() => Promise.reject(new Error("db down"))),
    };
    const service = new DepositService(repo);

    const out = await service.execute({ userId: USER_UUID, amountCents: "1000" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });
});
