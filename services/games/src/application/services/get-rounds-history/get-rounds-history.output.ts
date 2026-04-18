import { RoundAggregateRoot } from "../../../domain/round.aggregate-root";

export interface IGetRoundsHistoryOutput {
  items: RoundAggregateRoot[];
  total: number;
  page: number;
  perPage: number;
}
