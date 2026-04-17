import { describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { OperationEntity } from "../../../../src/domain/entities/operation/operation.entity";
import { OperationTypeValueObject } from "../../../../src/domain/value-objects/operation-type/operation-type.value-object";

function validProps(overrides: Partial<{
  id: IdValueObject;
  type: OperationTypeValueObject;
  funds: MoneyValueObject;
  createdAt: DateValueObject;
}> = {}) {
  return {
    id: overrides.id ?? IdValueObject.getDefault(),
    type: overrides.type ?? OperationTypeValueObject.deposit(),
    funds:
      overrides.funds ??
      (MoneyValueObject.init({ value: 500n }).result as MoneyValueObject),
    createdAt: overrides.createdAt ?? DateValueObject.getDefault(),
  };
}

describe("OperationEntity", () => {
  describe("init", () => {
    it("creates an entity with all valid props", () => {
      const out = OperationEntity.init(validProps());
      expect(out.isSuccess).toBe(true);
    });

    it("auto-generates an id when absent", () => {
      const { id: _discard, ...rest } = validProps();
      const out = OperationEntity.init(rest);
      expect(out.isSuccess).toBe(true);
      expect((out.result as OperationEntity).id).toBeInstanceOf(IdValueObject);
      expect((out.result as OperationEntity).id.value.length).toBe(16);
    });

    it("fails when type is missing", () => {
      const out = OperationEntity.init({
        id: IdValueObject.getDefault(),
        funds: MoneyValueObject.init({ value: 100n })
          .result as MoneyValueObject,
        createdAt: DateValueObject.getDefault(),
      } as unknown as ReturnType<typeof validProps>);
      expect(out.isFailure).toBe(true);
    });

    it("fails when funds is missing", () => {
      const out = OperationEntity.init({
        id: IdValueObject.getDefault(),
        type: OperationTypeValueObject.deposit(),
        createdAt: DateValueObject.getDefault(),
      } as unknown as ReturnType<typeof validProps>);
      expect(out.isFailure).toBe(true);
    });

    it("fails when createdAt is missing", () => {
      const out = OperationEntity.init({
        id: IdValueObject.getDefault(),
        type: OperationTypeValueObject.deposit(),
        funds: MoneyValueObject.init({ value: 100n })
          .result as MoneyValueObject,
      } as unknown as ReturnType<typeof validProps>);
      expect(out.isFailure).toBe(true);
    });

    it("fails when type is not a ValueObject", () => {
      const out = OperationEntity.init({
        id: IdValueObject.getDefault(),
        type: "DEPOSIT" as unknown as OperationTypeValueObject,
        funds: MoneyValueObject.init({ value: 100n })
          .result as MoneyValueObject,
        createdAt: DateValueObject.getDefault(),
      });
      expect(out.isFailure).toBe(true);
    });
  });

  describe("getters", () => {
    it("expose type, funds, createdAt, id", () => {
      const id = IdValueObject.getDefault();
      const type = OperationTypeValueObject.withdraw();
      const funds = MoneyValueObject.init({ value: 750n })
        .result as MoneyValueObject;
      const createdAt = DateValueObject.getDefault();
      const op = OperationEntity.init({ id, type, funds, createdAt })
        .result as OperationEntity;

      expect(op.id.equals(id)).toBe(true);
      expect(op.type.value).toBe("WITHDRAW");
      expect(op.funds.cents).toBe(750n);
      expect(op.createdAt).toBe(createdAt);
    });
  });

  describe("equals (inherited from Entity)", () => {
    it("compares by id", () => {
      const id = IdValueObject.getDefault();
      const a = OperationEntity.init(validProps({ id }))
        .result as OperationEntity;
      const b = OperationEntity.init(validProps({ id }))
        .result as OperationEntity;
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different ids", () => {
      const a = OperationEntity.init(validProps()).result as OperationEntity;
      const b = OperationEntity.init(validProps()).result as OperationEntity;
      expect(a.equals(b)).toBe(false);
    });
  });
});
