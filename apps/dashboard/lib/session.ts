import 'server-only'
import type { Tenant } from '@peaje/db'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { store } from './store'

const COOKIE = 'peaje_session'

function sign(tenantId: string): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error('Falta INTERNAL_API_SECRET')
  return createHmac('sha256', secret).update(tenantId).digest('hex')
}

function packToken(tenantId: string): string {
  return `${tenantId}.${sign(tenantId)}`
}

function unpackToken(token: string): string | null {
  const dot = token.lastIndexOf('.')
  if (dot < 0) return null
  const tenantId = token.slice(0, dot)
  const given = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(sign(tenantId))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  return tenantId
}

/**
 * La sesión del dashboard es el id del tenant, firmado con INTERNAL_API_SECRET
 * y guardado en una cookie httpOnly. La identidad la verifica Privy una sola
 * vez al entrar (login por email); esta cookie es solo la sesión local.
 */
export async function setSession(tenantId: string) {
  const jar = await cookies()
  jar.set(COOKIE, packToken(tenantId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

/** Devuelve el tenant de la cookie actual, o null. */
export async function currentTenant(): Promise<Tenant | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  const tenantId = unpackToken(token)
  if (!tenantId) return null
  return store.getTenantById(tenantId)
}

/** Igual que currentTenant pero exige que sea el tenant del slug pedido. */
export async function requireTenant(slug: string): Promise<Tenant> {
  const tenant = await currentTenant()
  if (!tenant || tenant.slug !== slug) {
    throw new Error('Sesión inválida para este negocio. Entra con tu email.')
  }
  return tenant
}
