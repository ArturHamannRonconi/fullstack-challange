import { Output, ValueObject } from "ddd-tool-kit";

import { INVALID_PLAYER_ID } from "./player-id.errors";
import type { IPlayerIdProps } from "./player-id.props";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class PlayerIdValueObject extends ValueObject<IPlayerIdProps> {
  private constructor(props: IPlayerIdProps) {
    super(props);
  }

  equals(other: PlayerIdValueObject): boolean {
    return this.value === other.value;
  }

  protected sanitizeProps(): void {
    this.props.value = this.props.value?.trim().toLowerCase();
  }

  protected isValidProps(): boolean {
    return typeof this.props.value === "string" && UUID_PATTERN.test(this.props.value);
  }

  static init(props: IPlayerIdProps) {
    const playerId = new PlayerIdValueObject(props);
    if (!playerId.isValidProps()) return Output.fail(INVALID_PLAYER_ID);
    return Output.success(playerId);
  }
}

export { PlayerIdValueObject };
