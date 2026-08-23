import { gatewayUrl } from '@/lib/config'
import { requireTenant } from '@/lib/session'
import { store } from '@/lib/store'
import { LinksPanel } from '../links'

export default async function Rutas({ params }: PageProps<'/t/[slug]/rutas'>) {
  const { slug } = await params
  const tenant = await requireTenant(slug)
  const resources = await store.listResources(tenant.id).catch(() => [])
  const base = `${gatewayUrl}/${tenant.slug}`

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-medium">Haz que los agentes puedan pagarte</h1>
        <p className="mt-2 text-sm text-muted">
          Ponle precio a links de tu web. El gateway responde 402 y el agente paga solo.
        </p>
      </header>
      <LinksPanel slug={tenant.slug} resources={resources} base={base} />
    </div>
  )
}
