import { createPublicClient, http, formatUnits, decodeFunctionData, erc20Abi } from 'viem'
const c = createPublicClient({ transport: http('https://rpc.moderato.tempo.xyz') })
const hash = process.argv[2] as `0x${string}`
const tx = await c.getTransaction({ hash })
const receipt = await c.getTransactionReceipt({ hash })
console.log('from :', tx.from)
console.log('to   :', tx.to, '(contrato del token)')
console.log('status:', receipt.status, '· block', receipt.blockNumber)
try {
  const d = decodeFunctionData({ abi: erc20Abi, data: tx.input })
  if (d.functionName === 'transfer') {
    console.log('transfer:', formatUnits(d.args[1] as bigint, 6), 'pathUSD →', d.args[0])
  }
} catch { console.log('input:', tx.input.slice(0, 30)) }
