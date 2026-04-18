import { Output, ValueObject } from "ddd-tool-kit";
import {
  computeCrashPointScaled,
  computeSeedHash,
  generateServerSeed,
  verifyCrashPoint,
} from "@crash/provably-fair";

import { INVALID_SEED } from "./seed.errors";
import type { ISeedProps } from "./seed.props";

class SeedValueObject extends ValueObject<ISeedProps> {
  private constructor(props: ISeedProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  get hash(): string {
    return computeSeedHash(this.props.value);
  }

  /**
   * Scaled crash point (× 100) for the given `nonce` (typically `roundId`).
   * Delegates to `@crash/provably-fair` so the same function used here also
   * runs in the frontend verifier.
   */
  crashPointScaledFor(nonce: string | number): number {
    return computeCrashPointScaled(this.props.value, nonce);
  }

  verify(nonce: string | number, expectedScaled: number): boolean {
    return verifyCrashPoint(this.props.value, nonce, expectedScaled);
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    return typeof this.props.value === "string" && this.props.value.length > 0;
  }

  static init(props: ISeedProps) {
    const seed = new SeedValueObject(props);
    if (!seed.isValidProps()) return Output.fail(INVALID_SEED);
    return Output.success(seed);
  }

  static generate(): SeedValueObject {
    return SeedValueObject.init({ value: generateServerSeed() })
      .result as SeedValueObject;
  }
}

export { SeedValueObject };
