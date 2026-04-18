import { Injectable } from "@nestjs/common";
import {
  DateValueObject,
  type IBidirectionalMapper,
  IdValueObject,
} from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { BetEntity } from "../../../domain/entities/bet/bet.entity";
import { CashOutPointValueObject } from "../../../domain/value-objects/cash-out-point/cash-out-point.value-object";
import { PlayerIdValueObject } from "../../../domain/value-objects/player-id/player-id.value-object";
import type { IBetSchema } from "../schema/round.schema";

@Injectable()
export class BetMapper implements IBidirectionalMapper<IBetSchema, BetEntity> {
  toRightSide(leftSide: IBetSchema): BetEntity {
    const cashOutPoint = leftSide.cashOutPointScaled
      ? (CashOutPointValueObject.init({ value: leftSide.cashOutPointScaled })
          .result as CashOutPointValueObject)
      : undefined;

    return BetEntity.init({
      id: IdValueObject.init({ value: leftSide.id }).result as IdValueObject,
      playerId: PlayerIdValueObject.init({ value: leftSide.playerId })
        .result as PlayerIdValueObject,
      stakedAmount: MoneyValueObject.init({ value: leftSide.stakedAmount })
        .result as MoneyValueObject,
      username: leftSide.username ?? undefined,
      cashOutPoint,
      createdAt: DateValueObject.init({ value: leftSide.createdAt })
        .result as DateValueObject,
      updatedAt: DateValueObject.init({ value: leftSide.updatedAt })
        .result as DateValueObject,
    }).result as BetEntity;
  }

  toLeftSide(rightSide: BetEntity): IBetSchema {
    return {
      id: rightSide.id.value,
      roundId: "",
      playerId: rightSide.playerId.value,
      username: rightSide.username ?? null,
      stakedAmount: rightSide.stakedAmount.cents,
      cashOutPointScaled: rightSide.cashOutPoint?.scaled ?? null,
      createdAt: rightSide.createdAt.value,
      updatedAt: rightSide.updatedAt.value,
    };
  }
}
