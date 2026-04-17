import {
  Aggregate,
  DateValueObject,
  IdValueObject,
  IError,
  Output,
  verifyAllPropsExists,
  verifyAreEntities,
  verifyAreValueObjects,
} from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { OperationEntity } from "./entities/operation/operation.entity";
import { ReserveEntity } from "./entities/reserve/reserve.entity";
import { OperationTypeValueObject } from "./value-objects/operation-type/operation-type.value-object";
import { IWalletProps } from "./wallet.props";
import {
  AMOUNT_OUT_OF_RANGE,
  INSUFFICIENT_FUNDS,
  INVALID_WALLET,
  RESERVE_DOES_NOT_EXIST,
} from "./wallet.errors";

const MIN_AMOUNT_CENTS = 100n;
const MAX_AMOUNT_CENTS = 100_000n;

class WalletAggregateRoot extends Aggregate<IWalletProps> {
  private constructor(props: IWalletProps) {
    super(props);
  }

  get userId() {
    return this.props.userId;
  }

  get balance() {
    return this.props.balance;
  }

  get reserveds() {
    return this.props.reserveds;
  }

  get historic() {
    return this.props.historic;
  }

  get reservedFunds(): MoneyValueObject {
    const totalCents = this.props.reserveds.reduce(
      (acc, reserve) => acc + reserve.funds.cents,
      0n,
    );
    return MoneyValueObject.init({ value: totalCents }).result as MoneyValueObject;
  }

  get availableFunds(): MoneyValueObject {
    const available = this.props.balance.cents - this.reservedFunds.cents;
    const safe = available < 0n ? 0n : available;
    return MoneyValueObject.init({ value: safe }).result as MoneyValueObject;
  }

  depositFunds(amount: MoneyValueObject): Output<void | IError> {
    if (!this.isAmountInRange(amount)) return Output.fail(AMOUNT_OUT_OF_RANGE);

    const added = this.props.balance.add(amount);
    if (added.isFailure) return Output.fail(added.result as IError);

    this.props.balance = added.result as MoneyValueObject;
    this.appendOperation(OperationTypeValueObject.deposit(), amount);
    this.touchUpdatedAt();
    return Output.success();
  }

  withdrawFunds(amount: MoneyValueObject): Output<void | IError> {
    if (!this.isAmountInRange(amount)) return Output.fail(AMOUNT_OUT_OF_RANGE);
    if (this.availableFunds.compareTo(amount) < 0) return Output.fail(INSUFFICIENT_FUNDS);

    const subtracted = this.props.balance.subtract(amount);
    if (subtracted.isFailure) return Output.fail(INSUFFICIENT_FUNDS);

    this.props.balance = subtracted.result as MoneyValueObject;
    this.appendOperation(OperationTypeValueObject.withdraw(), amount);
    this.touchUpdatedAt();
    return Output.success();
  }

  reserveFunds(
    roundId: IdValueObject,
    betId: IdValueObject,
    amount: MoneyValueObject,
  ): Output<ReserveEntity | IError> {
    if (this.availableFunds.compareTo(amount) < 0) return Output.fail(INSUFFICIENT_FUNDS);

    const reserveOutput = ReserveEntity.init({ funds: amount, betId, roundId });
    if (reserveOutput.isFailure) return Output.fail(reserveOutput.result as IError);

    const reserve = reserveOutput.result as ReserveEntity;
    this.props.reserveds.push(reserve);
    this.appendOperation(OperationTypeValueObject.reserve(), amount);
    this.touchUpdatedAt();
    return Output.success(reserve);
  }

  settleReservedFunds(
    reservedId: IdValueObject,
    payoutAmount?: MoneyValueObject,
  ): Output<void | IError> {
    const index = this.props.reserveds.findIndex((reserve) => reserve.id.equals(reservedId));
    if (index < 0) return Output.fail(RESERVE_DOES_NOT_EXIST);

    const reserve = this.props.reserveds[index];
    this.props.reserveds.splice(index, 1);

    if (payoutAmount) {
      const credited = this.props.balance.add(payoutAmount);
      if (credited.isFailure) return Output.fail(credited.result as IError);
      this.props.balance = credited.result as MoneyValueObject;
      this.appendOperation(OperationTypeValueObject.win(), payoutAmount);
    } else {
      const debited = this.props.balance.subtract(reserve.funds);
      if (debited.isFailure) return Output.fail(INSUFFICIENT_FUNDS);
      this.props.balance = debited.result as MoneyValueObject;
      this.appendOperation(OperationTypeValueObject.lost(), reserve.funds);
    }

    this.touchUpdatedAt();
    return Output.success();
  }

  private isAmountInRange(amount: MoneyValueObject): boolean {
    return amount.cents >= MIN_AMOUNT_CENTS && amount.cents <= MAX_AMOUNT_CENTS;
  }

  private appendOperation(type: OperationTypeValueObject, funds: MoneyValueObject) {
    const opOutput = OperationEntity.init({
      type,
      funds,
      createdAt: DateValueObject.getDefault(),
    });
    if (opOutput.isFailure) return;
    this.props.historic.push(opOutput.result as OperationEntity);
  }

  private touchUpdatedAt() {
    const next = DateValueObject.init({ value: new Date() });
    if (next.isSuccess) this.props.updatedAt = next.result as DateValueObject;
  }

  protected sanitizeProps(): void {}

  protected isValidProps(): boolean {
    const valueObjects = ["userId", "balance"];
    valueObjects.push(...this.defaultValueObjects);

    const entities = ["reserveds", "historic"];
    const requiredProps = [...valueObjects, ...entities];

    const allPropsExists = verifyAllPropsExists(requiredProps, this);
    const areValueObjects = verifyAreValueObjects(valueObjects, this);

    const reservedsAreEntities = Array.isArray(this.props.reserveds);
    const historicAreEntities = Array.isArray(this.props.historic);

    return allPropsExists && areValueObjects && reservedsAreEntities && historicAreEntities;
  }

  static init(props: IWalletProps) {
    const wallet = new WalletAggregateRoot(props);
    if (!wallet.isValidProps()) return Output.fail(INVALID_WALLET);
    return Output.success(wallet);
  }
}

export { WalletAggregateRoot, MIN_AMOUNT_CENTS, MAX_AMOUNT_CENTS };
