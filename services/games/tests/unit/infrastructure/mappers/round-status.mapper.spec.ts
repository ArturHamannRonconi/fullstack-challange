import { describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";

import { RoundStatusEntity } from "../../../../src/domain/entities/round-status/round-status.entity";
import { RoundStatusTypeValueObject } from "../../../../src/domain/value-objects/round-status-type/round-status-type.value-object";
import { RoundStatusMapper } from "../../../../src/infrastructure/database/mappers/round-status.mapper";
import type { IRoundStatusSchema } from "../../../../src/infrastructure/database/schema/round.schema";

const DATE = new Date("2026-01-01T00:00:00.000Z");

function schema(overrides: Partial<IRoundStatusSchema> = {}): IRoundStatusSchema {
  return {
    id: IdValueObject.getDefault().value,
    roundId: IdValueObject.getDefault().value,
    status: "BETTING_OPEN",
    statusDate: DATE,
    ...overrides,
  };
}

describe("RoundStatusMapper", () => {
  const mapper = new RoundStatusMapper();

  it("maps the four valid status values into the entity", () => {
    for (const status of ["BETTING_OPEN", "BETTING_CLOSED", "ROUND_START", "CRASHED"] as const) {
      const entity = mapper.toRightSide(schema({ status }));
      expect(entity.status.value).toBe(status);
    }
  });

  it("converts schema Date → DateValueObject on toRightSide", () => {
    const entity = mapper.toRightSide(schema());
    expect(entity.statusDate).toBeInstanceOf(DateValueObject);
    expect(entity.statusDate.value.getTime()).toBe(DATE.getTime());
  });

  it("toLeftSide blanks the roundId (round mapper will fill it)", () => {
    const entity = RoundStatusEntity.init({
      id: IdValueObject.getDefault(),
      status: RoundStatusTypeValueObject.crashed(),
      statusDate: DateValueObject.init({ value: DATE }).result as DateValueObject,
    }).result as RoundStatusEntity;

    const row = mapper.toLeftSide(entity);
    expect(row.roundId).toBe("");
    expect(row.status).toBe("CRASHED");
    expect(row.statusDate.getTime()).toBe(DATE.getTime());
  });

  it("round-trips faithfully", () => {
    const row = schema({ status: "ROUND_START" });
    const back = mapper.toLeftSide(mapper.toRightSide(row));
    expect(back.status).toBe("ROUND_START");
    expect(back.statusDate.getTime()).toBe(DATE.getTime());
  });
});
