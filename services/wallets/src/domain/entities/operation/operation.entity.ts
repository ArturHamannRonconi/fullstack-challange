import {
  Entity,
  Output,
  verifyAllPropsExists,
  verifyAreValueObjects,
} from "ddd-tool-kit";

import { INVALID_OPERATION } from "./operation.errors";
import type { IOperationProps } from "./operation.props";

class OperationEntity extends Entity<IOperationProps> {
  private constructor(props: IOperationProps) {
    super(props);
  }

  get type() {
    return this.props.type;
  }

  get funds() {
    return this.props.funds;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    const valueObjects = ["type", "funds", "createdAt"];
    valueObjects.push(...this.defaultValueObjects);
    const requiredProps = [...valueObjects];

    const allPropsExists = verifyAllPropsExists(requiredProps, this);
    const areValueObjects = verifyAreValueObjects(valueObjects, this);

    return allPropsExists && areValueObjects;
  }

  static init(props: IOperationProps) {
    const op = new OperationEntity(props);
    if (!op.isValidProps()) return Output.fail(INVALID_OPERATION);
    return Output.success(op);
  }
}

export { OperationEntity };
