import { redirect } from 'next/navigation'
import { setSession, tenantFromApiKey } from '@/lib/session'

export default function Acceder({ searchParams }: PageProps<'/acceder'>) {
  async function entrar(formData: FormData) {
    'use server'
    const apiKey = String(formData.get('apiKey') ?? '')
    const tenant = await tenantFromApiKey(apiKey)
    if (!tenant) redirect('/acceder?error=1')
    await setSession(apiKey)
    redirect(`/t/${tenant.slug}`)
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-medium">Entrar</h1>
      <p className="mt-2 text-sm text-muted">Con tu API key. No hay usuarios ni contraseñas.</p>
      <form action={entrar} className="mt-6 space-y-4">
        <input
          name="apiKey"
          required
          placeholder="peaje_live_…"
          className="w-full rounded-lg border border-border bg-panel px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
        />
        <Error searchParams={searchParams} />
        <button className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black">
          Entrar
        </button>
      </form>
    </div>
  )
}

async function Error({ searchParams }: { searchParams: PageProps<'/acceder'>['searchParams'] }) {
  const params = await searchParams
  if (!params.error) return null
  return <p className="text-sm text-red-400">Esa API key no corresponde a ningún negocio.</p>
}
