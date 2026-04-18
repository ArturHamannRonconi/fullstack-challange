import { Inject, Injectable, Logger } from "@nestjs/common";
import { type IError, Output } from "ddd-tool-kit";

import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../../infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../infrastructure/nosql/wallet-balance.store";
import type { Service } from "../service.interface";
import type { ISettleCrashedInput } from "./settle-crashed.input";
import type { ISettleCrashedOutput } from "./settle-crashed.output";

@Injectable()
export class SettleCrashedService
  implements Service<ISettleCrashedInput, ISettleCrashedOutput>
{
  private readonly logger = new Logger(SettleCrashedService.name);

  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepository,
    private readonly balanceStore: WalletBalanceStore,
  ) {}

  async execute(
    input: ISettleCrashedInput,
  ): Promise<Output<ISettleCrashedOutput> | Output<IError>> {
    try {
      const affected = await this.wallets.findAllWithReservesForRound(input.roundId);
      let settledCount = 0;

      for (const wallet of affected) {
        const reservesForRound = wallet.reserveds.filter(
          (r) => r.roundId.value === input.roundId,
        );
        for (const reserve of reservesForRound) {
          const settled = wallet.settleReservedFunds(reserve.id);
          if (settled.isFailure) {
            this.logger.warn(
              `Settle LOST failed (wallet=${wallet.id.value}, reserve=${reserve.id.value}): ${(settled.result as { message: string }).message}`,
            );
            continue;
          }
          settledCount += 1;
        }
        await this.wallets.save(wallet);
        await this.balanceStore.set(wallet);
      }

      return Output.success({ settledCount, roundId: input.roundId });
    } catch (error) {
      this.logger.error("Failed to settle crashed round", error as Error);
      return Output.fail({
        message: "Internal error while settling crashed round.",
        statusCode: 500,
      });
    }
  }
}
