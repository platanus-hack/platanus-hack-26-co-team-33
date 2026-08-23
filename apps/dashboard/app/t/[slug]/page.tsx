import Link from 'next/link'
import { txExplorerUrl } from '@peaje/shared'
import { gatewayUrl, money, shortWallet } from '@/lib/config'
import { requireTenant } from '@/lib/session'
import { store } from '@/lib/store'
import { GraficaRevenue } from './grafica'

export default async function Dashboard({ params }: PageProps<'/t/[slug]'>) {
  const { slug } = await params
  const tenant = await requireTenant(slug)

  const [balance, payments, porDia, resources] = await Promise.all([
    store.balance(tenant.id),
    store.listPayments(tenant.id, 10),
    store.dailyRevenue(tenant.id, 7),
    store.listResources(tenant.id).catch(() => []),
  ])

  const base = `${gatewayUrl}/${tenant.slug}`

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-medium">Dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          Los agentes consumen por <code className="font-mono text-text">{base}</code>
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <Metric label="Disponible" value={money(balance.available)} destacado />
        <Metric label="Requests pagados" value={String(balance.requestCount)} />
        <Metric label="Revenue total" value={money(balance.revenue)} />
      </div>

      <GraficaRevenue datos={porDia} dias={7} />

      <section>
        <h2 className="font-medium">Últimos pagos</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Todavía nadie paga.{' '}
            {resources.length === 0 ? (
              <>
                <Link href={`/t/${tenant.slug}/rutas`} className="text-accent underline">
                  Agrega tu primer link con precio
                </Link>{' '}
                y pruébalo con <code className="font-mono">npx mppx {base}/r/&lt;slug&gt;</code>
              </>
            ) : (
              <>
                Pruébalo con <code className="font-mono">npx mppx {base}/r/&lt;slug&gt;</code>
              </>
            )}
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
