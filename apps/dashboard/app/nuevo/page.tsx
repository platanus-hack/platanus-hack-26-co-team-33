'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { gatewayUrl } from '@/lib/config'
import { registrarNegocio, type AltaResultado } from './actions'

export default function NuevoNegocio() {
  const [resultado, action, pending] = useActionState<AltaResultado | null, FormData>(
    registrarNegocio,
    null,
  )

  if (resultado?.ok) return <Listo slug={resultado.slug} apiKey={resultado.apiKey} />

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-medium">Registra tu negocio</h1>
      <p className="mt-2 text-sm text-muted">
        Dos campos. Al terminar tienes un gateway que cobra por cada request de un agente, sin tocar
        el código de tu API.
      </p>

      <form action={action} className="mt-8 space-y-5">
        <label className="block">
          <span className="text-sm text-muted">Nombre del negocio</span>
          <input
            name="name"
            required
            placeholder="DataLatam"
            className="mt-1.5 w-full rounded-lg border border-border bg-panel px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="text-sm text-muted">URL de tu API</span>
          <input
            name="originUrl"
            required
            placeholder="https://api.tunegocio.com"
            className="mt-1.5 w-full rounded-lg border border-border bg-panel px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
          />
          <span className="mt-1.5 block text-xs text-muted">
            Es la API que ya tienes corriendo. Peaje la envuelve, no la reemplaza.
          </span>
        </label>

        {resultado && !resultado.ok ? (
          <p className="text-sm text-red-400">{resultado.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50"
        >
          {pending ? 'Creando…' : 'Crear gateway'}
        </button>
      </form>
    </div>
  )
}

function Listo({ slug, apiKey }: { slug: string; apiKey: string }) {
  const base = `${gatewayUrl}/${slug}`
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-medium">Listo. Tu gateway está arriba.</h1>

      <div className="mt-6 rounded-lg border border-accent/40 bg-accent/5 p-4">
        <p className="text-xs uppercase tracking-wide text-accent">
          Tu API key. Se muestra una sola vez.
        </p>
        <code className="mt-2 block break-all font-mono text-sm">{apiKey}</code>
        <p className="mt-2 text-xs text-muted">
          Guárdala ahora. En la base solo queda el hash: no la podemos volver a mostrar.
        </p>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <p className="text-muted">Tu API ahora se consume por aquí:</p>
        <code className="block break-all rounded-lg border border-border bg-panel p-3 font-mono text-sm">
          {base}/&lt;tu-ruta&gt;
        </code>
        <p className="text-muted">
          Nada cobra todavía. Define qué rutas tienen precio y el gateway empieza a responder 402 a
          los agentes.
        </p>
      </div>

      <Link
        href={`/t/${slug}`}
        className="mt-8 inline-block rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black"
      >
        Ir al panel
      </Link>
    </div>
  )
}
