import { Receipt } from 'mppx'
import { resolvePayer } from './chain.js'
import { store } from './store.js'

export type ChargeContext = {
  tenantId: string
  routeId: string | null
  path: string
  priceUsd: string
}

/**
 * Toma la respuesta ya sellada con `Payment-Receipt` y acredita el pago
 * al tenant en el ledger interno.
 *
 * Se hace acá (y no en el hook `onPaymentSuccess` del SDK) porque este scope
 * es el único que conoce el tenant, la ruta y el precio en decimal: el Receipt
 * solo trae método, referencia y timestamp.
 */
export async function creditReceipt(response: Response, ctx: ChargeContext): Promise<void> {
  const header = response.headers.get('Payment-Receipt')
  if (!header) {
    console.warn('[charge] respuesta sin Payment-Receipt para', ctx.path)
    return
  }

  const receipt = Receipt.deserialize(header)
  const payment = await store.recordPayment({
    tenantId: ctx.tenantId,
    routeId: ctx.routeId,
    path: ctx.path,
    agentWallet: null,
    amount: ctx.priceUsd,
    receiptRef: receipt.reference,
    method: receipt.method,
  })

  console.log('[charge] pago acreditado', {
    tenant: ctx.tenantId,
    path: ctx.path,
    amount: ctx.priceUsd,
    ref: receipt.reference,
  })

  // La wallet del agente sale de la tx on-chain; no bloqueamos la respuesta por eso.
  void resolvePayer(receipt.reference).then((wallet) => {
    if (wallet) void store.setPaymentWallet(payment.id, wallet)
  })
}
