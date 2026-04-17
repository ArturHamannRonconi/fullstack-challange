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
import type { IError } from "ddd-tool-kit";

import { DepositService } from "../../application/services/deposit/deposit.service";
import { DepositRequestDto } from "../dtos/amount.dto";
import { WalletResponseDto } from "../dtos/wallet.response.dto";
import { WalletResponseMapper } from "../mappers/wallet-response.mapper";
import { toNestException } from "./output-exception";

@ApiTags("wallets")
@Controller()
export class DepositController {
  constructor(
    private readonly depositService: DepositService,
    private readonly mapper: WalletResponseMapper,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch("deposit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deposits funds into the authenticated user's wallet." })
  @ApiOkResponse({ type: WalletResponseDto })
  async execute(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: DepositRequestDto,
  ): Promise<WalletResponseDto> {
    const output = await this.depositService.execute({
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
