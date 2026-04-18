import { BetEntity } from "../../../domain/entities/bet/bet.entity";
import { RoundAggregateRoot } from "../../../domain/round.aggregate-root";

export interface MyBetView {
  round: RoundAggregateRoot;
  bet: BetEntity;
}

export interface IGetMyBetsOutput {
  items: MyBetView[];
  total: number;
  page: number;
  perPage: number;
}
