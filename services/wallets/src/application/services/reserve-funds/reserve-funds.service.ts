import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  type IError,
  IdValueObject,
  Output,
  throwFailOutput,
} from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { UserIdValueObject } from "../../../domain/value-objects/user-id/user-id.value-object";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../../infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../infrastructure/nosql/wallet-balance.store";
import type { Service } from "../service.interface";
import type { IReserveFundsInput } from "./reserve-funds.input";
import type { IReserveFundsOutput } from "./reserve-funds.output";

@Injectable()
export class ReserveFundsService
  implements Service<IReserveFundsInput, IReserveFundsOutput>
{
  private readonly logger = new Logger(ReserveFundsService.name);

  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepository,
    private readonly balanceStore: WalletBalanceStore,
  ) {}

  async execute(
    input: IReserveFundsInput,
  ): Promise<Output<IReserveFundsOutput> | Output<IError>> {
    try {
      const userIdOut = UserIdValueObject.init({ value: input.userId });
      if (userIdOut.isFailure) return throwFailOutput(userIdOut);
      const userId = userIdOut.result as UserIdValueObject;

      const wallet = await this.wallets.findByUserId(userId);
      if (!wallet) {
        return Output.fail({ message: "Wallet not found.", statusCode: 404 });
      }

      const already = wallet.reserveds.find((r) => r.betId.value === input.betId);
      if (already) {
        return Output.success({ wallet, reserveId: already.id.value });
      }

      const amountOut = MoneyValueObject.fromCents(input.amountCents);
      if (amountOut.isFailure) return throwFailOutput(amountOut);

      const roundIdOut = IdValueObject.init({ value: input.roundId });
      if (roundIdOut.isFailure) return throwFailOutput(roundIdOut);
      const betIdOut = IdValueObject.init({ value: input.betId });
      if (betIdOut.isFailure) return throwFailOutput(betIdOut);

      const reserved = wallet.reserveFunds(
        roundIdOut.result as IdValueObject,
        betIdOut.result as IdValueObject,
        amountOut.result as MoneyValueObject,
      );
      if (reserved.isFailure) return throwFailOutput(reserved);

      await this.wallets.save(wallet);
      await this.balanceStore.set(wallet);

      const reserve = reserved.result as { id: IdValueObject } as {
        id: { value: string };
      };
      return Output.success({ wallet, reserveId: reserve.id.value });
    } catch (error) {
      this.logger.error("Failed to reserve funds", error as Error);
      return Output.fail({
        message: "Internal error while reserving funds.",
        statusCode: 500,
      });
    }
  }
}
