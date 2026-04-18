import { BetEntity } from "../../../domain/entities/bet/bet.entity";
import { RoundAggregateRoot } from "../../../domain/round.aggregate-root";

export interface IPlaceBetOutput {
  bet: BetEntity;
  round: RoundAggregateRoot;
  balanceCents: string;
  availableCents: string;
}
