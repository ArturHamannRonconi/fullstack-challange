import { ApiProperty } from "@nestjs/swagger";
import { IsNumberString, IsNotEmpty, Length } from "class-validator";

export class AmountRequestDto {
  @ApiProperty({
    description: "Amount in cents as a numeric string (min 100, max 100000).",
    example: "1000",
    minLength: 1,
    maxLength: 16,
  })
  @IsNotEmpty()
  @IsNumberString(
    { no_symbols: true },
    { message: "amountCents must be a positive integer numeric string." },
  )
  @Length(1, 16)
  amountCents!: string;
}

export class DepositRequestDto extends AmountRequestDto {}
export class WithdrawRequestDto extends AmountRequestDto {}
