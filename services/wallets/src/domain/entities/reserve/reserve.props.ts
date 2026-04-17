import type { IBaseDomainEntity, IdValueObject } from "ddd-tool-kit";
import type { MoneyValueObject } from "@crash/domain";

export interface IReserveProps extends IBaseDomainEntity {
  funds: MoneyValueObject;
  betId: IdValueObject;
  roundId: IdValueObject;
}
