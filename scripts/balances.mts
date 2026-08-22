import { createPublicClient, http, erc20Abi, formatUnits } from 'viem'
const c = createPublicClient({ transport: http('https://rpc.moderato.tempo.xyz') })
const tokens: Record<string, `0x${string}`> = {
  pathUsd: '0x20c0000000000000000000000000000000000000',
  usdc: '0x20C000000000000000000000b9537d11c60E8b50',
}
const who: `0x${string}`[] = [
  '0x90cdf4582826720E3b965C92eB4F12232027e268',
  '0x3715986D44f5d56BC6ae3E983D1928CEc37dE253',
]
for (const w of who) {
  for (const [name, addr] of Object.entries(tokens)) {
    try {
      const b = await c.readContract({ address: addr, abi: erc20Abi, functionName: 'balanceOf', args: [w] })
      const d = await c.readContract({ address: addr, abi: erc20Abi, functionName: 'decimals' })
      console.log(w.slice(0, 10), name.padEnd(8), formatUnits(b as bigint, d as number))
    } catch (e) {
      console.log(w.slice(0, 10), name.padEnd(8), 'ERR', (e as Error).message.split('\n')[0])
    }
  }
}
