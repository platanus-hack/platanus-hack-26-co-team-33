import { Mppx, tempo } from 'mppx/server'
import { env } from './env.js'

/**
 * Instancia única de MPP del gateway.
 *
 * `recipient` es siempre la treasury de la plataforma: el reparto por tenant
 * ocurre en el ledger interno, no on-chain.
 */
export const mppx = Mppx.create({
  secretKey: env.mppSecretKey,
  methods: [
    tempo.charge({
      testnet: env.testnet,
      currency: env.currency,
      recipient: env.treasuryAddress,
    }),
  ],
})
