/**
 * Siembra tenants de demo. Idempotente por slug: si ya existe, no lo recrea.
 * Correr: pnpm exec tsx --env-file=.env scripts/seed.mts
 */
import { getStore } from '@peaje/db'
import { apiKeyPrefix, generateApiKey, generateEmbedSecret, hashApiKey } from '@peaje/shared'

const store = getStore()

const seeds = [
  {
    slug: 'demo',
    name: 'Demo',
    originUrl: 'https://picsum.photos',
    origins: [],
    routes: [{ method: 'GET', pathPattern: '/*', priceUsd: '0.05', description: 'Recurso demo' }],
  },
]

for (const seed of seeds) {
  const existing = await store.getTenantBySlug(seed.slug)
  if (existing) {
    console.log(`· ${seed.slug} ya existe (${existing.id})`)
    continue
  }

  const apiKey = generateApiKey()
  const tenant = await store.createTenant({
    slug: seed.slug,
    name: seed.name,
    originUrl: seed.originUrl,
    apiKeyHash: await hashApiKey(apiKey),
    apiKeyPrefix: apiKeyPrefix(apiKey),
    embedSecret: generateEmbedSecret(),
  })

  for (const origin of seed.origins) await store.addAllowedOrigin(tenant.id, origin)
  for (const route of seed.routes) await store.createRoute({ tenantId: tenant.id, ...route })

  console.log(`✓ ${seed.slug} creado`)
  console.log(`  id       ${tenant.id}`)
  console.log(`  api key  ${apiKey}   (se muestra una sola vez)`)
  console.log(`  origin   ${tenant.originUrl}`)
}
