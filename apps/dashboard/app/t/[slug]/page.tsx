import Link from 'next/link'
import { txExplorerUrl } from '@peaje/shared'
import { gatewayUrl, money, shortWallet } from '@/lib/config'
import { currentTenant } from '@/lib/session'
import { store } from '@/lib/store'
import { GraficaRevenue } from './grafica'
import { RetirosPanel } from './retiros'
import { RutasPanel } from './rutas'
import { WalletForm } from './wallet'

export default async function Panel({ params }: PageProps<'/t/[slug]'>) {
  const { slug } = await params
  const tenant = await currentTenant()

  if (!tenant || tenant.slug !== slug) return <SinSesion slug={slug} />

  const [routes, balance, payments, retiros, porDia] = await Promise.all([
    store.listRoutes(tenant.id),
    store.balance(tenant.id),
    store.listPayments(tenant.id, 10),
    store.listWithdrawals(tenant.id, 8),
    store.dailyRevenue(tenant.id, 7),
  ])

  const base = `${gatewayUrl}/${tenant.slug}`

  return (
    <div className="space-y-10">
      <header>
        <p className="font-mono text-xs text-muted">{tenant.slug}</p>
        <h1 className="mt-1 text-2xl font-medium">{tenant.name}</h1>
        <p className="mt-2 text-sm text-muted">
          Tu API vive en{' '}
          <code className="font-mono text-text">{tenant.originUrl}</code>. Los agentes la consumen
          por <code className="font-mono text-text">{base}</code>
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <Metric label="Disponible" value={money(balance.available)} destacado />
        <Metric label="Requests pagados" value={String(balance.requestCount)} />
        <Metric label="Revenue total" value={money(balance.revenue)} />
      </section>

      <GraficaRevenue datos={porDia} dias={7} />

      <RutasPanel slug={tenant.slug} routes={routes} base={base} />

      <section>
        <h2 className="text-lg font-medium">Últimos pagos</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Todavía nadie pagó. Definí una ruta con precio y probá con{' '}
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
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2 text-muted">
                    {new Date(p.createdAt).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2">{p.path}</td>
                  <td className="py-2 text-muted">{shortWallet(p.agentWallet)}</td>
                  <td className="py-2 text-right">{money(p.amount)}</td>
                  <td className="py-2 text-right">
                    <a
                      href={txExplorerUrl(p.receiptRef)}
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
      </section>

      <RetirosPanel
        slug={tenant.slug}
        disponible={balance.available}
        wallet={tenant.payoutWallet}
        historial={retiros}
      />

      <WalletForm slug={tenant.slug} wallet={tenant.payoutWallet} />
    </div>
  )
}

function Metric({
  label,
  value,
  destacado,
}: {
  label: string
  value: string
  destacado?: boolean
}) {
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
      <h1 className="text-2xl font-medium">Necesitás tu API key</h1>
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
