import { TOKEN_DECIMALS } from '@peaje/shared'
import { createClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { tempoModerato } from 'viem/chains'
import { Actions } from 'viem/tempo'
import { publicClient } from './chain.js'
import { env } from './env.js'

const account = privateKeyToAccount(env.treasuryPrivateKey)

/**
 * Cliente de escritura de la treasury.
 *
 * En Tempo el gas se paga en token, no en un nativo: por eso el chain lleva
 * `feeToken`. Usamos el mismo token con el que cobramos.
 */
const walletClient = createClient({
  account,
  chain: { ...tempoModerato, feeToken: env.currency },
  transport: http(env.rpcUrl),
})

export const treasuryAddress = account.address

/** Manda `amount` (decimal, ej "12.45") del token de cobro a `to`. Devuelve el hash. */
export async function sendPayout(to: `0x${string}`, amount: string): Promise<`0x${string}`> {
  return Actions.token.transfer(walletClient, {
    to,
    token: env.currency,
    amount: parseUnits(amount, TOKEN_DECIMALS),
  })
}

/** Saldo de la treasury en decimal. */
export async function treasuryBalance(): Promise<string> {
  const balance = await Actions.token.getBalance(publicClient, {
    account: account.address,
    token: env.currency,
  })
  return balance.formatted ?? String(balance.amount)
}

/** true si la tx ya está minada y salió bien. null si todavía no aparece. */
export async function payoutConfirmed(hash: `0x${string}`): Promise<boolean | null> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash })
    return receipt.status === 'success'
  } catch {
    return null
  }
}
