import { Inject, Injectable, Logger } from "@nestjs/common";
import { type IError, Output, throwFailOutput } from "ddd-tool-kit";

import { UserIdValueObject } from "../../../domain/value-objects/user-id/user-id.value-object";
import { WALLET_DOES_NOT_EXIST } from "../../../domain/wallet.errors";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../../infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../infrastructure/nosql/wallet-balance.store";
import type { Service } from "../service.interface";
import type { IGetMyWalletInput } from "./get-my-wallet.input";
import type { IGetMyWalletOutput } from "./get-my-wallet.output";

@Injectable()
export class GetMyWalletService implements Service<IGetMyWalletInput, IGetMyWalletOutput> {
  private readonly logger = new Logger(GetMyWalletService.name);

  constructor(
    @Inject(WALLET_REPOSITORY) private readonly walletRepository: WalletRepository,
    private readonly balanceStore: WalletBalanceStore,
  ) {}

  async execute(
    input: IGetMyWalletInput,
  ): Promise<Output<IGetMyWalletOutput> | Output<IError>> {
    try {
      const userIdOutput = UserIdValueObject.init({ value: input.userId });
      if (userIdOutput.isFailure) return throwFailOutput(userIdOutput);
      const userId = userIdOutput.result as UserIdValueObject;

      const wallet = await this.walletRepository.findByUserId(userId);
      if (!wallet) return Output.fail(WALLET_DOES_NOT_EXIST);

      // Defensive rehydrate: keeps games' PlaceBet path from 404-ing when
      // Redis is cold but Postgres still has the wallet.
      await this.balanceStore.set(wallet);

      return Output.success({ wallet });
    } catch (error) {
      this.logger.error("Failed to fetch wallet", error as Error);
      return Output.fail({
        message: "Internal server error while fetching wallet.",
        statusCode: 500,
      });
    }
  }
}
