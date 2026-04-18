import { API_BASE_URL } from '@/lib/api'
import { ApiErrorShape, WalletDto } from './types'

export class WalletApiError extends Error {
  readonly status: number
  readonly fields?: string[]
  constructor(message: string, status: number, fields?: string[]) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  accessToken: string,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/wallets${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  })

  if (res.status === 204) return undefined as T

  const raw = await res.text()
  const data = raw ? (JSON.parse(raw) as unknown) : null

  if (!res.ok) {
    const shape = (data ?? {}) as Partial<ApiErrorShape>
    const message = Array.isArray(shape.message)
      ? shape.message.join(', ')
      : shape.message ?? res.statusText
    throw new WalletApiError(message, res.status, Array.isArray(shape.message) ? shape.message : undefined)
  }

  return data as T
}

export function getMyWallet(accessToken: string): Promise<WalletDto> {
  return request<WalletDto>('/me', { method: 'GET' }, accessToken)
}

export function createWallet(accessToken: string): Promise<WalletDto> {
  return request<WalletDto>('', { method: 'POST' }, accessToken)
}

export function depositFunds(accessToken: string, amountCents: string): Promise<WalletDto> {
  return request<WalletDto>(
    '/deposit',
    { method: 'PATCH', body: JSON.stringify({ amountCents }) },
    accessToken,
  )
}

export function withdrawFunds(accessToken: string, amountCents: string): Promise<WalletDto> {
  return request<WalletDto>(
    '/withdraw',
    { method: 'PATCH', body: JSON.stringify({ amountCents }) },
    accessToken,
  )
}
