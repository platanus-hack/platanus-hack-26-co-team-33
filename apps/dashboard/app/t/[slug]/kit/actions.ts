'use server'

import { revalidatePath } from 'next/cache'
import { freshScan, scannableDomain } from '@/lib/ora'
import { requireTenant } from '@/lib/session'

/** Corre (o re-corre) el scan de Ora sobre el dominio del tenant. ~30 s. */
export async function correrScore(slug: string): Promise<{ ok: boolean; error?: string }> {
  const tenant = await requireTenant(slug)
  const domain = scannableDomain(tenant.originUrl)
  if (!domain) {
    return { ok: false, error: 'Ora solo escanea dominios públicos; tu origin es local.' }
  }
  const result = await freshScan(domain)
  if (!result) return { ok: false, error: 'El scan de Ora falló. Reintenta en un rato.' }
  revalidatePath(`/t/${slug}/kit`)
  return { ok: true }
}

export type ChequeoIntegracion = {
  id: string
  label: string
  ok: boolean
  detalle: string
}

async function fetchCorto(url: string): Promise<{ ok: boolean; text: string }> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
      headers: { 'user-agent': 'peaje-verificador/1.0' },
    })
    if (!res.ok) return { ok: false, text: '' }
    return { ok: true, text: await res.text() }
  } catch {
    return { ok: false, text: '' }
  }
}

/**
 * "Ya lo integré": verifica desde nuestro lado qué bloques del kit están
 * realmente publicados en el dominio del tenant. Cada chequeo hace un fetch
 * real; verde solo si el archivo existe Y referencia al gateway de Peaje.
 */
export async function verificarIntegracion(slug: string): Promise<ChequeoIntegracion[]> {
  const tenant = await requireTenant(slug)
  const { scannableDomain } = await import('@/lib/ora')
  const domain = scannableDomain(tenant.originUrl)
  if (!domain) {
    return [
      {
        id: 'dominio',
        label: 'Dominio público',
        ok: false,
        detalle: 'Tu origin es local: no hay dominio público que verificar.',
      },
    ]
  }

  const site = `https://${domain}`
  const gatewayMark = `/${tenant.slug}`

  const [home, llms, pricing, aiCatalog, agentCard, apiCatalog, authMd, agentsMd, mcpJson, robots] =
    await Promise.all([
      fetchCorto(site),
      fetchCorto(`${site}/llms.txt`),
      fetchCorto(`${site}/pricing.md`),
      fetchCorto(`${site}/.well-known/ai-catalog.json`),
      fetchCorto(`${site}/.well-known/agent-card.json`),
      fetchCorto(`${site}/.well-known/api-catalog`),
      fetchCorto(`${site}/auth.md`),
      fetchCorto(`${site}/agents.md`),
      fetchCorto(`${site}/.well-known/mcp.json`),
      fetchCorto(`${site}/robots.txt`),
    ])

  const refiere = (r: { ok: boolean; text: string }) => r.ok && r.text.includes(gatewayMark)

  return [
    {
      id: 'llms',
      label: 'llms.txt',
      ok: refiere(llms),
      detalle: llms.ok
        ? refiere(llms)
          ? 'Existe y apunta a tu gateway.'
          : 'Existe pero no menciona tu gateway: falta el bloque de Peaje.'
        : 'No hay /llms.txt en tu dominio.',
    },
    {
      id: 'link-discovery',
      label: 'Link de discovery en el HTML',
      ok: home.ok && home.text.includes('payment-discovery'),
      detalle: home.ok
        ? home.text.includes('payment-discovery')
          ? 'La home tiene el <link rel="payment-discovery">.'
          : 'La home carga pero no tiene el link de discovery.'
        : 'No pude leer tu home.',
    },
    {
      id: 'json-ld',
      label: 'JSON-LD',
      ok: home.ok && home.text.includes('application/ld+json'),
      detalle:
        home.ok && home.text.includes('application/ld+json')
          ? 'La home tiene datos estructurados.'
          : 'La home no tiene el bloque JSON-LD.',
    },
    {
      id: 'pricing',
      label: 'pricing.md',
      ok: refiere(pricing),
      detalle: pricing.ok
        ? refiere(pricing)
          ? 'Existe con tus precios.'
          : 'Existe pero no es el de Peaje.'
        : 'No hay /pricing.md.',
    },
    {
      id: 'mcp-json',
      label: '.well-known/mcp.json',
      ok: refiere(mcpJson),
      detalle: refiere(mcpJson) ? 'Anuncia tu MCP pago.' : 'Falta o no apunta a tu MCP.',
    },
    {
      id: 'ai-catalog',
      label: '.well-known/ai-catalog.json',
      ok: refiere(aiCatalog),
      detalle: refiere(aiCatalog) ? 'Catálogo ARD publicado.' : 'Falta el catálogo ARD.',
    },
    {
      id: 'agent-card',
      label: '.well-known/agent-card.json',
      ok: refiere(agentCard),
      detalle: refiere(agentCard) ? 'Agent card A2A publicada.' : 'Falta la agent card.',
    },
    {
      id: 'api-catalog',
      label: '.well-known/api-catalog',
      ok: refiere(apiCatalog),
      detalle: refiere(apiCatalog) ? 'Catálogo RFC 9727 publicado.' : 'Falta el api-catalog.',
    },
    {
      id: 'auth-md',
      label: 'auth.md',
      ok: refiere(authMd),
      detalle: refiere(authMd) ? 'Walkthrough de pago publicado.' : 'Falta /auth.md.',
    },
    {
      id: 'agents-md',
      label: 'agents.md',
      ok: refiere(agentsMd),
      detalle: refiere(agentsMd) ? 'Guía para agentes publicada.' : 'Falta /agents.md.',
    },
    {
      id: 'robots',
      label: 'robots.txt',
      ok: robots.ok,
      detalle: robots.ok ? 'Existe (revisa que no bloquee bots).' : 'No hay /robots.txt.',
    },
  ]
}
