import {
  Entity,
  Output,
  verifyAllPropsExists,
  verifyAreValueObjects,
} from "ddd-tool-kit";

import { INVALID_ROUND_STATUS } from "./round-status.errors";
import type { IRoundStatusProps } from "./round-status.props";

class RoundStatusEntity extends Entity<IRoundStatusProps> {
  private constructor(props: IRoundStatusProps) {
    super(props);
  }

  get status() {
    return this.props.status;
  }

  get statusDate() {
    return this.props.statusDate;
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    const valueObjects = ["status", "statusDate"];
    valueObjects.push(...this.defaultValueObjects);

    const allPropsExists = verifyAllPropsExists(valueObjects, this);
    const areValueObjects = verifyAreValueObjects(valueObjects, this);

    return allPropsExists && areValueObjects;
  }

  static init(props: IRoundStatusProps) {
    const status = new RoundStatusEntity(props);
    if (!status.isValidProps()) return Output.fail(INVALID_ROUND_STATUS);
    return Output.success(status);
  }
}

export { RoundStatusEntity };
