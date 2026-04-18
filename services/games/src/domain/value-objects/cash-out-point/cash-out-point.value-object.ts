import { Output, ValueObject } from "ddd-tool-kit";
import { MULTIPLIER_SCALE } from "@crash/game";

import { INVALID_CASH_OUT_POINT } from "./cash-out-point.errors";
import type { ICashOutPointProps } from "./cash-out-point.props";

class CashOutPointValueObject extends ValueObject<ICashOutPointProps> {
  private constructor(props: ICashOutPointProps) {
    super(props);
  }

  get value(): bigint {
    return this.props.value;
  }

  get scaled(): bigint {
    return this.props.value;
  }

  toDecimal(): number {
    return Number(this.props.value) / Number(MULTIPLIER_SCALE);
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    if (typeof this.props.value !== "bigint") return false;
    return this.props.value >= MULTIPLIER_SCALE;
  }

  static init(props: ICashOutPointProps) {
    const point = new CashOutPointValueObject(props);
    if (!point.isValidProps()) return Output.fail(INVALID_CASH_OUT_POINT);
    return Output.success(point);
  }
}

export { CashOutPointValueObject };
