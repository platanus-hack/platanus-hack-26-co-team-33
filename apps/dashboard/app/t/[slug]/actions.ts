'use server'

import { revalidatePath } from 'next/cache'
import { getWithdrawal, requestWithdrawal } from '@/lib/gateway'
import { requireTenant } from '@/lib/session'
import { store } from '@/lib/store'

export async function crearRuta(slug: string, formData: FormData) {
  const tenant = await requireTenant(slug)
  const pathPattern = String(formData.get('pathPattern') ?? '').trim()
  const priceUsd = String(formData.get('priceUsd') ?? '').trim()
  const method = String(formData.get('method') ?? 'GET').toUpperCase()
  const description = String(formData.get('description') ?? '').trim()

  if (!pathPattern.startsWith('/')) throw new Error('La ruta tiene que empezar con /')
  const price = Number(priceUsd)
  if (!Number.isFinite(price) || price <= 0) throw new Error('El precio tiene que ser mayor a 0')

  await store.createRoute({
    tenantId: tenant.id,
    method,
    pathPattern,
    priceUsd: price.toFixed(6),
    description: description || null,
  })
  revalidatePath(`/t/${slug}`)
}

export async function borrarRuta(slug: string, routeId: string) {
  const tenant = await requireTenant(slug)
  await store.deleteRoute(tenant.id, routeId)
  revalidatePath(`/t/${slug}`)
}

export async function guardarWallet(slug: string, formData: FormData) {
  const tenant = await requireTenant(slug)
  const wallet = String(formData.get('wallet') ?? '').trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) throw new Error('Esa no parece una wallet válida')
  await store.setPayoutWallet(tenant.id, wallet)
  revalidatePath(`/t/${slug}`)
}

export type RetiroEstado = {
  id: string
  status: 'pending' | 'confirmed' | 'failed'
  amount: string
  toWallet: string
  explorerUrl: string | null
}

export async function retirar(slug: string, formData: FormData): Promise<RetiroEstado> {
  await requireTenant(slug)
  const amount = String(formData.get('amount') ?? '').trim()
  const result = await requestWithdrawal(slug, amount ? { amount } : {})
  revalidatePath(`/t/${slug}`)
  return {
    id: result.withdrawal.id,
    status: result.withdrawal.status,
    amount: result.withdrawal.amount,
    toWallet: result.withdrawal.toWallet,
    explorerUrl: result.explorerUrl,
  }
}

export async function estadoRetiro(slug: string, id: string): Promise<RetiroEstado> {
  await requireTenant(slug)
  const result = await getWithdrawal(slug, id)
  if (result.withdrawal.status !== 'pending') revalidatePath(`/t/${slug}`)
  return {
    id: result.withdrawal.id,
    status: result.withdrawal.status,
    amount: result.withdrawal.amount,
    toWallet: result.withdrawal.toWallet,
    explorerUrl: result.explorerUrl,
  }
}
