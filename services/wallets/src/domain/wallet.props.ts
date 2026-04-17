import type { IBaseDomainAggregate } from "ddd-tool-kit";
import type { MoneyValueObject } from "@crash/domain";

import type { OperationEntity } from "./entities/operation/operation.entity";
import type { ReserveEntity } from "./entities/reserve/reserve.entity";
import type { UserIdValueObject } from "./value-objects/user-id/user-id.value-object";

export interface IWalletProps extends IBaseDomainAggregate {
  userId: UserIdValueObject;
  balance: MoneyValueObject;
  reserveds: ReserveEntity[];
  historic: OperationEntity[];
}
