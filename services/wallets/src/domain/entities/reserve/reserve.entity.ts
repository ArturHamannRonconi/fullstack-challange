import {
  Entity,
  Output,
  verifyAllPropsExists,
  verifyAreValueObjects,
} from "ddd-tool-kit";

import { INVALID_RESERVE } from "./reserve.errors";
import { IReserveProps } from "./reserve.props";

class ReserveEntity extends Entity<IReserveProps> {
  private constructor(props: IReserveProps) {
    super(props);
  }

  get funds() {
    return this.props.funds;
  }

  get betId() {
    return this.props.betId;
  }

  get roundId() {
    return this.props.roundId;
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    const valueObjects = ["funds", "betId", "roundId"];
    valueObjects.push(...this.defaultValueObjects);
    const requiredProps = [...valueObjects];

    const allPropsExists = verifyAllPropsExists(requiredProps, this);
    const areValueObjects = verifyAreValueObjects(valueObjects, this);

    return allPropsExists && areValueObjects;
  }

  static init(props: IReserveProps) {
    const reserve = new ReserveEntity(props);
    if (!reserve.isValidProps()) return Output.fail(INVALID_RESERVE);
    return Output.success(reserve);
  }
}

export { ReserveEntity };
