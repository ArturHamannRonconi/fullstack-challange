import { DateValueObject, IdValueObject, Output } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { BetEntity } from "../../../../src/domain/entities/bet/bet.entity";
import { RoundStatusEntity } from "../../../../src/domain/entities/round-status/round-status.entity";
import { RoundAggregateRoot } from "../../../../src/domain/round.aggregate-root";
import { PlayerIdValueObject } from "../../../../src/domain/value-objects/player-id/player-id.value-object";
import { RoundStatusTypeValueObject } from "../../../../src/domain/value-objects/round-status-type/round-status-type.value-object";
import { SeedValueObject } from "../../../../src/domain/value-objects/seed/seed.value-object";

/**
 * Deterministic aggregate factory for controller/repository tests. The
 * `roundId` argument is used as the nonce for provably-fair computation, so
 * the resulting crashPointScaled is reproducible across runs.
 */
export function buildRound(
  overrides: {
    id?: string;
    seed?: string;
    status?: "BETTING_OPEN" | "BETTING_CLOSED" | "ROUND_START" | "CRASHED";
    bets?: BetEntity[];
  } = {},
): RoundAggregateRoot {
  const id = IdValueObject.init({
    value: overrides.id ?? IdValueObject.getDefault().value,
  }).result as IdValueObject;

  const seed = SeedValueObject.init({
    value: overrides.seed ?? "f9c2a7b4-8d21-4c6f-9a3e-1b7d5e2f9c11",
  }).result as SeedValueObject;

  const crashPointScaled = seed.crashPointScaledFor(id.value);
  const statuses: RoundStatusEntity[] = [];

  const push = (kind: RoundStatusTypeValueObject) => {
    const out = RoundStatusEntity.init({
      id: IdValueObject.getDefault(),
      status: kind,
      statusDate: DateValueObject.getDefault(),
    });
    statuses.push(out.result as RoundStatusEntity);
  };

  push(RoundStatusTypeValueObject.bettingOpen());
  const target = overrides.status ?? "BETTING_OPEN";
  if (target === "BETTING_CLOSED" || target === "ROUND_START" || target === "CRASHED") {
    push(RoundStatusTypeValueObject.bettingClosed());
  }
  if (target === "ROUND_START" || target === "CRASHED") {
    push(RoundStatusTypeValueObject.roundStart());
  }
  if (target === "CRASHED") {
    push(RoundStatusTypeValueObject.crashed());
  }

  return RoundAggregateRoot.init({
    id,
    seed,
    crashPointScaled,
    bets: overrides.bets ?? [],
    roundStatus: statuses,
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
    startedAt: target === "ROUND_START" || target === "CRASHED"
      ? DateValueObject.getDefault()
      : undefined,
  }).result as RoundAggregateRoot;
}

export function makeBet(playerId: string, stakedCents = 1_000n): BetEntity {
  const out = BetEntity.init({
    id: IdValueObject.getDefault(),
    playerId: PlayerIdValueObject.init({ value: playerId })
      .result as PlayerIdValueObject,
    stakedAmount: MoneyValueObject.init({ value: stakedCents })
      .result as MoneyValueObject,
    username: "player",
  });
  return (out as Output<BetEntity>).result as BetEntity;
}
