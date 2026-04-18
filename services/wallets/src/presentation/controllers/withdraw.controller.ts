import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from "@nestjs/common";
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

import { WithdrawService } from "../../application/services/withdraw/withdraw.service";
import { WithdrawRequestDto } from "../dtos/amount.dto";
import { WalletResponseDto } from "../dtos/wallet.response.dto";
import { WalletResponseMapper } from "../mappers/wallet-response.mapper";
import { toNestException } from "@crash/utils";

@ApiTags("wallets")
@Controller()
export class WithdrawController {
  constructor(
    private readonly withdrawService: WithdrawService,
    private readonly mapper: WalletResponseMapper,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch("withdraw")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Withdraws funds from the authenticated user's wallet (available balance only).",
  })
  @ApiOkResponse({ type: WalletResponseDto })
  async execute(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: WithdrawRequestDto,
  ): Promise<WalletResponseDto> {
    const output = await this.withdrawService.execute({
      userId: user.userId,
      amountCents: body.amountCents,
    });
    if (output.isFailure) throw toNestException(output.result as IError);

    const { wallet } = output.result as {
      wallet: Parameters<WalletResponseMapper["toRightSide"]>[0];
    };
    return this.mapper.toRightSide(wallet);
  }
}
