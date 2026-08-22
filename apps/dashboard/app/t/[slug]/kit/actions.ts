'use server'

import { revalidatePath } from 'next/cache'
import { freshScan, scannableDomain } from '@/lib/ora'
import { requireTenant } from '@/lib/session'

/** Corre (o re-corre) el scan de Ora sobre el dominio del tenant. ~30 s. */
export async function correrScore(slug: string): Promise<{ ok: boolean; error?: string }> {
  const tenant = await requireTenant(slug)
  const domain = scannableDomain(tenant.originUrl)
  if (!domain) {
    return { ok: false, error: 'Ora solo escanea dominios públicos; tu origin es local.' }
  }
  const result = await freshScan(domain)
  if (!result) return { ok: false, error: 'El scan de Ora falló. Reintentá en un rato.' }
  revalidatePath(`/t/${slug}/kit`)
  return { ok: true }
}
