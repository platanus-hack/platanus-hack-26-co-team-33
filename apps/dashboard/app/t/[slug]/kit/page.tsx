import Link from 'next/link'
import { gatewayUrl } from '@/lib/config'
import { cachedScore, checkStatus, prevision, scannableDomain, type OraScore } from '@/lib/ora'
import { currentTenant } from '@/lib/session'
import { store } from '@/lib/store'
import { BotonScore, CopyBlock, PublicarMppscan } from './partes'

export default async function Kit({ params }: PageProps<'/t/[slug]/kit'>) {
  const { slug } = await params
  const tenant = await currentTenant()
  if (!tenant || tenant.slug !== slug) {
    return (
      <p className="text-sm text-muted">
        Necesitás tu API key.{' '}
        <Link href="/acceder" className="text-accent underline">
          Entrar
        </Link>
      </p>
    )
  }

  const routes = await store.listRoutes(tenant.id)
  const base = `${gatewayUrl}/${tenant.slug}`
  const domain = scannableDomain(tenant.originUrl)
  // El kit se aplica en el WEBSITE del negocio (dominio raíz), no en el host de la API.
  const originHost = domain ?? new URL(tenant.originUrl).hostname
  const score = domain ? await cachedScore(domain) : null

  const tieneLlms = checkStatus(score, 'llms-txt-exists') === 'pass'
  const tieneJsonLd = checkStatus(score, 'json-ld') === 'pass'

  const bloques = construirBloques({ tenant: { name: tenant.name, slug: tenant.slug }, base, routes, tieneLlms, tieneJsonLd })

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <Link href={`/t/${tenant.slug}`} className="text-xs text-muted hover:text-text">
          ← {tenant.name}
        </Link>
        <h1 className="mt-2 text-2xl font-medium">Kit agent-ready</h1>
        <p className="mt-2 text-sm text-muted">
          Qué tan lista está <strong>{originHost}</strong> para agentes, y los bloques exactos para
          subir el score. Medido con Ora (ora.ai), el auditor de agent-readiness.
        </p>
      </header>

      <SeccionScore slug={tenant.slug} domain={domain} score={score} />

      <PublicarMppscan slug={tenant.slug} discoveryUrl={`${base}/openapi.json`} />

      <PromptTodoDeUna bloques={bloques} base={base} originHost={originHost} domain={domain} />

      {bloques.map((b) => (
        <CopyBlock key={b.titulo} titulo={b.titulo} detalle={b.detalle} contenido={b.contenido} />
      ))}

      <p className="text-xs text-muted">
        Lo que ya sirve el gateway sin que hagas nada: discovery en{' '}
        <code className="font-mono">{base}/openapi.json</code>, llms.txt en{' '}
        <code className="font-mono">{base}/llms.txt</code> y MCP en{' '}
        <code className="font-mono">{base}/mcp</code>. La capa Payments de Ora (checks de MPP y
        x402) la cubre el gateway solo.
      </p>
    </div>
  )
}

