import type { DateValueObject, IBaseDomainEntity } from "ddd-tool-kit";
import type { MoneyValueObject } from "@crash/domain";

import type { OperationTypeValueObject } from "../../value-objects/operation-type/operation-type.value-object";

export interface IOperationProps extends IBaseDomainEntity {
  type: OperationTypeValueObject;
  funds: MoneyValueObject;
  createdAt: DateValueObject;
}
