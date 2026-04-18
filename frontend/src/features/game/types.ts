export type RoundStatus = 'BETTING_OPEN' | 'BETTING_CLOSED' | 'ROUND_START' | 'CRASHED'

export interface BetDto {
  id: string
  playerId: string
  username?: string
  stakedAmountCents: string
  cashOutPointScaled?: string
  isCashedOut: boolean
  createdAt: string
  updatedAt: string
}

export interface RoundStatusDto {
  id: string
  status: RoundStatus
  statusDate: string
}

export interface RoundDto {
  id: string
  seedHash: string
  serverSeed?: string
  crashPointScaled: number
  currentStatus: RoundStatus | null
  startedAtMs?: number
  bets: BetDto[]
  statusHistory: RoundStatusDto[]
  createdAt: string
  updatedAt: string
}

export interface RoundsHistoryDto {
  items: RoundDto[]
  total: number
  page: number
  perPage: number
}

export interface PlaceBetResponseDto {
  bet: BetDto
  roundId: string
  balanceCents: string
  availableCents: string
}

export interface CashoutResponseDto {
  bet: BetDto
  roundId: string
  multiplierScaled: string
  totalPayoutCents: string
  netProfitCents: string
}

export interface VerifyRoundDto {
  roundId: string
  serverSeed: string
  seedHash: string
  crashPointScaled: number
  isValid: boolean
}

export interface LeaderboardEntryDto {
  playerId: string
  username: string | null
  totalProfitCents: string
  totalStakedCents: string
  betsCount: number
  wins: number
  losses: number
}

export interface LeaderboardDto {
  items: LeaderboardEntryDto[]
  total: number
  page: number
  perPage: number
}

export type LivePhase = 'idle' | 'preparing' | 'betting_open' | 'betting_closed' | 'running' | 'crashed'

export interface LiveBet {
  id: string
  playerId: string
  username?: string
  stakedAmountCents: string
  cashOutMultiplier?: number
  isCashedOut: boolean
}
