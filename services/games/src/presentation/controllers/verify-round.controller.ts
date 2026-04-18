import { Public } from "@crash/auth";
import { Controller, Get, Param } from "@nestjs/common";
import { type IError } from "ddd-tool-kit";

import { VerifyRoundService } from "../../application/services/verify-round/verify-round.service";
import { VerifyRoundResponseDto } from "../dtos/round.response.dto";
import { toNestException } from "@crash/utils";

@Controller("rounds")
export class VerifyRoundController {
  constructor(private readonly service: VerifyRoundService) {}

  @Public()
  @Get(":roundId/verify")
  async execute(@Param("roundId") roundId: string): Promise<VerifyRoundResponseDto> {
    const out = await this.service.execute({ roundId });
    if (out.isFailure) throw toNestException(out.result as IError);
    return out.result as VerifyRoundResponseDto;
  }
}
