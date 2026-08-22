import 'server-only'
import type { Tenant } from '@peaje/db'
import { hashApiKey } from '@peaje/shared'
import { cookies } from 'next/headers'
import { store } from './store'

const COOKIE = 'peaje_key'

/**
 * La sesión del dashboard es el propio API key del tenant, guardado en una
 * cookie httpOnly. No hay usuarios ni passwords: quien tiene la llave, manda.
 */
export async function setSession(apiKey: string) {
  const jar = await cookies()
  jar.set(COOKIE, apiKey, {
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
  const key = jar.get(COOKIE)?.value
  if (!key) return null
  return store.getTenantByApiKeyHash(await hashApiKey(key))
}

/** Igual que currentTenant pero exige que sea el tenant del slug pedido. */
export async function requireTenant(slug: string): Promise<Tenant> {
  const tenant = await currentTenant()
  if (!tenant || tenant.slug !== slug) {
    throw new Error('Sesión inválida para este negocio. Entrá con tu API key.')
  }
  return tenant
}

export async function tenantFromApiKey(apiKey: string): Promise<Tenant | null> {
  return store.getTenantByApiKeyHash(await hashApiKey(apiKey.trim()))
}
