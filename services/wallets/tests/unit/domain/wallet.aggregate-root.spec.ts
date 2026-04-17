import { describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import {
  MAX_AMOUNT_CENTS,
  MIN_AMOUNT_CENTS,
  WalletAggregateRoot,
} from "../../../src/domain/wallet.aggregate-root";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { ReserveEntity } from "../../../src/domain/entities/reserve/reserve.entity";

const USER_UUID = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

const money = (cents: bigint) =>
  MoneyValueObject.init({ value: cents }).result as MoneyValueObject;

function makeWallet(balanceCents = 50_000n) {
  const userId = UserIdValueObject.init({ value: USER_UUID })
    .result as UserIdValueObject;
  const balance = money(balanceCents);
  const out = WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId,
    balance,
    reserveds: [],
    historic: [],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  });
  return out.result as WalletAggregateRoot;
}

describe("WalletAggregateRoot", () => {
  describe("init", () => {
    it("creates a wallet with all props valid", () => {
      const wallet = makeWallet(50_000n);
      expect(wallet.userId.value).toBe(USER_UUID);
      expect(wallet.balance.cents).toBe(50_000n);
      expect(wallet.reserveds).toEqual([]);
      expect(wallet.historic).toEqual([]);
    });

    it("auto-populates createdAt/updatedAt when absent", () => {
      const userId = UserIdValueObject.init({ value: USER_UUID })
        .result as UserIdValueObject;
      const out = WalletAggregateRoot.init({
        id: IdValueObject.getDefault(),
        userId,
        balance: money(0n),
        reserveds: [],
        historic: [],
      });
      expect(out.isSuccess).toBe(true);
      const wallet = out.result as WalletAggregateRoot;
      expect(wallet.createdAt).toBeInstanceOf(DateValueObject);
      expect(wallet.updatedAt).toBeInstanceOf(DateValueObject);
    });

    it("fails when required VOs are missing", () => {
      const out = WalletAggregateRoot.init({
        id: IdValueObject.getDefault(),
        userId: UserIdValueObject.init({ value: USER_UUID })
          .result as UserIdValueObject,
        balance: undefined as unknown as MoneyValueObject,
        reserveds: [],
        historic: [],
      });
      expect(out.isFailure).toBe(true);
    });

    it("fails when reserveds is not an array", () => {
      const out = WalletAggregateRoot.init({
        id: IdValueObject.getDefault(),
        userId: UserIdValueObject.init({ value: USER_UUID })
          .result as UserIdValueObject,
        balance: money(100n),
        reserveds: {} as unknown as ReserveEntity[],
        historic: [],
      });
      expect(out.isFailure).toBe(true);
    });

    it("fails when historic is not an array", () => {
      const out = WalletAggregateRoot.init({
        id: IdValueObject.getDefault(),
        userId: UserIdValueObject.init({ value: USER_UUID })
          .result as UserIdValueObject,
        balance: money(100n),
        reserveds: [],
        historic: null as unknown as [],
      });
      expect(out.isFailure).toBe(true);
    });
  });

  describe("getters & derived values", () => {
    it("availableFunds equals balance when no reserves", () => {
      const wallet = makeWallet(50_000n);
      expect(wallet.availableFunds.cents).toBe(50_000n);
      expect(wallet.reservedFunds.cents).toBe(0n);
    });

    it("reservedFunds is the sum of all reserve funds", () => {
      const wallet = makeWallet(50_000n);
      wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(1_000n),
      );
      wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(2_500n),
      );
      expect(wallet.reservedFunds.cents).toBe(3_500n);
      expect(wallet.availableFunds.cents).toBe(46_500n);
    });

    it("availableFunds clamps to 0 when reserved > balance (defensive)", () => {
      // Construct an inconsistent state manually to exercise the clamp.
      const wallet = makeWallet(1_000n);
      (wallet as unknown as { props: { reserveds: ReserveEntity[] } }).props.reserveds.push(
        ReserveEntity.init({
          funds: money(5_000n),
          betId: IdValueObject.getDefault(),
          roundId: IdValueObject.getDefault(),
        }).result as ReserveEntity,
      );
      expect(wallet.availableFunds.cents).toBe(0n);
    });
  });

  describe("depositFunds", () => {
    it("adds to balance and appends a DEPOSIT operation within the allowed range", () => {
      const wallet = makeWallet(50_000n);
      const out = wallet.depositFunds(money(MIN_AMOUNT_CENTS));
      expect(out.isSuccess).toBe(true);
      expect(wallet.balance.cents).toBe(50_000n + MIN_AMOUNT_CENTS);
      expect(wallet.historic.at(-1)?.type.value).toBe("DEPOSIT");
      expect(wallet.historic.at(-1)?.funds.cents).toBe(MIN_AMOUNT_CENTS);
    });

    it("accepts the maximum amount exactly", () => {
      const wallet = makeWallet(0n);
      const out = wallet.depositFunds(money(MAX_AMOUNT_CENTS));
      expect(out.isSuccess).toBe(true);
      expect(wallet.balance.cents).toBe(MAX_AMOUNT_CENTS);
    });

    it("rejects amount below MIN_AMOUNT_CENTS with AMOUNT_OUT_OF_RANGE (422)", () => {
      const wallet = makeWallet();
      const out = wallet.depositFunds(money(MIN_AMOUNT_CENTS - 1n));
      expect(out.isFailure).toBe(true);
      expect((out.result as { statusCode: number }).statusCode).toBe(422);
      expect(wallet.historic.length).toBe(0);
    });

    it("rejects amount above MAX_AMOUNT_CENTS", () => {
      const wallet = makeWallet();
      const out = wallet.depositFunds(money(MAX_AMOUNT_CENTS + 1n));
      expect(out.isFailure).toBe(true);
      expect(wallet.balance.cents).toBe(50_000n);
    });

    it("bumps updatedAt on success", () => {
      const wallet = makeWallet();
      const before = wallet.updatedAt.value.getTime();
      const out = wallet.depositFunds(money(200n));
      expect(out.isSuccess).toBe(true);
      expect(wallet.updatedAt.value.getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe("withdrawFunds", () => {
    it("subtracts from balance and appends WITHDRAW", () => {
      const wallet = makeWallet(10_000n);
      const out = wallet.withdrawFunds(money(500n));
      expect(out.isSuccess).toBe(true);
      expect(wallet.balance.cents).toBe(9_500n);
      expect(wallet.historic.at(-1)?.type.value).toBe("WITHDRAW");
    });

    it("rejects below MIN_AMOUNT_CENTS", () => {
      const wallet = makeWallet();
      const out = wallet.withdrawFunds(money(MIN_AMOUNT_CENTS - 1n));
      expect(out.isFailure).toBe(true);
      expect((out.result as { statusCode: number }).statusCode).toBe(422);
    });

    it("rejects above MAX_AMOUNT_CENTS", () => {
      const wallet = makeWallet(MAX_AMOUNT_CENTS + 1_000n);
      const out = wallet.withdrawFunds(money(MAX_AMOUNT_CENTS + 1n));
      expect(out.isFailure).toBe(true);
      expect((out.result as { message: string }).message).toContain(
        "100 and 100000",
      );
    });

    it("rejects when amount exceeds availableFunds (INSUFFICIENT_FUNDS)", () => {
      const wallet = makeWallet(500n);
      const out = wallet.withdrawFunds(money(1_000n));
      expect(out.isFailure).toBe(true);
      expect((out.result as { statusCode: number }).statusCode).toBe(422);
      expect((out.result as { message: string }).message).toMatch(/Insufficient/);
      expect(wallet.balance.cents).toBe(500n);
    });

    it("rejects withdraw that would consume reserved funds", () => {
      const wallet = makeWallet(50_000n);
      wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(40_000n),
      );
      // available = 10_000; attempt 20_000 must fail.
      const out = wallet.withdrawFunds(money(20_000n));
      expect(out.isFailure).toBe(true);
      expect(wallet.balance.cents).toBe(50_000n);
    });

    it("allows withdrawing exactly availableFunds", () => {
      const wallet = makeWallet(1_000n);
      const out = wallet.withdrawFunds(money(1_000n));
      expect(out.isSuccess).toBe(true);
      expect(wallet.balance.cents).toBe(0n);
    });
  });

  describe("reserveFunds", () => {
    it("reserves funds and adds a RESERVE operation", () => {
      const wallet = makeWallet(50_000n);
      const out = wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(5_000n),
      );
      expect(out.isSuccess).toBe(true);
      expect(wallet.reserveds.length).toBe(1);
      expect(wallet.availableFunds.cents).toBe(45_000n);
      expect(wallet.historic.at(-1)?.type.value).toBe("RESERVE");
    });

    it("rejects when amount exceeds availableFunds", () => {
      const wallet = makeWallet(1_000n);
      const out = wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(5_000n),
      );
      expect(out.isFailure).toBe(true);
      expect(wallet.reserveds.length).toBe(0);
    });

    it("rejects when reserving would exceed availableFunds due to existing reserves", () => {
      const wallet = makeWallet(10_000n);
      wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(8_000n),
      );
      const out = wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(3_000n),
      );
      expect(out.isFailure).toBe(true);
      expect(wallet.reserveds.length).toBe(1);
    });
  });

  describe("settleReservedFunds", () => {
    it("with payout: credits balance, logs WIN, removes reserve", () => {
      const wallet = makeWallet(50_000n);
      const reserveOut = wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(5_000n),
      );
      const reserve = reserveOut.result as ReserveEntity;

      const settled = wallet.settleReservedFunds(reserve.id, money(10_000n));
      expect(settled.isSuccess).toBe(true);
      expect(wallet.reserveds.length).toBe(0);
      expect(wallet.balance.cents).toBe(60_000n);
      expect(wallet.historic.some((op) => op.type.value === "WIN")).toBe(true);
    });

    it("without payout: debits reserved amount, logs LOST, removes reserve", () => {
      const wallet = makeWallet(50_000n);
      const reserveOut = wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(5_000n),
      );
      const reserve = reserveOut.result as ReserveEntity;

      const settled = wallet.settleReservedFunds(reserve.id);
      expect(settled.isSuccess).toBe(true);
      expect(wallet.reserveds.length).toBe(0);
      expect(wallet.balance.cents).toBe(45_000n);
      expect(wallet.historic.some((op) => op.type.value === "LOST")).toBe(true);
    });

    it("returns RESERVE_DOES_NOT_EXIST when id is unknown", () => {
      const wallet = makeWallet();
      const out = wallet.settleReservedFunds(IdValueObject.getDefault());
      expect(out.isFailure).toBe(true);
      expect((out.result as { statusCode: number }).statusCode).toBe(404);
    });

    it("removes only the matching reserve when multiple exist", () => {
      const wallet = makeWallet(50_000n);
      const first = wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(2_000n),
      ).result as ReserveEntity;
      const second = wallet.reserveFunds(
        IdValueObject.getDefault(),
        IdValueObject.getDefault(),
        money(3_000n),
      ).result as ReserveEntity;

      wallet.settleReservedFunds(first.id);
      expect(wallet.reserveds.length).toBe(1);
      expect(wallet.reserveds[0].id.value).toBe(second.id.value);
    });
  });
});
