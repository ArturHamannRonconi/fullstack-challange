import { type IBaseDomainEntity, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

export interface IReserveProps extends IBaseDomainEntity {
  funds: MoneyValueObject;
  betId: IdValueObject;
  roundId: IdValueObject;
}
