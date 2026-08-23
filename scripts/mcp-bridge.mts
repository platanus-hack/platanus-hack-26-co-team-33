/**
 * Bridge stdio → MCP pago de Peaje.
 *
 * Claude (Desktop o Code) habla stdio con este proceso; el bridge reenvía cada
 * tool call al MCP del tenant y paga los challenges MPP con la wallet del
 * agente. Claude ve tools normales; los pagos pasan por debajo.
 *
 * Registro en Claude Code:
 *   claude mcp add clima-andino -e AGENT_PRIVATE_KEY=0x... -- \
 *     pnpm exec tsx scripts/mcp-bridge.mts http://localhost:8787/clima-andino/mcp
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { tempo } from 'mppx/client'
import { McpClient } from 'mppx/mcp/client'
import { createClient, http } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { tempoModerato } from 'viem/chains'
import { Actions } from 'viem/tempo'

const url = process.argv[2]
if (!url) {
  console.error('uso: tsx scripts/mcp-bridge.mts <url-del-mcp-del-tenant>')
  process.exit(1)
}

const pk = (process.env.AGENT_PRIVATE_KEY as `0x${string}`) ?? generatePrivateKey()
const account = privateKeyToAccount(pk)
if (!process.env.AGENT_PRIVATE_KEY) {
  console.error(`[bridge] wallet efímera ${account.address}, fondeando por faucet…`)
  const faucet = createClient({ chain: tempoModerato, transport: http() })
  await Actions.faucet.fundSync(faucet, { account: account.address })
}

const remote = new Client({ name: 'peaje-bridge', version: '1.0.0' })
await remote.connect(new StreamableHTTPClientTransport(new URL(url)))
McpClient.wrap(remote, { methods: [tempo({ account })] })

const server = new Server(
  { name: 'peaje-bridge', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const { tools } = await remote.listTools()
  return { tools }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await remote.callTool({
    name: request.params.name,
    arguments: request.params.arguments ?? {},
  })
  const receipt = result.receipt
  if (receipt) console.error(`[bridge] pagado · tx ${receipt.reference}`)
  return { content: result.content ?? [], isError: result.isError }
})

await server.connect(new StdioServerTransport())
console.error(`[bridge] listo · ${url} · wallet ${account.address}`)
