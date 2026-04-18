import { Output, ValueObject } from "ddd-tool-kit";

import { INVALID_ROUND_STATUS_TYPE } from "./round-status-type.errors";
import {
  type IRoundStatusTypeProps,
  ROUND_STATUS_TYPES,
  type RoundStatusType,
} from "./round-status-type.props";

class RoundStatusTypeValueObject extends ValueObject<IRoundStatusTypeProps> {
  private constructor(props: IRoundStatusTypeProps) {
    super(props);
  }

  get value(): RoundStatusType {
    return this.props.value;
  }

  equals(other: RoundStatusTypeValueObject): boolean {
    return this.value === other.value;
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    return ROUND_STATUS_TYPES.includes(this.props.value);
  }

  static init(props: IRoundStatusTypeProps) {
    const status = new RoundStatusTypeValueObject(props);
    if (!status.isValidProps()) return Output.fail(INVALID_ROUND_STATUS_TYPE);
    return Output.success(status);
  }

  static bettingOpen() {
    return RoundStatusTypeValueObject.init({ value: "BETTING_OPEN" })
      .result as RoundStatusTypeValueObject;
  }

  static bettingClosed() {
    return RoundStatusTypeValueObject.init({ value: "BETTING_CLOSED" })
      .result as RoundStatusTypeValueObject;
  }

  static roundStart() {
    return RoundStatusTypeValueObject.init({ value: "ROUND_START" })
      .result as RoundStatusTypeValueObject;
  }

  static crashed() {
    return RoundStatusTypeValueObject.init({ value: "CRASHED" })
      .result as RoundStatusTypeValueObject;
  }
}

export { RoundStatusTypeValueObject };
