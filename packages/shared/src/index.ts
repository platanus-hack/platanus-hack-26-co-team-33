/** Constantes y helpers compartidos entre gateway, dashboard y cliente demo. */

export const TEMPO = {
  mainnet: {
    chainId: 4217,
    rpcUrl: 'https://rpc.tempo.xyz',
    explorerUrl: 'https://explore.tempo.xyz',
  },
  testnet: {
    chainId: 42431,
    rpcUrl: 'https://rpc.moderato.tempo.xyz',
    explorerUrl: 'https://explore.testnet.tempo.xyz',
  },
} as const

/** Tokens TIP-20 soportados. Mismo address en mainnet y testnet. */
export const TOKENS = {
  pathUsd: '0x20c0000000000000000000000000000000000000',
  usdc: '0x20C000000000000000000000b9537d11c60E8b50',
} as const

export const DEFAULT_CURRENCY = TOKENS.pathUsd
/** Los TIP-20 de Tempo usan 6 decimales. */
export const TOKEN_DECIMALS = 6

export function tempoConfig(testnet: boolean) {
  return testnet ? TEMPO.testnet : TEMPO.mainnet
}

export function txExplorerUrl(hash: string, testnet = true): string {
  return `${tempoConfig(testnet).explorerUrl}/tx/${hash}`
}

/** Convierte unidades base del token (ej. "50000") a decimal ("0.05"). */
export function fromBaseUnits(base: string | bigint, decimals = TOKEN_DECIMALS): string {
  const value = BigInt(base)
  const divisor = 10n ** BigInt(decimals)
  const whole = value / divisor
  const fraction = (value % divisor).toString().padStart(decimals, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

/** Normaliza un precio a string decimal, que es lo que espera mppx. */
export function formatAmount(amount: number | string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(n) || n < 0) throw new Error(`Monto inválido: ${amount}`)
  const fixed = n.toFixed(TOKEN_DECIMALS)
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed
}
