'use client'

import type { Resource } from '@peaje/db'
import { useState, useTransition } from 'react'
import { money } from '@/lib/config'
import { borrarLink, crearLink, importarLinks, leerSitemap, type UrlImportable } from './actions'

export function LinksPanel({
  slug,
  resources,
  base,
}: {
  slug: string
  resources: Resource[]
  base: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div>
      <h3 className="font-medium">Links con precio</h3>
      <p className="mt-1 text-sm text-muted">
        Cualquier URL pública (una página, un PDF, un dataset) se vuelve cobrable. No necesitas
        API: el agente paga y recibe el contenido. Precio 0 = el link pasa gratis (útil para
        muestras o docs).
      </p>

      {resources.length > 0 ? (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-panel">
          {resources.map((r) => (
            <li key={r.id} className="flex items-center gap-4 px-4 py-3">
              <span className="flex-1 truncate font-mono text-sm" title={r.url}>
                /r/{r.slug}
                <span className="ml-2 text-xs text-muted">{r.title ?? r.url}</span>
              </span>
              {Number(r.priceUsd) > 0 ? (
                <span className="text-sm">{money(r.priceUsd)}</span>
              ) : (
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted">
                  gratis
                </span>
              )}
              <button
                disabled={pending}
                onClick={() => startTransition(async () => borrarLink(slug, r.id))}
                className="text-xs text-muted hover:text-red-400 disabled:opacity-50"
              >
                quitar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted">
          Ningún link tiene precio todavía. Agrega uno o importa tu sitemap.
        </p>
      )}

      <form
        action={(formData) => {
          setError(null)
          startTransition(async () => {
            try {
              await crearLink(slug, formData)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo crear el link')
            }
          })
        }}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <label className="min-w-64 flex-1">
          <span className="text-xs text-muted">URL</span>
          <input
            name="url"
            required
            placeholder="https://tusitio.com/reporte-2026.pdf"
            className="mt-1 w-full rounded-lg border border-border bg-panel px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="w-40">
          <span className="text-xs text-muted">Título (opcional)</span>
          <input
            name="title"
            placeholder="Reporte 2026"
            className="mt-1 w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="w-28">
          <span className="text-xs text-muted">Precio</span>
          <input
            name="priceUsd"
            type="number"
            step="0.001"
            min="0"
            placeholder="0 = gratis"
            className="mt-1 w-full rounded-lg border border-border bg-panel px-3 py-2 font-mono text-sm outline-none focus:border-accent"
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

      <ImportarSitemap slug={slug} />

      <p className="mt-3 text-xs text-muted">
        Cada link queda en <code className="font-mono">{base}/r/&lt;slug&gt;</code> y entra solo al
        discovery para agentes:{' '}
        <a
          href={`${base}/openapi.json`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-accent hover:underline"
        >
          {base}/openapi.json
        </a>
      </p>
    </div>
  )
}

function ImportarSitemap({ slug }: { slug: string }) {
  const [urlSitemap, setUrlSitemap] = useState('')
  const [items, setItems] = useState<UrlImportable[] | null>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [precio, setPrecio] = useState('0.05')
  const [filtro, setFiltro] = useState('')
  const [estado, setEstado] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="mt-6 rounded-lg border border-border bg-panel p-4">
      <h4 className="text-sm font-medium">Importar desde tu sitemap</h4>
      <p className="mt-1 text-xs text-muted">
        Pega tu dominio o la URL del sitemap.xml: elige qué páginas cobrar y con qué precio.
      </p>

      <div className="mt-3 flex gap-3">
        <input
          value={urlSitemap}
          onChange={(e) => setUrlSitemap(e.target.value)}
          placeholder="tusitio.com o https://tusitio.com/sitemap.xml"
          className="min-w-72 flex-1 rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-accent"
        />
        <button
          disabled={pending || !urlSitemap.trim()}
          onClick={() => {
            setEstado(null)
            startTransition(async () => {
              try {
                const encontrados = await leerSitemap(slug, urlSitemap.trim())
                setItems(encontrados)
                setSeleccion(new Set(encontrados.map((i) => i.slug)))
              } catch (e) {
                setEstado(e instanceof Error ? e.message : 'No se pudo leer el sitemap')
              }
            })
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
        >
          {pending && !items ? 'Leyendo…' : 'Leer sitemap'}
        </button>
      </div>

      {items ? (
        <div className="mt-4">
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar en tu sitemap…"
            className="mb-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-2">
              {seleccion.size} de {items.length} seleccionadas
              <button
                type="button"
                onClick={() =>
                  setSeleccion(
                    new Set(
                      items
                        .filter((i) => !filtro || i.url.toLowerCase().includes(filtro.toLowerCase()))
                        .map((i) => i.slug),
                    ),
                  )
                }
                className="text-accent hover:underline"
              >
                todas
              </button>
              <button
                type="button"
                onClick={() => setSeleccion(new Set())}
                className="text-accent hover:underline"
              >
                ninguna
              </button>
            </span>
            <div className="flex items-center gap-2">
              <span>Precio para todas:</span>
              <input
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                type="number"
                step="0.001"
                min="0.001"
                className="w-24 rounded border border-border bg-bg px-2 py-1 font-mono text-xs outline-none focus:border-accent"
              />
            </div>
          </div>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {items
              .filter((i) => !filtro || i.url.toLowerCase().includes(filtro.toLowerCase()))
              .map((i) => (
              <li key={i.slug}>
                <label className="flex items-center gap-2 font-mono text-xs">
                  <input
                    type="checkbox"
                    checked={seleccion.has(i.slug)}
                    onChange={(e) => {
                      const next = new Set(seleccion)
                      if (e.target.checked) next.add(i.slug)
                      else next.delete(i.slug)
                      setSeleccion(next)
                    }}
                  />
                  <span className="truncate text-muted" title={i.url}>
                    {i.url}
                  </span>
                </label>
              </li>
              ))}
          </ul>
          <button
            disabled={pending || seleccion.size === 0}
            onClick={() => {
              setEstado(null)
              startTransition(async () => {
                try {
                  const n = await importarLinks(
                    slug,
                    items.filter((i) => seleccion.has(i.slug)),
                    Number(precio.replace(',', '.')),
                  )
                  setEstado(`${n} links importados con precio $${Number(precio.replace(',', '.'))}`)
                  setItems(null)
                } catch (e) {
                  setEstado(e instanceof Error ? e.message : 'No se pudo importar')
                }
              })
            }}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            Importar {seleccion.size} links
          </button>
        </div>
      ) : null}

      {estado ? <p className="mt-2 text-xs text-accent">{estado}</p> : null}
    </div>
  )
}
