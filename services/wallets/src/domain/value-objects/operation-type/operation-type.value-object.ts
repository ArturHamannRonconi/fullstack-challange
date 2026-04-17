import { Output, ValueObject } from "ddd-tool-kit";

import { INVALID_OPERATION_TYPE } from "./operation-type.errors";
import { IOperationTypeProps, OPERATION_TYPES, OperationType } from "./operation-type.props";

class OperationTypeValueObject extends ValueObject<IOperationTypeProps> {
  private constructor(props: IOperationTypeProps) {
    super(props);
  }

  get value(): OperationType {
    return this.props.value;
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    return OPERATION_TYPES.includes(this.props.value);
  }

  static init(props: IOperationTypeProps) {
    const type = new OperationTypeValueObject(props);
    if (!type.isValidProps()) return Output.fail(INVALID_OPERATION_TYPE);
    return Output.success(type);
  }

  static deposit() {
    return OperationTypeValueObject.init({ value: "DEPOSIT" }).result as OperationTypeValueObject;
  }

  static withdraw() {
    return OperationTypeValueObject.init({ value: "WITHDRAW" }).result as OperationTypeValueObject;
  }

  static reserve() {
    return OperationTypeValueObject.init({ value: "RESERVE" }).result as OperationTypeValueObject;
  }

  static lost() {
    return OperationTypeValueObject.init({ value: "LOST" }).result as OperationTypeValueObject;
  }

  static win() {
    return OperationTypeValueObject.init({ value: "WIN" }).result as OperationTypeValueObject;
  }
}

export { OperationTypeValueObject };
