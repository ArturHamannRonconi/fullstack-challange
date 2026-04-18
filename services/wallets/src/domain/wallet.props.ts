import type { IBaseDomainAggregate } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { OperationEntity } from "./entities/operation/operation.entity";
import { ReserveEntity } from "./entities/reserve/reserve.entity";
import { UserIdValueObject } from "./value-objects/user-id/user-id.value-object";

export interface IWalletProps extends IBaseDomainAggregate {
  userId: UserIdValueObject;
  balance: MoneyValueObject;
  reserveds: ReserveEntity[];
  historic: OperationEntity[];
}
