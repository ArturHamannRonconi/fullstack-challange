import { Injectable } from "@nestjs/common";
import { type IUnidirectionalMapper } from "ddd-tool-kit";

import { BetEntity } from "../../domain/entities/bet/bet.entity";
import { RoundAggregateRoot } from "../../domain/round.aggregate-root";
import {
  BetResponseDto,
  RoundResponseDto,
  RoundStatusResponseDto,
} from "../dtos/round.response.dto";

@Injectable()
export class RoundResponseMapper
  implements IUnidirectionalMapper<RoundAggregateRoot, RoundResponseDto>
{
  toRightSide(round: RoundAggregateRoot): RoundResponseDto {
    return {
      id: round.id.value,
      seedHash: round.seed.hash,
      serverSeed: round.isCrashed ? round.seed.value : undefined,
      crashPointScaled: round.crashPointScaled,
      currentStatus: round.currentStatus?.value ?? null,
      startedAtMs: round.startedAt?.value.getTime(),
      bets: round.bets.map((bet) => toBetDto(bet)),
      statusHistory: round.roundStatus.map<RoundStatusResponseDto>((status) => ({
        id: status.id.value,
        status: status.status.value,
        statusDate: status.statusDate.value.toISOString(),
      })),
      createdAt: round.createdAt.value.toISOString(),
      updatedAt: round.updatedAt.value.toISOString(),
    };
  }
}

export function toBetDto(bet: BetEntity): BetResponseDto {
  return {
    id: bet.id.value,
    playerId: bet.playerId.value,
    username: bet.username,
    stakedAmountCents: bet.stakedAmount.toCentsString(),
    cashOutPointScaled: bet.cashOutPoint?.scaled.toString(),
    isCashedOut: bet.isCashedOut,
    createdAt: bet.createdAt.value.toISOString(),
    updatedAt: bet.updatedAt.value.toISOString(),
  };
}
