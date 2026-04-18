export interface IVerifyRoundOutput {
  roundId: string;
  serverSeed: string;
  seedHash: string;
  crashPointScaled: number;
  isValid: boolean;
}
