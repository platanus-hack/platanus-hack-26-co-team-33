'use client'

import { useLoginWithEmail, usePrivy } from '@privy-io/react-auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { entrarConPrivy } from './actions'

type Step = 'email' | 'code'

export default function Acceder() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [noRegistrado, setNoRegistrado] = useState(false)
  const [pending, setPending] = useState(false)

  const { getAccessToken } = usePrivy()
  const { sendCode, loginWithCode } = useLoginWithEmail()

  async function enviarCodigo(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNoRegistrado(false)
    if (!email.trim()) return setError('Falta tu email.')
    setPending(true)
    try {
      await sendCode({ email })
      setStep('code')
    } catch {
      setError('No pudimos enviar el código. Revisa el email.')
    } finally {
      setPending(false)
    }
  }

  async function verificar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNoRegistrado(false)
    setPending(true)
    try {
      await loginWithCode({ code })
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('sin token')
      const r = await entrarConPrivy(accessToken)
      if (!r.ok) {
        setNoRegistrado(true)
        setError(r.error)
        return
      }
      router.push(`/t/${r.slug}`)
    } catch {
      setError('Código inválido. Intenta de nuevo.')
    } finally {
      setPending(false)
    }
  }

  if (step === 'code') {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-medium">Revisa tu email</h1>
        <p className="mt-2 text-sm text-muted">
          Te mandamos un código a <span className="text-text">{email}</span>.
        </p>
        <form onSubmit={verificar} className="mt-6 space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="123456"
            className="w-full rounded-lg border border-border bg-panel px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {noRegistrado ? (
            <Link href="/nuevo" className="block text-sm text-accent hover:underline">
              Registrar este negocio →
            </Link>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50"
          >
            {pending ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-medium">Entrar</h1>
      <p className="mt-2 text-sm text-muted">Con tu email. No hay usuarios ni contraseñas.</p>
      <form onSubmit={enviarCodigo} className="mt-6 space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="vos@tunegocio.com"
          className="w-full rounded-lg border border-border bg-panel px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50"
        >
          {pending ? 'Enviando…' : 'Enviar código'}
        </button>
      </form>
    </div>
  )
}
