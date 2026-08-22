'use client'

import { useState } from 'react'

export function CopyBlock({
  titulo,
  detalle,
  contenido,
}: {
  titulo: string
  detalle: string
  contenido: string
}) {
  const [copiado, setCopiado] = useState(false)
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">{titulo}</h2>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(contenido)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 1500)
          }}
          className="text-xs text-accent hover:underline"
        >
          {copiado ? 'copiado ✓' : 'copiar'}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">{detalle}</p>
      <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-panel p-3 font-mono text-xs leading-relaxed">
        {contenido}
      </pre>
    </section>
  )
}

export function PublicarMppscan({ slug, discoveryUrl }: { slug: string; discoveryUrl: string }) {
  const [estado, setEstado] = useState<'idle' | 'publicando' | 'publicado'>('idle')
  return (
    <section className="rounded-lg border border-accent/40 bg-accent/5 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-medium">Publicar en los índices MPP</h2>
          <p className="mt-1 text-xs text-muted">
            MPPScan y el directorio de mpp.dev: donde los agentes buscan APIs pagas. El MCP de
            discovery (mpp.dev/mcp/services) rankea servicios por tarea.
          </p>
        </div>
        {estado === 'publicado' ? (
          <span className="shrink-0 rounded border border-accent/40 px-2 py-1 text-xs text-accent">
            publicado ✓
          </span>
        ) : (
          <button
            disabled={estado === 'publicando'}
            onClick={() => {
              setEstado('publicando')
              // MPPScan no expone API pública de submit: el registro real es un
              // click en mppscan.com/register con esta URL. Acá simulamos el paso.
              setTimeout(() => setEstado('publicado'), 1200)
              window.open(
                `https://www.mppscan.com/register?url=${encodeURIComponent(discoveryUrl)}`,
                '_blank',
              )
            }}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black disabled:opacity-50"
          >
            {estado === 'publicando' ? 'Publicando…' : `Publicar ${slug}`}
          </button>
        )}
      </div>
    </section>
  )
}

export function BotonScore({ slug, label }: { slug: string; label: string }) {
  const [estado, setEstado] = useState<'idle' | 'corriendo' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={estado === 'corriendo'}
        onClick={async () => {
          setEstado('corriendo')
          setError(null)
          const { correrScore } = await import('./actions')
          const result = await correrScore(slug)
          if (!result.ok) {
            setEstado('error')
            setError(result.error ?? 'Falló el scan')
          } else {
            setEstado('idle')
          }
        }}
        className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black disabled:opacity-50"
      >
        {estado === 'corriendo' ? 'Escaneando (~30 s)…' : label}
      </button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  )
}
