import { Public } from "@crash/auth";
import { Controller, Get, Query } from "@nestjs/common";
import { type IError } from "ddd-tool-kit";

import { GetRoundsHistoryService } from "../../application/services/get-rounds-history/get-rounds-history.service";
import { PaginationQueryDto } from "../dtos/pagination.dto";
import { RoundsHistoryResponseDto } from "../dtos/round.response.dto";
import { RoundResponseMapper } from "../mappers/round-response.mapper";
import { toNestException } from "@crash/utils";

@Controller("rounds")
export class GetRoundsHistoryController {
  constructor(
    private readonly service: GetRoundsHistoryService,
    private readonly mapper: RoundResponseMapper,
  ) {}

  @Public()
  @Get("history")
  async execute(@Query() query: PaginationQueryDto): Promise<RoundsHistoryResponseDto> {
    const out = await this.service.execute({
      page: query.page ?? 1,
      perPage: query.perPage ?? 20,
    });
    if (out.isFailure) throw toNestException(out.result as IError);

    const { items, total, page, perPage } = out.result as {
      items: Parameters<RoundResponseMapper["toRightSide"]>[0][];
      total: number;
      page: number;
      perPage: number;
    };

    return {
      items: items.map((r) => this.mapper.toRightSide(r)),
      total,
      page,
      perPage,
    };
  }
}
