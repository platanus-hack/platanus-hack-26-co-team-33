import { serve, type HttpBindings } from '@hono/node-server'
import { RESPONSE_ALREADY_SENT } from '@hono/node-server/utils/response'
import { TOKEN_DECIMALS, txExplorerUrl } from '@peaje/shared'
import { Hono } from 'hono'
import { generate } from 'mppx/discovery'
import { creditReceipt } from './charge.js'
import { env } from './env.js'
import { mppx } from './mpp.js'
import { proxyToOrigin } from './proxy.js'
import { matchRoute } from './router.js'
import { store } from './store.js'
import { handleMcpRequest } from './mcp.js'
import * as wk from './wellknown.js'
import { withdrawals } from './withdrawals.js'

const app = new Hono<{ Bindings: HttpBindings }>()

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
  const doc = generate(mppx, {
      info: { title: `${tenant.name} · Peaje`, version: '1.0.0' },
      routes: routes.map((route) => ({
        intent: 'charge',
        method: route.method,
        path: route.pathPattern,
        options: {
          amount: route.priceUsd,
          currency: env.currency,
          decimals: TOKEN_DECIMALS,
          recipient: env.treasuryAddress,
          description: route.description ?? `${route.method} ${route.pathPattern}`,
        },
        summary: route.description ?? undefined,
      })),
    })
  // Los paths van sin el slug; la base la declara `servers`, como manda OpenAPI.
  doc.servers = [{ url: `${new URL(c.req.url).origin}/${tenant.slug}` }]
  return c.json(doc)
})

app.route('/_internal', withdrawals)

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
 * Link headers (RFC 8288) en todas las respuestas de tenant: los agentes
 * encuentran el discovery sin parsear ni una página.
 */
app.use('/:slug/*', async (c, next) => {
  await next()
  const slug = c.req.param('slug')
  const origin = new URL(c.req.url).origin
  c.res.headers.append(
    'Link',
    `<${origin}/${slug}/llms.txt>; rel="describedby", <${origin}/${slug}/.well-known/ai-catalog.json>; rel="ai-catalog", <${origin}/${slug}/openapi.json>; rel="service-desc"`,
  )
})

/** Archivos de agent-readiness por tenant. Ver wellknown.ts: cada uno mapea a un check de Ora. */
const WELL_KNOWN: Record<string, { builder: (ctx: { tenant: Parameters<typeof wk.llmsTxt>[0]['tenant']; routes: Parameters<typeof wk.llmsTxt>[0]['routes']; base: string }) => string | Record<string, unknown>; contentType: string }> = {
  'auth.md': { builder: wk.authMd, contentType: 'text/markdown; charset=utf-8' },
  'agents.md': { builder: wk.agentsMd, contentType: 'text/markdown; charset=utf-8' },
  'pricing.md': { builder: wk.pricingMd, contentType: 'text/markdown; charset=utf-8' },
  '.well-known/ai-catalog.json': { builder: wk.aiCatalog, contentType: 'application/json' },
  '.well-known/agent-card.json': { builder: wk.agentCard, contentType: 'application/json' },
  '.well-known/api-catalog': { builder: wk.apiCatalog, contentType: 'application/linkset+json' },
  '.well-known/mcp/server-card.json': { builder: wk.mcpServerCard, contentType: 'application/json' },
}

for (const [path, def] of Object.entries(WELL_KNOWN)) {
  app.get(`/:slug/${path}`, async (c) => {
    const tenant = await store.getTenantBySlug(c.req.param('slug'))
    if (!tenant) return c.json({ error: 'Tenant no encontrado' }, 404)
    const routes = await store.listRoutes(tenant.id)
    const base = `${new URL(c.req.url).origin}/${tenant.slug}`
    const body = def.builder({ tenant, routes, base })
    return typeof body === 'string'
      ? c.text(body, 200, { 'content-type': def.contentType })
      : c.json(body)
  })
}

/**
 * llms.txt por tenant: el archivo que leen los agentes que navegan en vez de
 * llamar APIs. Apunta al discovery doc y al MCP. El tenant puede linkearlo o
 * copiarlo a su propio dominio.
 */
app.get('/:slug/llms.txt', async (c) => {
  const tenant = await store.getTenantBySlug(c.req.param('slug'))
  if (!tenant) return c.text('Tenant no encontrado', 404)
  const routes = await store.listRoutes(tenant.id)
  const base = `${new URL(c.req.url).origin}/${tenant.slug}`
  return c.text(wk.llmsTxt({ tenant, routes, base }), 200, {
    'content-type': 'text/markdown; charset=utf-8',
  })
})
/**
 * MCP por tenant: las rutas con precio del tenant expuestas como tools pagas
 * sobre Streamable HTTP. Un agente MCP las descubre, paga por JSON-RPC y
 * recibe el recurso, sin conocer la API HTTP.
 */
app.post('/:slug/mcp', async (c) => {
  const tenant = await store.getTenantBySlug(c.req.param('slug'))
  if (!tenant) return c.json({ error: 'Tenant no encontrado' }, 404)
  const body = await c.req.json().catch(() => undefined)
  await handleMcpRequest(tenant, c.env.incoming, c.env.outgoing, body)
  return RESPONSE_ALREADY_SENT
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
  if (!tenant) {
    return c.json(
      {
        error: `Tenant "${slug}" no encontrado`,
        hint: 'El primer segmento del path es el slug del negocio. Revisa el gateway URL en tu discovery.',
      },
      404,
    )
  }

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
