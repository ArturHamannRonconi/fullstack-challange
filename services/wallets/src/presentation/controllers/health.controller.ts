import { Public } from "@crash/auth";
import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { HealthCheckResponseDto } from "../dtos/wallet.response.dto";

@ApiTags("health")
@Controller()
export class HealthController {
  @Public()
  @Get("health")
  @ApiOperation({ summary: "Liveness probe (no auth)." })
  @ApiOkResponse({ type: HealthCheckResponseDto })
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }
}
