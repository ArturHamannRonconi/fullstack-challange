import { Injectable } from "@nestjs/common";
import {
  DateValueObject,
  type IBidirectionalMapper,
  IdValueObject,
} from "ddd-tool-kit";

import { RoundAggregateRoot } from "../../../domain/round.aggregate-root";
import { SeedValueObject } from "../../../domain/value-objects/seed/seed.value-object";
import type { IRoundSchema } from "../schema/round.schema";
import { BetMapper } from "./bet.mapper";
import { RoundStatusMapper } from "./round-status.mapper";

@Injectable()
export class RoundMapper implements IBidirectionalMapper<IRoundSchema, RoundAggregateRoot> {
  constructor(
    private readonly betMapper: BetMapper,
    private readonly roundStatusMapper: RoundStatusMapper,
  ) {}

  toRightSide(leftSide: IRoundSchema): RoundAggregateRoot {
    const startedAt = leftSide.startedAt
      ? (DateValueObject.init({ value: leftSide.startedAt })
          .result as DateValueObject)
      : undefined;

    return RoundAggregateRoot.init({
      id: IdValueObject.init({ value: leftSide.id }).result as IdValueObject,
      seed: SeedValueObject.init({ value: leftSide.serverSeed })
        .result as SeedValueObject,
      crashPointScaled: leftSide.crashPointScaled,
      startedAt,
      bets: leftSide.bets.map((bet) => this.betMapper.toRightSide(bet)),
      roundStatus: leftSide.statusHistory.map((status) =>
        this.roundStatusMapper.toRightSide(status),
      ),
      createdAt: DateValueObject.init({ value: leftSide.createdAt })
        .result as DateValueObject,
      updatedAt: DateValueObject.init({ value: leftSide.updatedAt })
        .result as DateValueObject,
    }).result as RoundAggregateRoot;
  }

  toLeftSide(rightSide: RoundAggregateRoot): IRoundSchema {
    const roundId = rightSide.id.value;
    return {
      id: roundId,
      serverSeed: rightSide.seed.value,
      seedHash: rightSide.seed.hash,
      crashPointScaled: rightSide.crashPointScaled,
      startedAt: rightSide.startedAt?.value ?? null,
      createdAt: rightSide.createdAt.value,
      updatedAt: rightSide.updatedAt.value,
      bets: rightSide.bets.map((bet) => ({
        ...this.betMapper.toLeftSide(bet),
        roundId,
      })),
      statusHistory: rightSide.roundStatus.map((status) => ({
        ...this.roundStatusMapper.toLeftSide(status),
        roundId,
      })),
    };
  }
}
