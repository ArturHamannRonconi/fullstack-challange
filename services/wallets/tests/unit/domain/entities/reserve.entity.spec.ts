import { describe, expect, it } from "bun:test";
import { IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { ReserveEntity } from "../../../../src/domain/entities/reserve/reserve.entity";

function validProps(overrides: Partial<{
  id: IdValueObject;
  funds: MoneyValueObject;
  betId: IdValueObject;
  roundId: IdValueObject;
}> = {}) {
  return {
    id: overrides.id ?? IdValueObject.getDefault(),
    funds:
      overrides.funds ??
      (MoneyValueObject.init({ value: 1_000n }).result as MoneyValueObject),
    betId: overrides.betId ?? IdValueObject.getDefault(),
    roundId: overrides.roundId ?? IdValueObject.getDefault(),
  };
}

describe("ReserveEntity", () => {
  describe("init", () => {
    it("creates a reserve with valid props", () => {
      const out = ReserveEntity.init(validProps());
      expect(out.isSuccess).toBe(true);
    });

    it("auto-generates id when absent", () => {
      const { id: _drop, ...rest } = validProps();
      const out = ReserveEntity.init(rest);
      expect(out.isSuccess).toBe(true);
      expect((out.result as ReserveEntity).id).toBeInstanceOf(IdValueObject);
    });

    it("fails when funds missing", () => {
      const out = ReserveEntity.init({
        id: IdValueObject.getDefault(),
        betId: IdValueObject.getDefault(),
        roundId: IdValueObject.getDefault(),
      } as unknown as ReturnType<typeof validProps>);
      expect(out.isFailure).toBe(true);
    });

    it("fails when betId missing", () => {
      const out = ReserveEntity.init({
        id: IdValueObject.getDefault(),
        funds: MoneyValueObject.init({ value: 100n })
          .result as MoneyValueObject,
        roundId: IdValueObject.getDefault(),
      } as unknown as ReturnType<typeof validProps>);
      expect(out.isFailure).toBe(true);
    });

    it("fails when roundId missing", () => {
      const out = ReserveEntity.init({
        id: IdValueObject.getDefault(),
        funds: MoneyValueObject.init({ value: 100n })
          .result as MoneyValueObject,
        betId: IdValueObject.getDefault(),
      } as unknown as ReturnType<typeof validProps>);
      expect(out.isFailure).toBe(true);
    });

    it("fails when funds is a plain number (not a VO)", () => {
      const out = ReserveEntity.init({
        id: IdValueObject.getDefault(),
        funds: 1_000 as unknown as MoneyValueObject,
        betId: IdValueObject.getDefault(),
        roundId: IdValueObject.getDefault(),
      });
      expect(out.isFailure).toBe(true);
    });
  });

  describe("getters", () => {
    it("expose funds, betId, roundId, id", () => {
      const id = IdValueObject.getDefault();
      const betId = IdValueObject.getDefault();
      const roundId = IdValueObject.getDefault();
      const funds = MoneyValueObject.init({ value: 2_500n })
        .result as MoneyValueObject;
      const reserve = ReserveEntity.init({ id, funds, betId, roundId })
        .result as ReserveEntity;

      expect(reserve.id.value).toBe(id.value);
      expect(reserve.funds.cents).toBe(2_500n);
      expect(reserve.betId.value).toBe(betId.value);
      expect(reserve.roundId.value).toBe(roundId.value);
    });
  });

  describe("equals", () => {
    it("compares by id", () => {
      const id = IdValueObject.getDefault();
      const a = ReserveEntity.init(validProps({ id })).result as ReserveEntity;
      const b = ReserveEntity.init(validProps({ id })).result as ReserveEntity;
      expect(a.equals(b)).toBe(true);
    });

    it("different ids are not equal", () => {
      const a = ReserveEntity.init(validProps()).result as ReserveEntity;
      const b = ReserveEntity.init(validProps()).result as ReserveEntity;
      expect(a.equals(b)).toBe(false);
    });
  });
});
