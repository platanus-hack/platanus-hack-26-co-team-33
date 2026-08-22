import { tempoConfig } from '@peaje/shared'
import { createPublicClient, http } from 'viem'
import { env } from './env.js'

const config = tempoConfig(env.testnet)

/** Cliente de lectura sobre Tempo. Se usa para resolver quién pagó una tx. */
export const publicClient = createPublicClient({
  transport: http(config.rpcUrl),
})

/**
 * El Receipt de MPP no trae la wallet del agente, solo el hash de la tx.
 * La resolvemos leyendo la transacción on-chain.
 */
export async function resolvePayer(txHash: string): Promise<string | null> {
  try {
    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` })
    return tx.from ?? null
  } catch (error) {
    console.warn('[chain] no se pudo resolver el pagador de', txHash, error)
    return null
  }
}
