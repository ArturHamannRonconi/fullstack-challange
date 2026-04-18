import type { IBaseDomainAggregate } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { CashOutPointValueObject } from "../../value-objects/cash-out-point/cash-out-point.value-object";
import { PlayerIdValueObject } from "../../value-objects/player-id/player-id.value-object";

export interface IBetProps extends IBaseDomainAggregate {
  playerId: PlayerIdValueObject;
  stakedAmount: MoneyValueObject;
  /** Optional username snapshot for WS/history display. */
  username?: string;
  cashOutPoint?: CashOutPointValueObject;
}
