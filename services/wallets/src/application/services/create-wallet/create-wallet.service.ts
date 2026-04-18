import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  DateValueObject,
  type IError,
  IdValueObject,
  Output,
  throwFailOutput,
} from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { OperationEntity } from "../../../domain/entities/operation/operation.entity";
import { OperationTypeValueObject } from "../../../domain/value-objects/operation-type/operation-type.value-object";
import { UserIdValueObject } from "../../../domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../domain/wallet.aggregate-root";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../../infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../infrastructure/nosql/wallet-balance.store";
import type { Service } from "../service.interface";
import type { ICreateWalletInput } from "./create-wallet.input";
import type { ICreateWalletOutput } from "./create-wallet.output";

@Injectable()
export class CreateWalletService implements Service<ICreateWalletInput, ICreateWalletOutput> {
  private readonly logger = new Logger(CreateWalletService.name);
  private readonly initialBalanceCents: bigint;

  constructor(
    @Inject(WALLET_REPOSITORY) private readonly walletRepository: WalletRepository,
    private readonly balanceStore: WalletBalanceStore,
  ) {
    const raw = process.env.WALLET_INITIAL_BALANCE_CENTS ?? "50000";
    this.initialBalanceCents = BigInt(raw);
  }

  async execute(
    input: ICreateWalletInput,
  ): Promise<Output<ICreateWalletOutput> | Output<IError>> {
    try {
      const userIdOutput = UserIdValueObject.init({ value: input.userId });
      if (userIdOutput.isFailure) return throwFailOutput(userIdOutput);
      const userId = userIdOutput.result as UserIdValueObject;

      const existing = await this.walletRepository.findByUserId(userId);
      if (existing) {
        // Rehydrate Redis so downstream read-paths (games' PlaceBet) don't
        // 404 after cache loss / volume reset when Postgres still has the row.
        await this.balanceStore.set(existing);
        return Output.success({ wallet: existing, wasCreated: false });
      }

      const balanceOutput = MoneyValueObject.init({ value: this.initialBalanceCents });
      if (balanceOutput.isFailure) return throwFailOutput(balanceOutput);
      const balance = balanceOutput.result as MoneyValueObject;

      const depositOperation = OperationEntity.init({
        type: OperationTypeValueObject.deposit(),
        funds: balance,
        createdAt: DateValueObject.getDefault(),
      });
      if (depositOperation.isFailure) return throwFailOutput(depositOperation);

      const walletOutput = WalletAggregateRoot.init({
        id: IdValueObject.getDefault(),
        userId,
        balance,
        reserveds: [],
        historic: [depositOperation.result as OperationEntity],
      });
      if (walletOutput.isFailure) return throwFailOutput(walletOutput);

      const wallet = walletOutput.result as WalletAggregateRoot;
      await this.walletRepository.save(wallet);
      await this.balanceStore.set(wallet);

      return Output.success({ wallet, wasCreated: true });
    } catch (error) {
      this.logger.error("Failed to create wallet", error as Error);
      return Output.fail({
        message: "Internal server error while creating wallet.",
        statusCode: 500,
      });
    }
  }
}
