import { DateValueObject, type IBaseDomainAggregate } from "ddd-tool-kit";

import { BetEntity } from "./entities/bet/bet.entity";
import { RoundStatusEntity } from "./entities/round-status/round-status.entity";
import { SeedValueObject } from "./value-objects/seed/seed.value-object";

export interface IRoundProps extends IBaseDomainAggregate {
  seed: SeedValueObject;
  /** Crash point scaled × 100 (see `@crash/provably-fair`). */
  crashPointScaled: number;
  startedAt?: DateValueObject;
  bets: BetEntity[];
  roundStatus: RoundStatusEntity[];
}
