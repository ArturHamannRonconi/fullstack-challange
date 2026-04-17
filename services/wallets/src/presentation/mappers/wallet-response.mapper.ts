import { Injectable } from "@nestjs/common";
import type { IUnidirectionalMapper } from "ddd-tool-kit";

import type { WalletAggregateRoot } from "../../domain/wallet.aggregate-root";
import {
  OperationResponseDto,
  ReserveResponseDto,
  WalletResponseDto,
} from "../dtos/wallet.response.dto";

@Injectable()
export class WalletResponseMapper
  implements IUnidirectionalMapper<WalletAggregateRoot, WalletResponseDto>
{
  toRightSide(leftSide: WalletAggregateRoot): WalletResponseDto {
    const operations: OperationResponseDto[] = leftSide.historic
      .map((op) => ({
        id: op.id.value,
        type: op.type.value,
        amountCents: op.funds.toCentsString(),
        createdAt: op.createdAt.value.toISOString(),
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const reserves: ReserveResponseDto[] = leftSide.reserveds.map((r) => ({
      id: r.id.value,
      amountCents: r.funds.toCentsString(),
      betId: r.betId.value,
      roundId: r.roundId.value,
    }));

    return {
      id: leftSide.id.value,
      userId: leftSide.userId.value,
      balanceCents: leftSide.balance.toCentsString(),
      availableCents: leftSide.availableFunds.toCentsString(),
      reservedCents: leftSide.reservedFunds.toCentsString(),
      operations,
      reserves,
      createdAt: leftSide.createdAt.value.toISOString(),
      updatedAt: leftSide.updatedAt.value.toISOString(),
    };
  }
}
