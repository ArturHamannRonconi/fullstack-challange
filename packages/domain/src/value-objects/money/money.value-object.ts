import { Output, ValueObject } from "ddd-tool-kit";

import { INVALID_MONEY, NEGATIVE_MONEY_RESULT } from "./money.errors";
import { IMoneyProps } from "./money.props";

class MoneyValueObject extends ValueObject<IMoneyProps> {
  private static readonly MULTIPLIER_SCALE = 10_000n;

  private constructor(props: IMoneyProps) {
    super(props);
  }

  get value(): bigint {
    return this.props.value;
  }

  get cents(): bigint {
    return this.props.value;
  }

  add(other: MoneyValueObject) {
    return MoneyValueObject.init({ value: this.value + other.value });
  }

  subtract(other: MoneyValueObject) {
    const result = this.value - other.value;
    if (result < 0n) return Output.fail(NEGATIVE_MONEY_RESULT);
    return MoneyValueObject.init({ value: result });
  }

  multiplyByScaledMultiplier(
    scaledMultiplier: bigint,
    scale: bigint = MoneyValueObject.MULTIPLIER_SCALE,
  ) {
    const result = (this.value * scaledMultiplier) / scale;
    return MoneyValueObject.init({ value: result });
  }

  compareTo(other: MoneyValueObject): -1 | 0 | 1 {
    if (this.value < other.value) return -1;
    if (this.value > other.value) return 1;
    return 0;
  }

  isGreaterThanOrEqual(other: MoneyValueObject): boolean {
    return this.value >= other.value;
  }

  isGreaterThan(other: MoneyValueObject): boolean {
    return this.value > other.value;
  }

  isLessThanOrEqual(other: MoneyValueObject): boolean {
    return this.value <= other.value;
  }

  isZero(): boolean {
    return this.value === 0n;
  }

  toCents(): bigint {
    return this.value;
  }

  toCentsString(): string {
    return this.value.toString();
  }

  toBRL(): string {
    const asNumber = Number(this.value) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(asNumber);
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    if (typeof this.props.value !== "bigint") return false;
    if (this.props.value < 0n) return false;
    return true;
  }

  static init(props: IMoneyProps) {
    const money = new MoneyValueObject(props);
    const isInvalidProps = !money.isValidProps();
    if (isInvalidProps) return Output.fail(INVALID_MONEY);
    return Output.success(money);
  }

  static zero(): MoneyValueObject {
    return MoneyValueObject.init({ value: 0n }).result as MoneyValueObject;
  }

  static fromCents(cents: bigint | number | string): ReturnType<typeof MoneyValueObject.init> {
    try {
      const asBigInt =
        typeof cents === "bigint"
          ? cents
          : typeof cents === "number"
            ? BigInt(Math.trunc(cents))
            : BigInt(cents);
      return MoneyValueObject.init({ value: asBigInt });
    } catch {
      return Output.fail(INVALID_MONEY);
    }
  }
}

export { MoneyValueObject };
