import { DEFAULT_CURRENCY } from '@peaje/shared'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  /** Clave para firmar challenges MPP. 32+ bytes. */
  mppSecretKey: required('MPP_SECRET_KEY'),
  /** Wallet de la plataforma que recibe todos los pagos. */
  treasuryAddress: required('TREASURY_ADDRESS') as `0x${string}`,
  currency: (process.env.MPP_CURRENCY ?? DEFAULT_CURRENCY) as `0x${string}`,
  testnet: (process.env.TEMPO_NETWORK ?? 'testnet') === 'testnet',
  /** Origin del endpoint demo de M1. */
  demoOrigin: process.env.DEMO_ORIGIN ?? 'https://picsum.photos',
}
