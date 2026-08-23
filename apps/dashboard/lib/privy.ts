import 'server-only'
import { PrivyClient } from '@privy-io/node'

let cached: PrivyClient | undefined

function client(): PrivyClient {
  if (!cached) {
    cached = new PrivyClient({
      appId: process.env.PRIVY_APP_ID!,
      appSecret: process.env.PRIVY_APP_SECRET!,
    })
  }
  return cached
}

/**
 * Verifica el access token que entrega el SDK del cliente tras el login por
 * email (OTP). Lanza si el token es inválido o expiró.
 */
export async function verifyPrivyAccessToken(accessToken: string): Promise<string> {
  const claims = await client().utils().auth().verifyAccessToken(accessToken)
  return claims.user_id
}

/** Email verificado del usuario de Privy, o null si no tiene uno linkeado. */
export async function getPrivyUserEmail(privyUserId: string): Promise<string | null> {
  const user = await client().users()._get(privyUserId)
  const email = user.linked_accounts.find((a) => a.type === 'email')
  return email?.address ?? null
}

/**
 * Crea la wallet server-side donde el gateway acredita los pagos del merchant.
 * Privy la custodia: no hay prompt humano, el gateway tiene que poder recibir
 * pagos en cualquier momento.
 */
export async function createMerchantWallet(
  displayName: string,
): Promise<{ id: string; address: string }> {
  const wallet = await client()
    .wallets()
    .create({ chain_type: 'ethereum', display_name: displayName })
  return { id: wallet.id, address: wallet.address }
}
