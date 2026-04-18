import {
  Aggregate,
  DateValueObject,
  type IError,
  Output,
  verifyAllPropsExists,
  verifyAreValueObjects,
} from "ddd-tool-kit";
import { MULTIPLIER_SCALE, MIN_BET_CENTS, MAX_BET_CENTS } from "@crash/game";
import { MoneyValueObject } from "@crash/domain";

import { CashOutPointValueObject } from "../../value-objects/cash-out-point/cash-out-point.value-object";
import {
  BET_ALREADY_CASHED_OUT,
  BET_OUT_OF_RANGE,
  INVALID_BET,
} from "./bet.errors";
import type { IBetProps } from "./bet.props";

class BetEntity extends Aggregate<IBetProps> {
  private constructor(props: IBetProps) {
    super(props);
  }

  get playerId() {
    return this.props.playerId;
  }

  get stakedAmount() {
    return this.props.stakedAmount;
  }

  get username() {
    return this.props.username;
  }

  get cashOutPoint() {
    return this.props.cashOutPoint;
  }

  get isCashedOut(): boolean {
    return !!this.props.cashOutPoint;
  }

  cashOut(multiplierScaled: bigint): Output<CashOutPointValueObject | IError> {
    if (this.isCashedOut) return Output.fail(BET_ALREADY_CASHED_OUT);

    const point = CashOutPointValueObject.init({ value: multiplierScaled });
    if (point.isFailure) return Output.fail(point.result as IError);

    this.props.cashOutPoint = point.result as CashOutPointValueObject;
    const next = DateValueObject.init({ value: new Date() });
    if (next.isSuccess) this.props.updatedAt = next.result as DateValueObject;
    return Output.success(this.props.cashOutPoint);
  }

  /**
   * Total return cents = staked × multiplier / 10_000. Truncates (favor house).
   */
  computeTotalPayout(multiplierScaled: bigint): MoneyValueObject {
    const payout = this.props.stakedAmount.multiplyByScaledMultiplier(
      multiplierScaled,
      MULTIPLIER_SCALE,
    );
    return payout.result as MoneyValueObject;
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    const valueObjects = ["playerId", "stakedAmount"];
    valueObjects.push(...this.defaultValueObjects);

    const allPropsExists = verifyAllPropsExists(valueObjects, this);
    const areValueObjects = verifyAreValueObjects(valueObjects, this);

    return allPropsExists && areValueObjects;
  }

  static init(props: IBetProps): Output<BetEntity | IError> {
    const bet = new BetEntity(props);
    if (!bet.isValidProps()) return Output.fail(INVALID_BET);
    const cents = props.stakedAmount.cents;
    if (cents < MIN_BET_CENTS || cents > MAX_BET_CENTS) {
      return Output.fail(BET_OUT_OF_RANGE);
    }
    return Output.success(bet);
  }
}

export { BetEntity };
