import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  type AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@crash/auth";
import { type IError } from "ddd-tool-kit";

import { GetMyWalletService } from "../../application/services/get-my-wallet/get-my-wallet.service";
import { WalletResponseDto } from "../dtos/wallet.response.dto";
import { WalletResponseMapper } from "../mappers/wallet-response.mapper";
import { toNestException } from "@crash/utils";

@ApiTags("wallets")
@Controller()
export class GetMyWalletController {
  constructor(
    private readonly getMyWalletService: GetMyWalletService,
    private readonly mapper: WalletResponseMapper,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("me")
  @ApiOperation({ summary: "Returns the authenticated user's wallet." })
  @ApiOkResponse({ type: WalletResponseDto })
  async execute(@CurrentUser() user: AuthenticatedUser): Promise<WalletResponseDto> {
    const output = await this.getMyWalletService.execute({ userId: user.userId });
    if (output.isFailure) throw toNestException(output.result as IError);

    const { wallet } = output.result as {
      wallet: Parameters<WalletResponseMapper["toRightSide"]>[0];
    };
    return this.mapper.toRightSide(wallet);
  }
}
