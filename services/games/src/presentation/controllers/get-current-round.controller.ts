import { Public } from "@crash/auth";
import { Controller, Get } from "@nestjs/common";
import { type IError } from "ddd-tool-kit";

import { GetCurrentRoundService } from "../../application/services/get-current-round/get-current-round.service";
import { RoundResponseDto } from "../dtos/round.response.dto";
import { RoundResponseMapper } from "../mappers/round-response.mapper";
import { toNestException } from "@crash/utils";

@Controller("rounds")
export class GetCurrentRoundController {
  constructor(
    private readonly service: GetCurrentRoundService,
    private readonly mapper: RoundResponseMapper,
  ) {}

  @Public()
  @Get("current")
  async execute(): Promise<RoundResponseDto | null> {
    const out = await this.service.execute({});
    if (out.isFailure) throw toNestException(out.result as IError);
    const { round } = out.result as { round: Parameters<RoundResponseMapper["toRightSide"]>[0] | null };
    return round ? this.mapper.toRightSide(round) : null;
  }
}
