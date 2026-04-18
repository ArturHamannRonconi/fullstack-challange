import { DateValueObject, type IBaseDomainEntity } from "ddd-tool-kit";

import { RoundStatusTypeValueObject } from "../../value-objects/round-status-type/round-status-type.value-object";

export interface IRoundStatusProps extends IBaseDomainEntity {
  status: RoundStatusTypeValueObject;
  statusDate: DateValueObject;
}
