'use client'

import type { Withdrawal } from '@peaje/db'
import { txExplorerUrl } from '@peaje/shared'
import { useEffect, useRef, useState, useTransition } from 'react'
import { money, shortWallet } from '@/lib/config'
import { estadoRetiro, retirar, type RetiroEstado } from './actions'

export function RetirosPanel({
  slug,
  disponible,
  wallet,
  historial,
}: {
  slug: string
  disponible: string
  wallet: string | null
  historial: Withdrawal[]
}) {
  const [enCurso, setEnCurso] = useState<RetiroEstado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const puedeRetirar = Number(disponible) > 0 && Boolean(wallet)

  // Polling del retiro en curso hasta que confirme o falle.
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!enCurso || enCurso.status !== 'pending') {
      if (timer.current) clearInterval(timer.current)
      return
    }
    timer.current = setInterval(() => {
      startTransition(async () => {
        try {
          setEnCurso(await estadoRetiro(slug, enCurso.id))
        } catch {
          // El poll reintenta solo en el próximo tick.
        }
      })
    }, 3000)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [slug, enCurso])

  return (
    <section>
      <h2 className="text-lg font-medium">Retirar</h2>
      <p className="mt-1 text-sm text-muted">
        {wallet
          ? `Enviamos el saldo disponible a ${shortWallet(wallet)}.`
          : 'Configura primero tu wallet de retiro aquí abajo.'}
      </p>

      <form
        action={(formData) => {
          setError(null)
          startTransition(async () => {
            try {
              setEnCurso(await retirar(slug, formData))
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo retirar')
            }
          })
        }}
        className="mt-3 flex items-center gap-3"
      >
        <input
          name="amount"
          type="number"
          step="0.000001"
          min="0"
          placeholder={disponible}
          className="w-36 rounded-lg border border-border bg-panel px-3 py-2 font-mono text-sm outline-none focus:border-accent"
        />
        <button
          disabled={!puedeRetirar || pending || enCurso?.status === 'pending'}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
        >
          {enCurso?.status === 'pending' ? 'Enviando…' : `Retirar ${money(disponible)}`}
        </button>
        <span className="text-xs text-muted">Vacío = todo el saldo</span>
      </form>

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

      {enCurso ? <EstadoRetiro retiro={enCurso} /> : null}

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

function EstadoRetiro({ retiro }: { retiro: RetiroEstado }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-panel p-4 text-sm">
      {retiro.status === 'pending' ? (
        <p>
          <span className="text-accent">Enviando {money(retiro.amount)}</span> a{' '}
          {shortWallet(retiro.toWallet)}…{' '}
          {retiro.explorerUrl ? (
            <a
              href={retiro.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              ver tx en el explorer
            </a>
          ) : null}
        </p>
      ) : retiro.status === 'confirmed' ? (
        <p>
          Listo. {money(retiro.amount)} confirmados en {shortWallet(retiro.toWallet)}.{' '}
          {retiro.explorerUrl ? (
            <a
              href={retiro.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              ver tx
            </a>
          ) : null}
        </p>
      ) : (
        <p className="text-red-400">El retiro falló. El saldo no se descontó. Reintenta.</p>
      )}
    </div>
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
