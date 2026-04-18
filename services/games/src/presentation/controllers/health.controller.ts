import { Public } from "@crash/auth";
import { Controller, Get } from "@nestjs/common";

import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";

@Controller()
export class HealthController {
  @Public()
  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "games" };
  }
}
