import { BetEntity } from "../../../domain/entities/bet/bet.entity";
import { RoundAggregateRoot } from "../../../domain/round.aggregate-root";

export interface ICashoutOutput {
  bet: BetEntity;
  round: RoundAggregateRoot;
  multiplierScaled: bigint;
  totalPayoutCents: string;
  netProfitCents: string;
}
