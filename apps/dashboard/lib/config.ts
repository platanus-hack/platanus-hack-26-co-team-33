export const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:8787'

export function money(value: string | number): string {
  return `$${Number(value).toFixed(2)}`
}

export function shortWallet(wallet: string | null): string {
  if (!wallet) return '—'
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
}
