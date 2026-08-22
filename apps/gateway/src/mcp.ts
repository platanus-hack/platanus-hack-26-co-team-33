import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Route, Tenant } from '@peaje/db'
import { Mppx, tempo, Transport } from 'mppx/server'
import { z } from 'zod'
import { resolvePayer } from './chain.js'
import { env } from './env.js'
import { proxyToOrigin } from './proxy.js'
import { store } from './store.js'

/**
 * Instancia MPP con transporte MCP: los Challenges viajan como error JSON-RPC
 * -32042 y los Receipts en `_meta`, en vez de headers HTTP.
 */
const mcpMppx = Mppx.create({
  secretKey: env.mppSecretKey,
  methods: [
    tempo.charge({
      testnet: env.testnet,
      currency: env.currency,
      recipient: env.treasuryAddress,
    }),
  ],
  transport: Transport.mcpSdk(),
})

/** `GET /api/empresas/:nit` → `get_api_empresas_by_nit` */
export function toolName(route: Route): string {
  const path = route.pathPattern
    .split('/')
    .filter(Boolean)
    .map((seg) => (seg.startsWith(':') ? `by_${seg.slice(1)}` : seg === '*' ? 'any' : seg))
    .join('_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
  return `${route.method.toLowerCase()}_${path || 'root'}`.slice(0, 60)
}

function pathParams(route: Route): string[] {
  return route.pathPattern
    .split('/')
    .filter((seg) => seg.startsWith(':'))
    .map((seg) => seg.slice(1))
}

/**
 * Construye el MCP server de un tenant: una tool paga por cada ruta con precio.
 * Nombre, descripción y precio salen de la DB; el handler cobra por MPP y
 * después hace proxy al origin, igual que el flujo HTTP.
 */
function buildServer(tenant: Tenant, routes: Route[]): McpServer {
  const server = new McpServer({ name: `${tenant.slug}-peaje`, version: '1.0.0' })

  for (const route of routes) {
    const params = pathParams(route)
    const shape: Record<string, z.ZodType> = {}
    for (const p of params) shape[p] = z.string().describe(`Segmento :${p} de la ruta`)
    shape.query = z
      .record(z.string(), z.string())
      .optional()
      .describe('Query params opcionales para el endpoint')

    server.registerTool(
      toolName(route),
      {
        description: `${route.description ?? `${route.method} ${route.pathPattern}`} · Cuesta $${Number(route.priceUsd)} por llamada (MPP).`,
        inputSchema: shape,
      },
      async (args: Record<string, unknown>, extra) => {
        const result = await mcpMppx.charge({
          amount: route.priceUsd,
          description: route.description ?? `${tenant.name} · ${route.pathPattern}`,
        })(extra)

        if (result.status === 402) throw result.challenge

        // Reconstruye el path real reemplazando :params con los argumentos.
        let path = route.pathPattern
        for (const p of params) path = path.replace(`:${p}`, encodeURIComponent(String(args[p] ?? '')))
        const query = new URLSearchParams((args.query as Record<string, string>) ?? {})
        const url = `http://origin.internal${path}${query.size ? `?${query}` : ''}`

        const upstream = await proxyToOrigin(new Request(url, { method: route.method }), tenant, path)
        const body = await upstream.text()

        const sealed = result.withReceipt({
          content: [{ type: 'text' as const, text: body }],
        })

        // Acredita el pago al ledger, mismo tratamiento que el flujo HTTP.
        const receipt = (sealed._meta?.['org.paymentauth/receipt'] ?? {}) as { reference?: string }
        if (receipt.reference) {
          const payment = await store.recordPayment({
            tenantId: tenant.id,
            routeId: route.id,
            path: `mcp:${toolName(route)}`,
            agentWallet: null,
            amount: route.priceUsd,
            receiptRef: receipt.reference,
            method: 'tempo',
          })
          void resolvePayer(receipt.reference).then((wallet) => {
            if (wallet) void store.setPaymentWallet(payment.id, wallet).catch(() => {})
          })
        }

        return sealed
      },
    )
  }

  return server
}

/**
 * Maneja un request MCP (Streamable HTTP, modo stateless: un server y un
 * transport nuevos por request, sin sesiones).
 */
export async function handleMcpRequest(
  tenant: Tenant,
  incoming: import('node:http').IncomingMessage,
  outgoing: import('node:http').ServerResponse,
  body: unknown,
): Promise<void> {
  const routes = await store.listRoutes(tenant.id)
  const server = buildServer(tenant, routes)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  outgoing.on('close', () => {
    void transport.close()
    void server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(incoming, outgoing, body)
}

/** id único para nombrar requests MCP en logs. */
export const mcpRequestId = () => randomUUID().slice(0, 8)
