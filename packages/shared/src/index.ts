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

// ---- credenciales de tenant ----

const KEY_PREFIX = 'peaje_live_'

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomHex(bytes: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)))
}

/** Genera un API key. Se muestra una sola vez; en la DB va solo el hash. */
export function generateApiKey(): string {
  return `${KEY_PREFIX}${randomHex(24)}`
}

/** Secreto para firmar los JWT del iframe. Distinto del API key. */
export function generateEmbedSecret(): string {
  return randomHex(32)
}

/** Prefijo visible del key, para que el tenant lo reconozca en el dashboard. */
export function apiKeyPrefix(key: string): string {
  return `${key.slice(0, KEY_PREFIX.length + 6)}…`
}

export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return toHex(new Uint8Array(digest))
}

/** Slug URL-safe a partir de un nombre. */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
