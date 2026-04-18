export enum DomainEventName {
  PrepareRound = "round.prepare",
  StartRound = "round.started",
  StartGame = "round.game_start",
  BetPlaced = "bet.placed",
  CashedOut = "bet.cashed_out",
  Crashed = "round.crashed",
}