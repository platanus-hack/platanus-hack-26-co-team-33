import Link from 'next/link'
import { txExplorerUrl } from '@peaje/shared'
import { gatewayUrl, money, shortWallet } from '@/lib/config'
import { cachedScore, prevision, scannableDomain, type OraScore } from '@/lib/ora'
import { currentTenant } from '@/lib/session'
import { store } from '@/lib/store'
import { GraficaRevenue } from './grafica'
import { BotonScore } from './kit/partes'
import { RetirosPanel } from './retiros'
import { RutasPanel } from './rutas'
import { derivarPasos, Stepper } from './stepper'
import { WalletForm } from './wallet'

export default async function Panel({ params }: PageProps<'/t/[slug]'>) {
  const { slug } = await params
  const tenant = await currentTenant()

  if (!tenant || tenant.slug !== slug) return <SinSesion slug={slug} />

  const domain = scannableDomain(tenant.originUrl)
  const [routes, balance, payments, retiros, porDia, score] = await Promise.all([
    store.listRoutes(tenant.id),
    store.balance(tenant.id),
    store.listPayments(tenant.id, 10),
    store.listWithdrawals(tenant.id, 8),
    store.dailyRevenue(tenant.id, 7),
    domain ? cachedScore(domain) : Promise.resolve(null),
  ])

  const base = `${gatewayUrl}/${tenant.slug}`
  const p = score ? prevision(score) : null
  const kitAplicado = p !== null && p.arreglables.length === 0
  const pasos = derivarPasos({
    slug: tenant.slug,
    hayScore: score !== null,
    hayRutas: routes.length > 0,
    hayPagos: payments.length > 0,
    kitAplicado,
  })

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <div>
          <p className="font-mono text-xs text-muted">{tenant.slug}</p>
          <h1 className="mt-1 text-2xl font-medium">{tenant.name}</h1>
          <p className="mt-2 text-sm text-muted">
            Tu API vive en <code className="font-mono text-text">{tenant.originUrl}</code>. Los
            agentes la consumen por <code className="font-mono text-text">{base}</code>
          </p>
        </div>
        <Stepper pasos={pasos} />
      </header>

      <section id="score" className="scroll-mt-6">
        <TituloPaso n={2} titulo="Mira tu score" bajada="Qué tan listo está tu sitio para agentes hoy, y a cuánto puede llegar con Peaje." />
        <div className="mt-4">
          <ScoreCard slug={tenant.slug} domain={domain} score={score} />
        </div>
      </section>

      <section id="rutas" className="scroll-mt-6">
        <TituloPaso
          n={3}
          titulo="Haz que los agentes puedan pagarte"
          bajada="Ponle precio a las rutas que quieres cobrar. Todo lo demás pasa gratis. El gateway responde 402 y el agente paga solo."
        />
        <div className="mt-4">
          <RutasPanel slug={tenant.slug} routes={routes} base={base} />
        </div>
      </section>

      <section id="kit" className="scroll-mt-6">
        <TituloPaso
          n={4}
          titulo="Haz que los agentes puedan encontrarte"
          bajada="Publica tu API donde los agentes buscan, y agrega a tu web las señales que los auditores puntúan."
        />
        <div className="mt-4 rounded-lg border border-border bg-panel p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted">
              El kit trae los bloques exactos para tu web (llms.txt, JSON-LD, pricing.md y más), un
              prompt para aplicarlo todo de una con tu coding agent, y el botón para publicarte en
              los índices MPP.
            </p>
            <Link
              href={`/t/${tenant.slug}/kit`}
              className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black"
            >
              Abrir el kit →
            </Link>
          </div>
        </div>
      </section>

      <section id="score-final" className="scroll-mt-6">
        <TituloPaso
          n={5}
          titulo="Veamos tu score final"
          bajada="Cuando el kit esté en tu web, vuelve a correr el score y compara."
        />
        <div className="mt-4">
          {domain ? (
            <div className="flex items-center gap-4 rounded-lg border border-border bg-panel p-4">
              <BotonScore slug={tenant.slug} label="Volver a correr el score" />
              <p className="text-xs text-muted">
                El scan tarda ~30 segundos y vuelve a medir todos los checks de Ora.
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-panel p-4 text-sm text-muted">
              Disponible cuando tu API tenga dominio público.
            </p>
          )}
        </div>
      </section>

      <hr className="border-border" />

      <section className="space-y-8">
        <div>
          <h2 className="text-lg font-medium">Tu dinero</h2>
          <p className="mt-1 text-sm text-muted">Lo que los agentes ya pagaron, y el botón para retirarlo.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Metric label="Disponible" value={money(balance.available)} destacado />
          <Metric label="Requests pagados" value={String(balance.requestCount)} />
          <Metric label="Revenue total" value={money(balance.revenue)} />
        </div>

        <GraficaRevenue datos={porDia} dias={7} />

        <div>
          <h3 className="font-medium">Últimos pagos</h3>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Todavía nadie paga. Ponle precio a una ruta (paso 3) y pruébalo con{' '}
              <code className="font-mono">npx mppx {base}/tu-ruta</code>
            </p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="pb-2 font-normal">Hora</th>
                  <th className="pb-2 font-normal">Ruta</th>
                  <th className="pb-2 font-normal">Agente</th>
                  <th className="pb-2 text-right font-normal">Monto</th>
                  <th className="pb-2 text-right font-normal">Tx</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {payments.map((pg) => (
                  <tr key={pg.id} className="border-t border-border">
                    <td className="py-2 text-muted">
                      {new Date(pg.createdAt).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2">{pg.path}</td>
                    <td className="py-2 text-muted">{shortWallet(pg.agentWallet)}</td>
                    <td className="py-2 text-right">{money(pg.amount)}</td>
                    <td className="py-2 text-right">
                      <a
                        href={txExplorerUrl(pg.receiptRef)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        ver
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <RetirosPanel
          slug={tenant.slug}
          disponible={balance.available}
          wallet={tenant.payoutWallet}
          historial={retiros}
        />

        <WalletForm slug={tenant.slug} wallet={tenant.payoutWallet} />
      </section>
    </div>
  )
}

function TituloPaso({ n, titulo, bajada }: { n: number; titulo: string; bajada: string }) {
  return (
    <div>
      <h2 className="flex items-center gap-3 text-lg font-medium">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/50 font-mono text-xs text-accent">
          {n}
        </span>
        {titulo}
      </h2>
      <p className="mt-1.5 text-sm text-muted">{bajada}</p>
    </div>
  )
}

function ScoreCard({
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
      <p className="rounded-lg border border-border bg-panel p-4 text-sm text-muted">
        Tu origin es local y Ora solo escanea dominios públicos. Cuando tu API tenga dominio, aquí
        aparece el score.
      </p>
    )
  }

  if (!score) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-panel p-4">
        <p className="text-sm text-muted">
          Todavía no hay score de <strong className="text-text">{domain}</strong>. El scan tarda
          ~30 segundos.
        </p>
        <BotonScore slug={slug} label="Correr score" />
      </div>
    )
  }

  const p = prevision(score)
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{score.domain}</p>
          <p className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl">{p.actual}</span>
            <span className="text-muted">→</span>
            <span className="text-4xl text-accent">~{p.estimado}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            hoy vs. con Peaje y el kit aplicado (estimación de Ora, no promesa)
          </p>
        </div>
        <span className="rounded border border-border px-2 py-1 font-mono text-xs">{score.grade}</span>
      </div>
      {p.arreglables.length === 0 ? (
        <p className="mt-3 text-xs text-accent">
          Todos los checks que Peaje ataca ya pasan. Sigue al paso 5 y confirma el score.
        </p>
      ) : null}
    </div>
  )
}

function Metric({ label, value, destacado }: { label: string; value: string; destacado?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-2xl ${destacado ? 'text-accent' : ''}`}>{value}</p>
    </div>
  )
}

function SinSesion({ slug }: { slug: string }) {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-medium">Necesitas tu API key</h1>
      <p className="mt-2 text-sm text-muted">
        El panel de <code className="font-mono">{slug}</code> solo se abre con la llave de ese
        negocio.
      </p>
      <Link
        href="/acceder"
        className="mt-6 inline-block rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black"
      >
        Entrar con API key
      </Link>
    </div>
  )
}
