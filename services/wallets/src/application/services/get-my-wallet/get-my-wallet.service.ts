import { Inject, Injectable, Logger } from "@nestjs/common";
import { IError, Output, throwFailOutput } from "ddd-tool-kit";

import { UserIdValueObject } from "../../../domain/value-objects/user-id/user-id.value-object";
import { WALLET_DOES_NOT_EXIST } from "../../../domain/wallet.errors";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../../infrastructure/database/repositories/wallet.repository";
import { Service } from "../service.interface";
import { IGetMyWalletInput } from "./get-my-wallet.input";
import { IGetMyWalletOutput } from "./get-my-wallet.output";

@Injectable()
export class GetMyWalletService implements Service<IGetMyWalletInput, IGetMyWalletOutput> {
  private readonly logger = new Logger(GetMyWalletService.name);

  constructor(
    @Inject(WALLET_REPOSITORY) private readonly walletRepository: WalletRepository,
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
