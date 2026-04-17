export type OperationType = 'DEPOSIT' | 'WITHDRAW' | 'RESERVE' | 'LOST' | 'WIN'

export interface OperationDto {
  id: string
  type: OperationType
  amountCents: string
  createdAt: string
}

export interface ReserveDto {
  id: string
  amountCents: string
  betId: string
  roundId: string
}

export interface WalletDto {
  id: string
  userId: string
  balanceCents: string
  availableCents: string
  reservedCents: string
  operations: OperationDto[]
  reserves: ReserveDto[]
  createdAt: string
  updatedAt: string
}

export interface ApiErrorShape {
  statusCode: number
  message: string | string[]
  error?: string
}
