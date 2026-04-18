import { type IBidirectionalMapper, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { ReserveEntity } from "../../../domain/entities/reserve/reserve.entity";
import type { IReserveSchema } from "../schema/wallet.schema";

class ReserveMapper implements IBidirectionalMapper<IReserveSchema, ReserveEntity> {
  toRightSide(leftSide: IReserveSchema): ReserveEntity {
    return ReserveEntity.init({
      id: IdValueObject.init({ value: leftSide.id }).result as IdValueObject,
      funds: MoneyValueObject.init({ value: leftSide.funds }).result as MoneyValueObject,
      betId: IdValueObject.init({ value: leftSide.betId }).result as IdValueObject,
      roundId: IdValueObject.init({ value: leftSide.roundId }).result as IdValueObject,
    }).result as ReserveEntity;
  }

  toLeftSide(rightSide: ReserveEntity): IReserveSchema {
    return {
      id: rightSide.id.value,
      walletId: "",
      funds: rightSide.funds.cents,
      betId: rightSide.betId.value,
      roundId: rightSide.roundId.value,
      createdAt: new Date(),
    };
  }
}

export { ReserveMapper };
