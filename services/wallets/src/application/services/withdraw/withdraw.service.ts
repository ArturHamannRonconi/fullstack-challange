import { Inject, Injectable, Logger } from "@nestjs/common";
import { type IError, Output, throwFailOutput } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { UserIdValueObject } from "../../../domain/value-objects/user-id/user-id.value-object";
import { WALLET_DOES_NOT_EXIST } from "../../../domain/wallet.errors";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../../infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../infrastructure/nosql/wallet-balance.store";
import type { Service } from "../service.interface";
import type { IWithdrawInput } from "./withdraw.input";
import type { IWithdrawOutput } from "./withdraw.output";

@Injectable()
export class WithdrawService implements Service<IWithdrawInput, IWithdrawOutput> {
  private readonly logger = new Logger(WithdrawService.name);

  constructor(
    @Inject(WALLET_REPOSITORY) private readonly walletRepository: WalletRepository,
    private readonly balanceStore: WalletBalanceStore,
  ) {}

  async execute(input: IWithdrawInput): Promise<Output<IWithdrawOutput> | Output<IError>> {
    try {
      const userIdOutput = UserIdValueObject.init({ value: input.userId });
      if (userIdOutput.isFailure) return throwFailOutput(userIdOutput);
      const userId = userIdOutput.result as UserIdValueObject;

      const amountOutput = MoneyValueObject.fromCents(input.amountCents);
      if (amountOutput.isFailure) return throwFailOutput(amountOutput);
      const amount = amountOutput.result as MoneyValueObject;

      const wallet = await this.walletRepository.findByUserId(userId);
      if (!wallet) return Output.fail(WALLET_DOES_NOT_EXIST);

      const withdrawn = wallet.withdrawFunds(amount);
      if (withdrawn.isFailure) return throwFailOutput(withdrawn);

      await this.walletRepository.save(wallet);
      await this.balanceStore.set(wallet);

      return Output.success({ wallet });
    } catch (error) {
      this.logger.error("Failed to withdraw funds", error as Error);
      return Output.fail({
        message: "Internal server error while withdrawing funds.",
        statusCode: 500,
      });
    }
  }
}