function SeccionScore({
  slug,
  domain,
  score,
}: {
  slug: string
  domain: string | null
  score: OraScore | null
}) {
  if (!domain) {
    return (
      <section className="rounded-lg border border-border bg-panel p-4 text-sm text-muted">
        Tu origin es local, y Ora solo escanea dominios públicos. Cuando tu API tenga dominio,
        acá aparece el score.
      </section>
    )
  }

  if (!score) {
    return (
      <section className="rounded-lg border border-border bg-panel p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Score de agent-readiness</h2>
            <p className="mt-1 text-xs text-muted">
              Todavía no hay score de {domain}. El scan tarda ~30 segundos.
            </p>
          </div>
          <BotonScore slug={slug} label="Correr score" />
        </div>
      </section>
    )
  }

  const p = prevision(score)
  const porBloque = new Map<string, number>()
  for (const a of p.arreglables) {
    porBloque.set(a.bloque, (porBloque.get(a.bloque) ?? 0) + (a.check.estScoreGain ?? a.check.maxScore))
  }

  return (
    <section className="rounded-lg border border-border bg-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium">Score de {score.domain}</h2>
          <p className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl">{p.actual}</span>
            <span className="text-muted">→</span>
            <span className="text-3xl text-accent">~{p.estimado}</span>
            <span className="text-xs text-muted">con el kit aplicado (estimación de Ora)</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded border border-border px-2 py-1 font-mono text-xs">
            {score.grade}
          </span>
          <BotonScore slug={slug} label="Volver a correr" />
        </div>
      </div>
      {porBloque.size > 0 ? (
        <ul className="mt-4 space-y-1 text-xs text-muted">
          {[...porBloque.entries()]
            .sort(([, a], [, b]) => b - a)
            .map(([bloque, gain]) => (
              <li key={bloque}>
                <span className="text-text">{bloque}</span> — +{gain.toFixed(1)} pts
              </li>
            ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-accent">
          Todos los checks que Peaje ataca ya pasan. Queda publicar en los índices.
        </p>
      )}
    </section>
  )
}

type Bloque = { titulo: string; detalle: string; contenido: string }

function construirBloques({
  tenant,
  base,
  routes,
  tieneLlms,
  tieneJsonLd,
}: {
  tenant: { name: string; slug: string }
  base: string
  routes: { method: string; pathPattern: string; priceUsd: string; description: string | null }[]
  tieneLlms: boolean
  tieneJsonLd: boolean
}): Bloque[] {
  const llmsBloque = `## Pagos para agentes (MPP)

- API paga por request: ${base}
- Discovery (OpenAPI + precios): ${base}/openapi.json
- MCP (tools pagas): ${base}/mcp
- Precios: ${base}/llms.txt`

  const llmsCompleto = `# ${tenant.name}

> API con pagos por request para agentes (MPP sobre HTTP 402). Sin API keys ni registro.

${llmsBloque}`

  const jsonLd = `<script type="application/ld+json">
${JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'WebAPI',
      name: tenant.name,
      documentation: `${base}/openapi.json`,
      offers: routes.map((r) => ({
        '@type': 'Offer',
        price: Number(r.priceUsd),
        priceCurrency: 'USD',
        description: r.description ?? `${r.method} ${r.pathPattern}`,
      })),
    },
    null,
    2,
  )}
</script>`

  const pricingMd = `# Precios de la API de ${tenant.name}

Pago por request vía MPP (HTTP 402). Sin suscripción, sin API key: el agente paga y consume.

| Endpoint | Precio |
|---|---|
${routes.map((r) => `| ${r.method} ${r.pathPattern} | $${Number(r.priceUsd)} USD |`).join('\n')}

Gateway: ${base} · Discovery: ${base}/openapi.json`

  const wellKnownMcp = `{
  "servers": [
    {
      "name": "${tenant.slug}",
      "url": "${base}/mcp",
      "transport": "streamable-http",
      "description": "Tools pagas de ${tenant.name} (MPP por JSON-RPC)"
    }
  ]
}`

  const robots = `# Agentes bienvenidos: la API cobra por request vía MPP (HTTP 402)
User-agent: *
Allow: /
# Payment discovery: ${base}/openapi.json`

  return [
    {
      titulo: '1 · llms.txt',
      detalle: tieneLlms
        ? 'Ya tenés llms.txt: agregá este bloque al final del que existe.'
        : 'No tenés llms.txt. Creá el archivo /llms.txt en la raíz de tu dominio con esto.',
      contenido: tieneLlms ? llmsBloque : llmsCompleto,
    },
    {
      titulo: '2 · Link de discovery en tu HTML',
      detalle: 'En el <head> de tu página principal.',
      contenido: `<link rel="payment-discovery" href="${base}/openapi.json">`,
    },
    {
      titulo: '3 · JSON-LD con tu oferta',
      detalle: tieneJsonLd
        ? 'Ya tenés JSON-LD: sumá este bloque WebAPI junto al que existe.'
        : 'No tenés datos estructurados. Pegá esto en el <head> de tu home.',
      contenido: jsonLd,
    },
    {
      titulo: '4 · pricing.md',
      detalle: 'Precios en un archivo que los agentes leen directo. Serví /pricing.md en tu dominio.',
      contenido: pricingMd,
    },
    {
      titulo: '5 · .well-known/mcp.json',
      detalle: 'Anuncia tu MCP pago donde los clientes MCP lo buscan.',
      contenido: wellKnownMcp,
    },
    {
      titulo: '6 · robots.txt que no espanta agentes',
      detalle: 'Si tu robots.txt bloquea bots, los agentes no llegan ni a ver el 402.',
      contenido: robots,
    },
  ]
}

function PromptTodoDeUna({
  bloques,
  base,
  originHost,
  domain,
}: {
  bloques: Bloque[]
  base: string
  originHost: string
  domain: string | null
}) {
  const prompt = `Hacé mi sitio (${originHost}) agent-ready. Mi API ya cobra por request a agentes vía MPP con Peaje; el gateway es ${base}.

Aplicá estos cambios en el repo del sitio:

${bloques.map((b) => `## ${b.titulo}\n${b.detalle}\n\n\`\`\`\n${b.contenido}\n\`\`\``).join('\n\n')}

Al terminar, verificá:
1. npx mppx@latest validate ${base}  (el flujo de pago, debe pasar todo)
2. ${domain ? `npx @ora-ai/ax@0.4 audit ${domain}  (el score de agent-readiness, compará contra el anterior)` : 'cuando el sitio tenga dominio público: npx @ora-ai/ax@0.4 audit <dominio>'}
3. Registrá el servicio en https://www.mppscan.com/register con ${base}/openapi.json

Referencia completa del estándar de auditoría: https://ora.ai/skill.md`

  return (
    <CopyBlock
      titulo="Todo de una · prompt para tu coding agent"
      detalle="Pegalo en Claude Code, Cursor o el agente que uses sobre el repo de tu sitio: aplica los 6 bloques, valida el flujo de pago y re-corre el score."
      contenido={prompt}
    />
  )
}
