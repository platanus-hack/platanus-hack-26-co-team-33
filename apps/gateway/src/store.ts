import { MemoryStore } from '@peaje/db'

/** M1 corre con store en memoria; M2 lo cambia por Supabase sin tocar los callers. */
export const store = new MemoryStore()

store.seedTenant(
  {
    id: 'demo',
    slug: 'demo',
    name: 'Demo',
    originUrl: 'https://picsum.photos',
    payoutWallet: null,
    createdAt: new Date().toISOString(),
  },
  [],
)
