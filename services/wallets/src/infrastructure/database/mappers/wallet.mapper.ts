import {
  DateValueObject,
  IBidirectionalMapper,
  IdValueObject,
} from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";
import { Injectable } from "@nestjs/common";

import { WalletAggregateRoot } from "../../../domain/wallet.aggregate-root";
import { UserIdValueObject } from "../../../domain/value-objects/user-id/user-id.value-object";
import { IWalletSchema } from "../schema/wallet.schema";
import { OperationMapper } from "./operation.mapper";
import { ReserveMapper } from "./reserve.mapper";

@Injectable()
class WalletMapper implements IBidirectionalMapper<IWalletSchema, WalletAggregateRoot> {
  constructor(
    private readonly operationMapper: OperationMapper,
    private readonly reserveMapper: ReserveMapper,
  ) {}

  toRightSide(leftSide: IWalletSchema): WalletAggregateRoot {
    return WalletAggregateRoot.init({
      id: IdValueObject.init({ value: leftSide.id }).result as IdValueObject,
      userId: UserIdValueObject.init({ value: leftSide.userId }).result as UserIdValueObject,
      balance: MoneyValueObject.init({ value: leftSide.balance }).result as MoneyValueObject,
      historic: leftSide.operations.map((op) => this.operationMapper.toRightSide(op)),
      reserveds: leftSide.reserves.map((r) => this.reserveMapper.toRightSide(r)),
      createdAt: DateValueObject.init({ value: leftSide.createdAt })
        .result as DateValueObject,
      updatedAt: DateValueObject.init({ value: leftSide.updatedAt })
        .result as DateValueObject,
    }).result as WalletAggregateRoot;
  }

  toLeftSide(rightSide: WalletAggregateRoot): IWalletSchema {
    const walletId = rightSide.id.value;
    return {
      id: walletId,
      userId: rightSide.userId.value,
      balance: rightSide.balance.cents,
      createdAt: rightSide.createdAt.value,
      updatedAt: rightSide.updatedAt.value,
      operations: rightSide.historic.map((op) => ({
        ...this.operationMapper.toLeftSide(op),
        walletId,
      })),
      reserves: rightSide.reserveds.map((r) => ({
        ...this.reserveMapper.toLeftSide(r),
        walletId,
      })),
    };
  }
}

export { WalletMapper };
