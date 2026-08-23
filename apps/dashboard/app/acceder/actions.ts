'use server'

import { verifyPrivyAccessToken } from '@/lib/privy'
import { setSession } from '@/lib/session'
import { store } from '@/lib/store'

export type EntrarResultado = { ok: true; slug: string } | { ok: false; error: string }

export async function entrarConPrivy(accessToken: string): Promise<EntrarResultado> {
  let privyUserId: string
  try {
    privyUserId = await verifyPrivyAccessToken(accessToken)
  } catch {
    return { ok: false, error: 'No pudimos verificar tu sesión. Intenta de nuevo.' }
  }

  const tenant = await store.getTenantByPrivyUserId(privyUserId)
  if (!tenant) {
    return { ok: false, error: 'No hay ningún negocio registrado con ese email.' }
  }

  await setSession(tenant.id)
  return { ok: true, slug: tenant.slug }
}
