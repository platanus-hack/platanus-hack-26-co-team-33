import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { empresas, indicadores } from './data.js'

/**
 * DataLatam: el cliente ficticio del demo. Una empresa de datos LATAM con una
 * API normal, sin una línea de código de pagos. Peaje la envuelve por fuera.
 */
const app = new Hono()
const gateway = process.env.PEAJE_GATEWAY_URL ?? 'http://localhost:8787/datalatam'

app.get('/', (c) =>
  c.html(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DataLatam · Datos macro y de empresas de LATAM</title>
  <link rel="payment-discovery" href="${gateway}/openapi.json" />
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #0b0d10; color: #e8eaed; }
    main { max-width: 720px; margin: 0 auto; padding: 4rem 1.5rem; }
    h1 { font-size: 2.2rem; margin: 0; }
    .tag { color: #66d9a5; font-family: ui-monospace, monospace; font-size: .8rem; }
    p.lead { color: #9aa2ad; font-size: 1.05rem; }
    code, pre { font-family: ui-monospace, monospace; background: #14181d; border: 1px solid #232a32; border-radius: 8px; }
    pre { padding: 1rem; overflow-x: auto; font-size: .85rem; line-height: 1.5; }
    code { padding: .1rem .35rem; font-size: .85em; }
    section { margin-top: 2.5rem; }
    h2 { font-size: 1.1rem; }
    .precio { color: #66d9a5; }
  </style>
</head>
<body>
  <main>
    <span class="tag">datalatam</span>
    <h1>Datos macro y de empresas de LATAM</h1>
    <p class="lead">Indicadores económicos de 5 países y fichas de empresas colombianas.
    Para humanos y para agentes: los agentes pagan por request, sin API key ni registro.</p>

    <section>
      <h2>Para agentes</h2>
      <pre># paga por request con cualquier cliente MPP
npx mppx ${gateway}/api/indicadores/colombia

# o usá las tools MCP
${gateway}/mcp</pre>
      <p>Precios: indicadores <span class="precio">$0.05</span> · ficha de empresa <span class="precio">$0.15</span>.
      Discovery en <code>${gateway}/openapi.json</code></p>
    </section>

    <section>
      <h2>Endpoints</h2>
      <pre>GET /api/indicadores/:pais   colombia · mexico · chile · argentina · peru
GET /api/empresas/:nit       ficha por NIT</pre>
    </section>
  </main>
</body>
</html>`),
)

app.get('/api/indicadores/:pais', (c) => {
  const pais = c.req.param('pais').toLowerCase()
  const data = indicadores[pais]
  if (!data) return c.json({ error: `Sin datos para "${pais}"`, disponibles: Object.keys(indicadores) }, 404)
  return c.json({ pais, actualizado: new Date().toISOString().slice(0, 10), indicadores: data })
})

app.get('/api/empresas/:nit', (c) => {
  const nit = c.req.param('nit')
  const data = empresas[nit]
  if (!data) return c.json({ error: `Sin ficha para el NIT ${nit}`, ejemplo: '900123456' }, 404)
  return c.json({ nit, ...data })
})

const port = Number(process.env.PORT ?? 3001)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[datalatam] http://localhost:${info.port}`)
})
