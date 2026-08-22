/**
 * Agente MCP de prueba: descubre las tools pagas de un tenant, invoca una,
 * paga el challenge por JSON-RPC y muestra el recurso + receipt.
 *
 * Uso: pnpm exec tsx scripts/mcp-agent.mts <slug> <tool> [json-args]
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { tempo } from 'mppx/client'
import { McpClient } from 'mppx/mcp/client'
import { createClient, http } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { tempoModerato } from 'viem/chains'
import { Actions } from 'viem/tempo'

const [slug = 'clima-andino', tool, rawArgs] = process.argv.slice(2)
const gateway = process.env.GATEWAY_URL ?? 'http://localhost:8787'

// Wallet efímera del agente, fondeada por el faucet de Tempo testnet.
const pk = (process.env.AGENT_PRIVATE_KEY as `0x${string}`) ?? generatePrivateKey()
const account = privateKeyToAccount(pk)
console.log(`agente ${account.address}${process.env.AGENT_PRIVATE_KEY ? '' : ' (efímera)'}`)

if (!process.env.AGENT_PRIVATE_KEY) {
  const faucetClient = createClient({ chain: tempoModerato, transport: http() })
  console.log('fondeando por faucet…')
  await Actions.faucet.fundSync(faucetClient, { account: account.address })
  console.log('fondeada ✓')
}

const client = new Client({ name: 'peaje-test-agent', version: '1.0.0' })
await client.connect(new StreamableHTTPClientTransport(new URL(`${gateway}/${slug}/mcp`)))

McpClient.wrap(client, {
  methods: [tempo({ account })],
})

const tools = await client.listTools()
console.log(`\ntools de ${slug}:`)
for (const t of tools.tools) console.log(`  · ${t.name} — ${t.description}`)

const target = tool ?? tools.tools[0]?.name
if (!target) {
  console.log('el tenant no tiene tools pagas')
  process.exit(0)
}

console.log(`\ninvocando ${target}…`)
const result = await client.callTool({
  name: target,
  arguments: rawArgs ? JSON.parse(rawArgs) : {},
})

const text = (result.content as { type: string; text?: string }[] | undefined)
  ?.filter((c) => c.type === 'text')
  .map((c) => c.text)
  .join('\n')
console.log('\nresultado:', text?.slice(0, 300))
console.log('\nreceipt:', JSON.stringify(result.receipt ?? null))
process.exit(0)
