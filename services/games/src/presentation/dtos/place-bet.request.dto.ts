import { IsNotEmpty, IsString, Matches } from "class-validator";

export class PlaceBetRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: "amountCents must be a positive integer string (in cents)." })
  amountCents!: string;
}
