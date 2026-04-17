import { Output, ValueObject } from "ddd-tool-kit";

import { INVALID_USER_ID } from "./user-id.errors";
import { IUserIdProps } from "./user-id.props";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class UserIdValueObject extends ValueObject<IUserIdProps> {
  private constructor(props: IUserIdProps) {
    super(props);
  }

  equals(other: UserIdValueObject): boolean {
    return this.value === other.value;
  }

  protected sanitizeProps(): void {
    this.props.value = this.props.value?.trim().toLowerCase();
  }

  protected isValidProps(): boolean {
    return typeof this.props.value === "string" && UUID_PATTERN.test(this.props.value);
  }

  static init(props: IUserIdProps) {
    const userId = new UserIdValueObject(props);
    const isInvalidProps = !userId.isValidProps();
    if (isInvalidProps) return Output.fail(INVALID_USER_ID);
    return Output.success(userId);
  }
}

export { UserIdValueObject };
