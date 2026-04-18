import {
  Aggregate,
  DateValueObject,
  type IError,
  IdValueObject,
  Output,
  verifyAllPropsExists,
  verifyAreValueObjects,
} from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { BetEntity } from "./entities/bet/bet.entity";
import { RoundStatusEntity } from "./entities/round-status/round-status.entity";
import { CashOutPointValueObject } from "./value-objects/cash-out-point/cash-out-point.value-object";
import { PlayerIdValueObject } from "./value-objects/player-id/player-id.value-object";
import { RoundStatusTypeValueObject } from "./value-objects/round-status-type/round-status-type.value-object";
import { SeedValueObject } from "./value-objects/seed/seed.value-object";
import type { IRoundProps } from "./round.props";
import {
  BET_NOT_FOUND,
  INVALID_ROUND,
  PLAYER_ALREADY_BET,
  ROUND_ALREADY_CRASHED,
  ROUND_NOT_BETTING_OPEN,
  ROUND_NOT_RUNNING,
} from "./round.errors";

class RoundAggregateRoot extends Aggregate<IRoundProps> {
  private constructor(props: IRoundProps) {
    super(props);
  }

  get seed() {
    return this.props.seed;
  }

  get crashPointScaled() {
    return this.props.crashPointScaled;
  }

  get startedAt() {
    return this.props.startedAt;
  }

  get bets() {
    return this.props.bets;
  }

  get roundStatus() {
    return this.props.roundStatus;
  }

  get currentStatus(): RoundStatusTypeValueObject | undefined {
    if (this.props.roundStatus.length === 0) return undefined;
    return this.props.roundStatus[this.props.roundStatus.length - 1].status;
  }

  get isBettingOpen(): boolean {
    return this.currentStatus?.value === "BETTING_OPEN";
  }

  get isRunning(): boolean {
    return this.currentStatus?.value === "ROUND_START";
  }

  get isCrashed(): boolean {
    return this.currentStatus?.value === "CRASHED";
  }

  hasBetFromPlayer(playerId: PlayerIdValueObject): boolean {
    return this.props.bets.some((b) => b.playerId.equals(playerId));
  }

  findBetByPlayer(playerId: PlayerIdValueObject): BetEntity | undefined {
    return this.props.bets.find((b) => b.playerId.equals(playerId));
  }

  transitionTo(next: RoundStatusTypeValueObject): Output<void | IError> {
    const statusOut = RoundStatusEntity.init({
      id: IdValueObject.getDefault(),
      status: next,
      statusDate: DateValueObject.getDefault(),
    });
    if (statusOut.isFailure) return Output.fail(statusOut.result as IError);
    this.props.roundStatus.push(statusOut.result as RoundStatusEntity);
    this.touchUpdatedAt();
    return Output.success();
  }

  openBetting(): Output<void | IError> {
    return this.transitionTo(RoundStatusTypeValueObject.bettingOpen());
  }

  closeBetting(): Output<void | IError> {
    return this.transitionTo(RoundStatusTypeValueObject.bettingClosed());
  }

  startRunning(startedAtMs: number): Output<void | IError> {
    const date = DateValueObject.init({ value: new Date(startedAtMs) });
    if (date.isFailure) return Output.fail(date.result as IError);
    this.props.startedAt = date.result as DateValueObject;
    return this.transitionTo(RoundStatusTypeValueObject.roundStart());
  }

  crash(): Output<void | IError> {
    if (this.isCrashed) return Output.fail(ROUND_ALREADY_CRASHED);
    return this.transitionTo(RoundStatusTypeValueObject.crashed());
  }

  placeBet(input: {
    playerId: PlayerIdValueObject;
    stakedAmount: MoneyValueObject;
    username?: string;
  }): Output<BetEntity | IError> {
    if (!this.isBettingOpen) return Output.fail(ROUND_NOT_BETTING_OPEN);
    if (this.hasBetFromPlayer(input.playerId)) return Output.fail(PLAYER_ALREADY_BET);

    const betOut = BetEntity.init({
      id: IdValueObject.getDefault(),
      playerId: input.playerId,
      stakedAmount: input.stakedAmount,
      username: input.username,
    });
    if (betOut.isFailure) return Output.fail(betOut.result as IError);

    const bet = betOut.result as BetEntity;
    this.props.bets.push(bet);
    this.touchUpdatedAt();
    return Output.success(bet);
  }

  cashOutBetFor(
    playerId: PlayerIdValueObject,
    multiplierScaled: bigint,
  ): Output<{ bet: BetEntity; cashOutPoint: CashOutPointValueObject } | IError> {
    if (!this.isRunning) return Output.fail(ROUND_NOT_RUNNING);

    const bet = this.findBetByPlayer(playerId);
    if (!bet) return Output.fail(BET_NOT_FOUND);

    const cashed = bet.cashOut(multiplierScaled);
    if (cashed.isFailure) return Output.fail(cashed.result as IError);

    this.touchUpdatedAt();
    return Output.success({
      bet,
      cashOutPoint: cashed.result as CashOutPointValueObject,
    });
  }

  private touchUpdatedAt() {
    const next = DateValueObject.init({ value: new Date() });
    if (next.isSuccess) this.props.updatedAt = next.result as DateValueObject;
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    const valueObjects = ["seed"];
    valueObjects.push(...this.defaultValueObjects);

    const requiredProps = [...valueObjects, "bets", "roundStatus", "crashPointScaled"];
    const allPropsExists = verifyAllPropsExists(requiredProps, this);
    const areValueObjects = verifyAreValueObjects(valueObjects, this);

    const betsIsArray = Array.isArray(this.props.bets);
    const statusIsArray = Array.isArray(this.props.roundStatus);
    const crashPointValid =
      typeof this.props.crashPointScaled === "number" &&
      this.props.crashPointScaled >= 100;

    return allPropsExists && areValueObjects && betsIsArray && statusIsArray && crashPointValid;
  }

  static init(props: IRoundProps) {
    const round = new RoundAggregateRoot(props);
    if (!round.isValidProps()) return Output.fail(INVALID_ROUND);
    return Output.success(round);
  }

  /**
   * Factory for a brand-new round that opens betting immediately. Seed is
   * fresh; crash point is deterministic from (seed, roundId) via
   * `@crash/provably-fair`.
   */
  static create(): Output<RoundAggregateRoot | IError> {
    const id = IdValueObject.getDefault();
    const seed = SeedValueObject.generate();
    const crashPointScaled = seed.crashPointScaledFor(id.value);

    const statusOut = RoundStatusEntity.init({
      id: IdValueObject.getDefault(),
      status: RoundStatusTypeValueObject.bettingOpen(),
      statusDate: DateValueObject.getDefault(),
    });
    if (statusOut.isFailure) return Output.fail(statusOut.result as IError);

    return RoundAggregateRoot.init({
      id,
      seed,
      crashPointScaled,
      bets: [],
      roundStatus: [statusOut.result as RoundStatusEntity],
    });
  }
}

export { RoundAggregateRoot };
