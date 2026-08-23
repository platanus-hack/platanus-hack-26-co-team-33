'use client'

import { useState, useTransition } from 'react'
import { guardarWallet } from './actions'

export function WalletForm({ slug, wallet }: { slug: string; wallet: string | null }) {
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-muted hover:text-text hover:underline"
      >
        Cambiar wallet de retiro
      </button>
    )
  }

  return (
    <section>
      <h2 className="text-sm font-medium">Wallet de retiro</h2>
      <p className="mt-1 text-xs text-muted">
        A dónde te enviamos el dinero cuando retiras. Puedes cambiarla cuando quieras.
      </p>
      <form
        action={(formData) => {
          setError(null)
          startTransition(async () => {
            try {
              await guardarWallet(slug, formData)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo guardar')
            }
          })
        }}
        className="mt-3 flex gap-3"
      >
        <input
          name="wallet"
          defaultValue={wallet ?? ''}
          placeholder="0x…"
          className="min-w-96 flex-1 rounded-lg border border-border bg-panel px-3 py-2 font-mono text-sm outline-none focus:border-accent"
        />
        <button
          disabled={pending}
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
        >
          Guardar
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </section>
  )
}
