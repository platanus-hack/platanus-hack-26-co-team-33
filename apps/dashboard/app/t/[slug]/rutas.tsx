'use client'

import type { Route } from '@peaje/db'
import { useState, useTransition } from 'react'
import { money } from '@/lib/config'
import { borrarRuta, crearRuta } from './actions'

export function RutasPanel({
  slug,
  routes,
  base,
}: {
  slug: string
  routes: Route[]
  base: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <section>
      <h2 className="text-lg font-medium">Rutas con precio</h2>
      <p className="mt-1 text-sm text-muted">
        Solo estas cobran. Todo lo demás pasa gratis. Podés usar <code className="font-mono">:param</code>{' '}
        y <code className="font-mono">*</code>.
      </p>

      {routes.length > 0 ? (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-panel">
          {routes.map((route) => (
            <li key={route.id} className="flex items-center gap-4 px-4 py-3">
              <span className="w-12 font-mono text-xs text-muted">{route.method}</span>
              <span className="flex-1 font-mono text-sm">{route.pathPattern}</span>
              <span className="text-sm">{money(route.priceUsd)}</span>
              <form
                action={(formData) => {
                  startTransition(async () => {
                    await borrarRuta(slug, String(formData.get('id')))
                  })
                }}
              >
                <input type="hidden" name="id" value={route.id} />
                <button
                  disabled={pending}
                  className="text-xs text-muted hover:text-red-400 disabled:opacity-50"
                >
                  quitar
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted">
          Ninguna ruta cobra todavía.
        </p>
      )}

      <form
        action={(formData) => {
          setError(null)
          startTransition(async () => {
            try {
              await crearRuta(slug, formData)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo crear la ruta')
            }
          })
        }}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <label className="w-24">
          <span className="text-xs text-muted">Método</span>
          <select
            name="method"
            className="mt-1 w-full rounded-lg border border-border bg-panel px-2 py-2 font-mono text-sm outline-none focus:border-accent"
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
        </label>
        <label className="min-w-56 flex-1">
          <span className="text-xs text-muted">Ruta</span>
          <input
            name="pathPattern"
            required
            placeholder="/api/indicadores/:pais"
            className="mt-1 w-full rounded-lg border border-border bg-panel px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="w-28">
          <span className="text-xs text-muted">Precio</span>
          <input
            name="priceUsd"
            required
            type="number"
            step="0.001"
            min="0.001"
            placeholder="0.05"
            className="mt-1 w-full rounded-lg border border-border bg-panel px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="min-w-40 flex-1">
          <span className="text-xs text-muted">Descripción</span>
          <input
            name="description"
            placeholder="Indicadores macro por país"
            className="mt-1 w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <button
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

      <p className="mt-3 text-xs text-muted">
        Discovery para agentes:{' '}
        <a
          href={`${base}/openapi.json`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-accent hover:underline"
        >
          {base}/openapi.json
        </a>
      </p>
    </section>
  )
}
