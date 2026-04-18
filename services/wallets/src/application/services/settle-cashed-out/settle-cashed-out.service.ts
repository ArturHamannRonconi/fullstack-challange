import { Inject, Injectable, Logger } from "@nestjs/common";
import { type IError, Output, throwFailOutput } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { UserIdValueObject } from "../../../domain/value-objects/user-id/user-id.value-object";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../../infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../infrastructure/nosql/wallet-balance.store";
import type { Service } from "../service.interface";
import type { ISettleCashedOutInput } from "./settle-cashed-out.input";
import type { ISettleCashedOutOutput } from "./settle-cashed-out.output";

@Injectable()
export class SettleCashedOutService
  implements Service<ISettleCashedOutInput, ISettleCashedOutOutput>
{
  private readonly logger = new Logger(SettleCashedOutService.name);

  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepository,
    private readonly balanceStore: WalletBalanceStore,
  ) {}

  async execute(
    input: ISettleCashedOutInput,
  ): Promise<Output<ISettleCashedOutOutput> | Output<IError>> {
    try {
      const userIdOut = UserIdValueObject.init({ value: input.userId });
      if (userIdOut.isFailure) return throwFailOutput(userIdOut);

      const wallet = await this.wallets.findByUserId(userIdOut.result as UserIdValueObject);
      if (!wallet) {
        return Output.fail({ message: "Wallet not found.", statusCode: 404 });
      }

      const reserve = wallet.reserveds.find((r) => r.betId.value === input.betId);
      if (!reserve) {
        this.logger.warn(
          `CashedOut settle: no reserve found (user=${input.userId}, bet=${input.betId}). Idempotent skip.`,
        );
        return Output.success({
          userId: wallet.userId.value,
          balanceCents: wallet.balance.toCentsString(),
        });
      }

      const netOut = MoneyValueObject.fromCents(input.netProfitCents);
      if (netOut.isFailure) return throwFailOutput(netOut);

      const settled = wallet.settleReservedFunds(
        reserve.id,
        netOut.result as MoneyValueObject,
      );
      if (settled.isFailure) return throwFailOutput(settled);

      await this.wallets.save(wallet);
      await this.balanceStore.set(wallet);

      return Output.success({
        userId: wallet.userId.value,
        balanceCents: wallet.balance.toCentsString(),
      });
    } catch (error) {
      this.logger.error("Failed to settle cashed-out", error as Error);
      return Output.fail({
        message: "Internal error while settling cashout.",
        statusCode: 500,
      });
    }
  }
}
