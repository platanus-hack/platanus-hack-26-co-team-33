import { serve } from '@hono/node-server'
import { TOKEN_DECIMALS, txExplorerUrl } from '@peaje/shared'
import { Hono } from 'hono'
import { generate } from 'mppx/discovery'
import { creditReceipt } from './charge.js'
import { env } from './env.js'
import { mppx } from './mpp.js'
import { store } from './store.js'

const app = new Hono()

app.get('/health', (c) => c.json({ ok: true, network: env.testnet ? 'testnet' : 'mainnet' }))

const DEMO_PRICE = '0.05'

/**
 * M1: un endpoint pago hardcodeado. Cobra 0.05 y sirve el recurso del origin.
 * M2 reemplaza esto por resolución multi-tenant `/:slug/*` con precios de la DB.
 */
app.get('/demo/data', async (c) => {
  const result = await mppx.charge({
    amount: DEMO_PRICE,
    description: 'Datos demo',
  })(c.req.raw)

  if (result.status === 402) return result.challenge

  const upstream = await fetch(`${env.demoOrigin}/1024/1024`)
  const sealed = result.withReceipt(
    Response.json({
      source: 'demo',
      url: upstream.url,
      servedAt: new Date().toISOString(),
    }),
  )

  await creditReceipt(sealed, {
    tenantId: 'demo',
    routeId: null,
    path: new URL(c.req.url).pathname,
    priceUsd: DEMO_PRICE,
  })

  return sealed
})

/**
 * Documento de discovery MPP. Los clientes y agentes lo leen para saber
 * qué rutas cobran y cuánto, sin tener que provocar un 402 primero.
 * En M2 las rutas salen de la DB por tenant.
 */
app.get('/openapi.json', (c) =>
  c.json(
    generate(mppx, {
      info: { title: 'Agentic Finance Gateway', version: '0.1.0' },
      routes: [
        {
          intent: 'charge',
          method: 'GET',
          path: '/demo/data',
          options: {
            amount: DEMO_PRICE,
            currency: env.currency,
            decimals: TOKEN_DECIMALS,
            recipient: env.treasuryAddress,
            description: 'Datos demo',
          },
          summary: 'Datos demo',
        },
      ],
    }),
  ),
)

/** Ledger interno: verifica que el Receipt quedó acreditado al tenant. */
app.get('/_debug/payments', async (c) => {
  const tenantId = c.req.query('tenant') ?? 'demo'
  const payments = await store.listPayments(tenantId)
  return c.json({
    balance: await store.balance(tenantId),
    payments: payments.map((p) => ({ ...p, explorer: txExplorerUrl(p.receiptRef, env.testnet) })),
  })
})

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`[gateway] escuchando en http://localhost:${info.port}`)
  console.log(`[gateway] treasury ${env.treasuryAddress} · currency ${env.currency}`)
})
