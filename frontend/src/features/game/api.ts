import { API_BASE_URL } from '@/lib/api'
import {
  CashoutResponseDto,
  LeaderboardDto,
  PlaceBetResponseDto,
  RoundDto,
  RoundsHistoryDto,
  VerifyRoundDto,
} from './types'

export class GamesApiError extends Error {
  readonly status: number
  readonly fields?: string[]
  constructor(message: string, status: number, fields?: string[]) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

interface ApiErrorShape {
  statusCode?: number
  message: string | string[]
  error?: string
}

async function request<T>(
  path: string,
  init: RequestInit,
  accessToken?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${API_BASE_URL}/games${path}`, { ...init, headers })
  if (res.status === 204) return undefined as T

  const raw = await res.text()
  const data = raw ? (JSON.parse(raw) as unknown) : null

  if (!res.ok) {
    const shape = (data ?? {}) as Partial<ApiErrorShape>
    const message = Array.isArray(shape.message)
      ? shape.message.join(', ')
      : (shape.message ?? res.statusText)
    throw new GamesApiError(
      message,
      res.status,
      Array.isArray(shape.message) ? shape.message : undefined,
    )
  }
  return data as T
}

export function getCurrentRound(): Promise<RoundDto | null> {
  return request<RoundDto | null>('/rounds/current', { method: 'GET' })
}

export function getRoundsHistory(perPage = 20): Promise<RoundsHistoryDto> {
  return request<RoundsHistoryDto>(
    `/rounds/history?page=1&perPage=${perPage}`,
    { method: 'GET' },
  )
}

export function getLeaderboard(params: {
  page?: number
  perPage?: number
  search?: string
}): Promise<LeaderboardDto> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('perPage', String(params.perPage ?? 20))
  if (params.search && params.search.trim()) qs.set('search', params.search.trim())
  return request<LeaderboardDto>(`/rounds/leaderboard?${qs.toString()}`, { method: 'GET' })
}

export function verifyRound(roundId: string): Promise<VerifyRoundDto> {
  return request<VerifyRoundDto>(`/rounds/${roundId}/verify`, { method: 'GET' })
}

export function placeBet(
  accessToken: string,
  amountCents: string,
): Promise<PlaceBetResponseDto> {
  return request<PlaceBetResponseDto>(
    '/bet',
    { method: 'POST', body: JSON.stringify({ amountCents }) },
    accessToken,
  )
}

export function cashout(accessToken: string): Promise<CashoutResponseDto> {
  return request<CashoutResponseDto>(
    '/bet/cashout',
    { method: 'POST' },
    accessToken,
  )
}
