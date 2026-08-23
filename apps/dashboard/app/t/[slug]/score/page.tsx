import { requireTenant } from '@/lib/session'
import { cachedScore, gradeDe, prevision, scannableDomain, type OraScore } from '@/lib/ora'
import { BotonScore } from '../kit/partes'

export default async function Score({ params }: PageProps<'/t/[slug]/score'>) {
  const { slug } = await params
  const tenant = await requireTenant(slug)
  const domain = scannableDomain(tenant.originUrl)
  const score = domain ? await cachedScore(domain) : null

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-medium">Score</h1>
        <p className="mt-2 text-sm text-muted">
          Qué tan listo está tu sitio para agentes, medido con Ora (ora.ai).
        </p>
      </header>

      {!domain ? (
        <p className="rounded-lg border border-border bg-panel p-4 text-sm text-muted">
          Tu origin es local y Ora solo escanea dominios públicos. Cuando tu API tenga dominio,
          aquí aparece el score.
        </p>
      ) : !score ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-panel p-4">
          <p className="text-sm text-muted">
            Todavía no hay score de <strong className="text-text">{domain}</strong>. El scan tarda
            ~30 segundos.
          </p>
          <BotonScore slug={tenant.slug} label="Correr score" />
        </div>
      ) : (
        <Resultado slug={tenant.slug} score={score} />
      )}
    </div>
  )
}

function Resultado({ slug, score }: { slug: string; score: OraScore }) {
  const p = prevision(score)

  const bien: { id: string; name: string }[] = []
  for (const layer of score.layers) {
    for (const check of layer.checks) {
      if (check.status === 'pass') bien.push({ id: check.id, name: check.name })
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{score.domain}</p>
            <p className="mt-2 flex items-center gap-3">
              <span className="text-5xl">{p.actual}</span>
              <span className="rounded border border-border px-2 py-0.5 font-mono text-sm">
                {score.grade}
              </span>
              <span className="text-muted">→</span>
              <span className="text-5xl text-accent">~{p.estimado}</span>
              <span className="rounded border border-accent/50 px-2 py-0.5 font-mono text-sm text-accent">
                {gradeDe(p.estimado)}
              </span>
            </p>
            <p className="mt-2 text-xs text-muted">hoy vs. con Peaje y el kit aplicado</p>
          </div>
          <BotonScore slug={slug} label="Volver a correr" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section>
          <h2 className="font-medium text-green-400">Lo que ya tienes bien</h2>
          <p className="mt-1 text-xs text-muted">{bien.length} checks pasando</p>
          <div className="relative mt-3">
            <ul className="scroll-thin max-h-96 space-y-1.5 overflow-y-auto pr-2">
              {bien.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                  {c.name}
                </li>
              ))}
            </ul>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-bg to-transparent" />
          </div>
        </section>

        <section>
          <h2 className="font-medium text-red-400">Lo que mejoras con Peaje</h2>
          <p className="mt-1 text-xs text-muted">
            {p.arreglables.length} checks que el kit y el gateway atacan
          </p>
          <div className="relative mt-3">
            <ul className="scroll-thin max-h-96 space-y-1.5 overflow-y-auto pr-2">
              {p.arreglables
                .sort(
                  (a, b) =>
                    (b.check.estScoreGain ?? b.check.maxScore) -
                    (a.check.estScoreGain ?? a.check.maxScore),
                )
                .map((a) => (
                  <li key={a.check.id} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    <span className="flex-1">{a.check.name}</span>
                    <span className="font-mono text-xs text-muted">
                      +{(a.check.estScoreGain ?? a.check.maxScore).toFixed(1)}
                    </span>
                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
                      {a.viaGateway ? 'gateway' : a.bloque}
                    </span>
                  </li>
                ))}
            </ul>
            {p.arreglables.length > 0 ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-bg to-transparent" />
            ) : null}
          </div>
          {p.arreglables.length === 0 ? (
            <p className="mt-3 text-sm text-accent">
              Todos los checks que Peaje ataca ya pasan.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
