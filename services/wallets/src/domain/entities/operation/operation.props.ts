import { DateValueObject, type IBaseDomainEntity } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { OperationTypeValueObject } from "../../value-objects/operation-type/operation-type.value-object";

export interface IOperationProps extends IBaseDomainEntity {
  type: OperationTypeValueObject;
  funds: MoneyValueObject;
  createdAt: DateValueObject;
}
