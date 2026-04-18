import { describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { BetEntity } from "../../../../src/domain/entities/bet/bet.entity";
import { CashOutPointValueObject } from "../../../../src/domain/value-objects/cash-out-point/cash-out-point.value-object";
import { PlayerIdValueObject } from "../../../../src/domain/value-objects/player-id/player-id.value-object";
import {
  RoundResponseMapper,
  toBetDto,
} from "../../../../src/presentation/mappers/round-response.mapper";
import { buildRound, makeBet } from "../../../integration/controllers/helpers/round-factory";

describe("toBetDto", () => {
  it("serializes BigInt fields as strings and isCashedOut=false when no cashout", () => {
    const bet = BetEntity.init({
      id: IdValueObject.getDefault(),
      playerId: PlayerIdValueObject.init({ value: "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42" })
        .result as PlayerIdValueObject,
      stakedAmount: MoneyValueObject.init({ value: 1_234n }).result as MoneyValueObject,
      username: "alice",
    }).result as BetEntity;

    const dto = toBetDto(bet);
    expect(dto.stakedAmountCents).toBe("1234");
    expect(dto.cashOutPointScaled).toBeUndefined();
    expect(dto.isCashedOut).toBe(false);
    expect(dto.username).toBe("alice");
    expect(typeof dto.createdAt).toBe("string");
  });

  it("serializes cashOutPointScaled as a string when present", () => {
    const bet = BetEntity.init({
      id: IdValueObject.getDefault(),
      playerId: PlayerIdValueObject.init({ value: "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42" })
        .result as PlayerIdValueObject,
      stakedAmount: MoneyValueObject.init({ value: 1_000n }).result as MoneyValueObject,
      username: "alice",
      cashOutPoint: CashOutPointValueObject.init({ value: 25_000n })
        .result as CashOutPointValueObject,
      createdAt: DateValueObject.getDefault(),
      updatedAt: DateValueObject.getDefault(),
    }).result as BetEntity;

    const dto = toBetDto(bet);
    expect(dto.cashOutPointScaled).toBe("25000");
    expect(dto.isCashedOut).toBe(true);
  });
});

describe("RoundResponseMapper.toRightSide", () => {
  const mapper = new RoundResponseMapper();

  it("exposes seedHash but NOT serverSeed when round is not crashed", () => {
    const round = buildRound({ status: "BETTING_OPEN" });
    const dto = mapper.toRightSide(round);
    expect(dto.seedHash).toBe(round.seed.hash);
    expect(dto.serverSeed).toBeUndefined();
  });

  it("exposes serverSeed only after the round has crashed", () => {
    const round = buildRound({ status: "CRASHED" });
    const dto = mapper.toRightSide(round);
    expect(dto.serverSeed).toBe(round.seed.value);
    expect(dto.seedHash).toBe(round.seed.hash);
  });

  it("includes statusHistory in transition order with ISO dates", () => {
    const round = buildRound({ status: "CRASHED" });
    const dto = mapper.toRightSide(round);
    expect(dto.statusHistory.map((s) => s.status)).toEqual([
      "BETTING_OPEN",
      "BETTING_CLOSED",
      "ROUND_START",
      "CRASHED",
    ]);
    expect(dto.statusHistory[0].statusDate).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("includes currentStatus derived from the last entry of statusHistory", () => {
    const round = buildRound({ status: "ROUND_START" });
    const dto = mapper.toRightSide(round);
    expect(dto.currentStatus).toBe("ROUND_START");
  });

  it("maps bets through toBetDto", () => {
    const round = buildRound({ status: "BETTING_OPEN" });
    round.bets.push(makeBet("3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42"));
    const dto = mapper.toRightSide(round);
    expect(dto.bets).toHaveLength(1);
    expect(dto.bets[0].playerId).toBe("3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42");
    expect(dto.bets[0].stakedAmountCents).toBe("1000");
  });

  it("returns startedAtMs only when startedAt is set", () => {
    const open = buildRound({ status: "BETTING_OPEN" });
    expect(mapper.toRightSide(open).startedAtMs).toBeUndefined();

    const running = buildRound({ status: "ROUND_START" });
    expect(typeof mapper.toRightSide(running).startedAtMs).toBe("number");
  });
});
