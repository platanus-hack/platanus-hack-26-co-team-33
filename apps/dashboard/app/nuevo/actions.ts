'use server'

import { apiKeyPrefix, generateApiKey, generateEmbedSecret, hashApiKey, slugify } from '@peaje/shared'
import { store } from '@/lib/store'
import { setSession } from '@/lib/session'

export type AltaResultado =
  | { ok: true; slug: string; apiKey: string }
  | { ok: false; error: string }

/**
 * Alta de un negocio. Devuelve el API key en claro una sola vez:
 * en la base solo queda el hash.
 */
export async function registrarNegocio(
  _previo: AltaResultado | null,
  formData: FormData,
): Promise<AltaResultado> {
  const name = String(formData.get('name') ?? '').trim()
  const originUrl = String(formData.get('originUrl') ?? '').trim()

  if (!name) return { ok: false, error: 'Falta el nombre del negocio.' }
  if (!originUrl) return { ok: false, error: 'Falta la URL de tu API.' }

  let origin: URL
  try {
    origin = new URL(originUrl)
  } catch {
    return { ok: false, error: 'La URL de tu API no es válida. Incluí https://' }
  }

  const slug = slugify(name)
  if (!slug) return { ok: false, error: 'El nombre no genera un identificador válido.' }
  if (await store.getTenantBySlug(slug)) {
    return { ok: false, error: `Ya hay un negocio registrado como "${slug}".` }
  }

  const apiKey = generateApiKey()
  const tenant = await store.createTenant({
    slug,
    name,
    originUrl: origin.origin + origin.pathname.replace(/\/$/, ''),
    apiKeyHash: await hashApiKey(apiKey),
    apiKeyPrefix: apiKeyPrefix(apiKey),
    embedSecret: generateEmbedSecret(),
  })

  await store.addAllowedOrigin(tenant.id, origin.origin)
  await setSession(apiKey)

  return { ok: true, slug: tenant.slug, apiKey }
}
