import { RoundAggregateRoot } from "../../../domain/round.aggregate-root";

export interface IGetCurrentRoundOutput {
  round: RoundAggregateRoot | null;
}
