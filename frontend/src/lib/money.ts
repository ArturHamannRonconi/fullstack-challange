const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function centsToBRL(cents: string | number | bigint): string {
  const asBigInt =
    typeof cents === 'bigint' ? cents : BigInt(typeof cents === 'number' ? Math.trunc(cents) : cents)
  const asNumber = Number(asBigInt) / 100
  return BRL.format(asNumber)
}

export function brlInputToCents(input: string): bigint | null {
  const trimmed = input.replace(/\s/g, '').replace(/R\$/i, '')
  const normalized = trimmed.replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const [intPart, decPart = ''] = normalized.split('.')
  const padded = (decPart + '00').slice(0, 2)
  return BigInt(intPart) * 100n + BigInt(padded)
}
