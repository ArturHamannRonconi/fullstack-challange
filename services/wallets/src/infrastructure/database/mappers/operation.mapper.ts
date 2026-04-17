import {
  DateValueObject,
  IBidirectionalMapper,
  IdValueObject,
} from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { OperationEntity } from "../../../domain/entities/operation/operation.entity";
import { OperationTypeValueObject } from "../../../domain/value-objects/operation-type/operation-type.value-object";
import type { OperationType } from "../../../domain/value-objects/operation-type/operation-type.props";
import { IOperationSchema } from "../schema/wallet.schema";

class OperationMapper implements IBidirectionalMapper<IOperationSchema, OperationEntity> {
  toRightSide(leftSide: IOperationSchema): OperationEntity {
    return OperationEntity.init({
      id: IdValueObject.init({ value: leftSide.id }).result as IdValueObject,
      type: OperationTypeValueObject.init({
        value: leftSide.type as OperationType,
      }).result as OperationTypeValueObject,
      funds: MoneyValueObject.init({ value: leftSide.funds }).result as MoneyValueObject,
      createdAt: DateValueObject.init({
        value: leftSide.createdAt,
      }).result as DateValueObject,
    }).result as OperationEntity;
  }

  toLeftSide(rightSide: OperationEntity): IOperationSchema {
    return {
      id: rightSide.id.value,
      walletId: "",
      type: rightSide.type.value,
      funds: rightSide.funds.cents,
      createdAt: rightSide.createdAt.value,
    };
  }
}

export { OperationMapper };
