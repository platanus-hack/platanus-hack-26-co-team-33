'use client'

import type { Withdrawal } from '@peaje/db'
import { txExplorerUrl } from '@peaje/shared'
import { useState } from 'react'
import { money, shortWallet } from '@/lib/config'

export function RetirosPanel({
  disponible,
  wallet,
  historial,
}: {
  disponible: string
  wallet: string | null
  historial: Withdrawal[]
}) {
  const [comingSoon, setComingSoon] = useState(false)
  const puedeRetirar = Number(disponible) > 0 && Boolean(wallet)

  return (
    <section>
      <h2 className="text-lg font-medium">Retirar</h2>
      <p className="mt-1 text-sm text-muted">
        {wallet
          ? `Enviamos el saldo disponible a ${shortWallet(wallet)}.`
          : 'Configura primero tu wallet de retiro aquí abajo.'}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <input
          name="amount"
          type="number"
          step="0.000001"
          min="0"
          placeholder={disponible}
          disabled
          className="w-36 rounded-lg border border-border bg-panel px-3 py-2 font-mono text-sm outline-none focus:border-accent disabled:opacity-40"
        />
        <button
          disabled={!puedeRetirar}
          onClick={() => setComingSoon(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
        >
          Retirar {money(disponible)}
        </button>
        <span className="text-xs text-muted">Vacío = todo el saldo</span>
      </div>

      {comingSoon ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/5 p-3 text-sm">
          <span>Los retiros llegan pronto. Tu saldo sigue seguro y acumulándose.</span>
          <button onClick={() => setComingSoon(false)} className="ml-auto text-xs text-muted hover:text-text">
            Cerrar
          </button>
        </div>
      ) : null}

      {historial.length > 0 ? (
        <ul className="mt-5 space-y-1.5">
          {historial.map((w) => (
            <li key={w.id} className="flex items-center gap-3 font-mono text-xs text-muted">
              <Badge status={w.status} />
              <span>{money(w.amount)}</span>
              <span>→ {shortWallet(w.toWallet)}</span>
              {w.txRef ? (
                <a
                  href={txExplorerUrl(w.txRef)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  tx
                </a>
              ) : null}
              <span className="ml-auto">
                {new Date(w.createdAt).toLocaleString('es-CO', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function Badge({ status }: { status: Withdrawal['status'] }) {
  const styles = {
    pending: 'text-yellow-400 border-yellow-400/40',
    confirmed: 'text-accent border-accent/40',
    failed: 'text-red-400 border-red-400/40',
  } as const
  const labels = { pending: 'pendiente', confirmed: 'confirmado', failed: 'falló' } as const
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
