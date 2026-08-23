import { requireTenant } from '@/lib/session'
import { store } from '@/lib/store'
import { RetirosPanel } from '../retiros'
import { WalletForm } from '../wallet'

export default async function Retirar({ params }: PageProps<'/t/[slug]/retirar'>) {
  const { slug } = await params
  const tenant = await requireTenant(slug)
  const [balance, retiros] = await Promise.all([
    store.balance(tenant.id),
    store.listWithdrawals(tenant.id, 10),
  ])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-medium">Retirar</h1>
        <p className="mt-2 text-sm text-muted">
          Tu saldo disponible sale de la treasury a tu wallet, on-chain.
        </p>
      </header>
      <RetirosPanel
        disponible={balance.available}
        wallet={tenant.payoutWallet}
        historial={retiros}
      />
      <WalletForm slug={tenant.slug} wallet={tenant.payoutWallet} />
    </div>
  )
}
