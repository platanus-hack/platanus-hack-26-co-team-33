import { serve } from '@hono/node-server'
import { TOKEN_DECIMALS, txExplorerUrl } from '@peaje/shared'
import { Hono } from 'hono'
import { generate } from 'mppx/discovery'
import { creditReceipt } from './charge.js'
import { env } from './env.js'
import { mppx } from './mpp.js'
import { proxyToOrigin } from './proxy.js'
import { matchRoute } from './router.js'
import { store } from './store.js'

const app = new Hono()

app.get('/health', (c) => c.json({ ok: true, network: env.testnet ? 'testnet' : 'mainnet' }))

/**
 * Discovery MPP por tenant. Un agente lee esto y sabe qué rutas cobran
 * y cuánto, sin tener que provocar un 402 primero.
 */
app.get('/:slug/openapi.json', async (c) => {
  const slug = c.req.param('slug')
  const tenant = await store.getTenantBySlug(slug)
  if (!tenant) return c.json({ error: 'Tenant no encontrado' }, 404)

  const routes = await store.listRoutes(tenant.id)
  return c.json(
    generate(mppx, {
      info: { title: `${tenant.name} · Peaje`, version: '1.0.0' },
      routes: routes.map((route) => ({
        intent: 'charge',
        method: route.method,
        path: `/${tenant.slug}${route.pathPattern}`,
        options: {
          amount: route.priceUsd,
          currency: env.currency,
          decimals: TOKEN_DECIMALS,
          recipient: env.treasuryAddress,
          description: route.description ?? `${route.method} ${route.pathPattern}`,
        },
        summary: route.description ?? undefined,
      })),
    }),
  )
})

/** Ledger interno del tenant. Lo consume el dashboard. */
app.get('/_internal/:slug/ledger', async (c) => {
  const tenant = await store.getTenantBySlug(c.req.param('slug'))
  if (!tenant) return c.json({ error: 'Tenant no encontrado' }, 404)
  const payments = await store.listPayments(tenant.id)
  return c.json({
    balance: await store.balance(tenant.id),
    payments: payments.map((p) => ({ ...p, explorer: txExplorerUrl(p.receiptRef, env.testnet) })),
  })
})

/**
 * Gateway multi-tenant: `/{slug}/<lo que sea>`.
 *
 * Resuelve el tenant por slug, busca si el path tiene precio configurado.
 * Con precio: cobra por MPP y recién ahí llama al origin. Sin precio:
 * pasa derecho, gratis. El tenant decide qué cobra desde el dashboard.
 */
app.all('/:slug/*', async (c) => {
  const slug = c.req.param('slug')
  const tenant = await store.getTenantBySlug(slug)
  if (!tenant) return c.json({ error: `Tenant "${slug}" no encontrado` }, 404)

  const url = new URL(c.req.url)
  const path = url.pathname.slice(`/${slug}`.length) || '/'
  const routes = await store.listRoutes(tenant.id)
  const match = matchRoute(routes, c.req.method, path)

  if (!match) return proxyToOrigin(c.req.raw, tenant, path)

  const result = await mppx.charge({
    amount: match.route.priceUsd,
    description: match.route.description ?? `${tenant.name} · ${path}`,
  })(c.req.raw)

  if (result.status === 402) return result.challenge

  const upstream = await proxyToOrigin(c.req.raw, tenant, path)
  const sealed = result.withReceipt(upstream)

  await creditReceipt(sealed, {
    tenantId: tenant.id,
    routeId: match.route.id,
    path,
    priceUsd: match.route.priceUsd,
  })

  return sealed
})

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`[gateway] escuchando en http://localhost:${info.port}`)
  console.log(`[gateway] treasury ${env.treasuryAddress} · currency ${env.currency}`)
})
