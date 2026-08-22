'use client'

import { useState, useTransition } from 'react'
import { guardarWallet } from './actions'

export function WalletForm({ slug, wallet }: { slug: string; wallet: string | null }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <section>
      <h2 className="text-lg font-medium">Wallet de retiro</h2>
      <p className="mt-1 text-sm text-muted">
        A dónde te mandamos la plata cuando retirás. Podés cambiarla cuando quieras.
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
