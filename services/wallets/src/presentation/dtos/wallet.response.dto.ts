import { ApiProperty } from "@nestjs/swagger";

import type { OperationType } from "../../domain/value-objects/operation-type/operation-type.props";

export class OperationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ["DEPOSIT", "WITHDRAW", "RESERVE", "LOST", "WIN"] })
  type!: OperationType;
  @ApiProperty({ description: "Amount in cents (string for BigInt safety)." })
  amountCents!: string;
  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class ReserveResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: "Amount in cents (string for BigInt safety)." })
  amountCents!: string;
  @ApiProperty() betId!: string;
  @ApiProperty() roundId!: string;
}

export class WalletResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ description: "Total balance in cents." })
  balanceCents!: string;
  @ApiProperty({ description: "Available funds = balance - sum(reserves)." })
  availableCents!: string;
  @ApiProperty({ description: "Reserved funds across all active reserves." })
  reservedCents!: string;
  @ApiProperty({ type: [OperationResponseDto] })
  operations!: OperationResponseDto[];
  @ApiProperty({ type: [ReserveResponseDto] })
  reserves!: ReserveResponseDto[];
  @ApiProperty({ format: "date-time" })
  createdAt!: string;
  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class HealthCheckResponseDto {
  @ApiProperty({ example: "ok" })
  status!: string;
  @ApiProperty({ example: "wallets" })
  service!: string;
}
