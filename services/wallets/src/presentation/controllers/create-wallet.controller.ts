import {
  Controller,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  type AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@crash/auth";
import type { IError } from "ddd-tool-kit";

import { CreateWalletService } from "../../application/services/create-wallet/create-wallet.service";
import { WalletResponseDto } from "../dtos/wallet.response.dto";
import { WalletResponseMapper } from "../mappers/wallet-response.mapper";
import { toNestException } from "./output-exception";

@ApiTags("wallets")
@Controller()
export class CreateWalletController {
  constructor(
    private readonly createWalletService: CreateWalletService,
    private readonly mapper: WalletResponseMapper,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: "Creates the wallet for the authenticated user (idempotent).",
  })
  @ApiCreatedResponse({ type: WalletResponseDto })
  async execute(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WalletResponseDto> {
    const output = await this.createWalletService.execute({ userId: user.userId });
    if (output.isFailure) throw toNestException(output.result as IError);

    const { wallet, wasCreated } = output.result as {
      wallet: Parameters<WalletResponseMapper["toRightSide"]>[0];
      wasCreated: boolean;
    };
    res.status(wasCreated ? HttpStatus.CREATED : HttpStatus.OK);
    return this.mapper.toRightSide(wallet);
  }
}
