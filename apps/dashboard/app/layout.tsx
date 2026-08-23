import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { currentTenant } from '@/lib/session'
import './globals.css'
import { Providers } from './providers'

const sans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Peaje · cobrale a los agentes que usan tu API',
  description:
    'Ponle un peaje a tu web y cobra por request a los agentes de IA. Links con precio, score de agent-readiness y retiros.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const tenant = await currentTenant()

  return (
    <html lang="es">
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <Providers>
          <header className="border-b border-border">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <Link
                href={tenant ? `/t/${tenant.slug}` : '/'}
                className="font-mono text-sm tracking-tight"
              >
                peaje
              </Link>
              {tenant ? (
                <nav className="flex items-center gap-4 text-sm">
                  <span className="text-muted">{tenant.email ?? tenant.name}</span>
                  <Link
                    href="/salir"
                    prefetch={false}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-text"
                  >
                    Salir
                  </Link>
                </nav>
              ) : (
                <nav className="flex gap-5 text-sm text-muted">
                  <Link href="/nuevo" className="hover:text-text">
                    Registrar negocio
                  </Link>
                  <Link href="/acceder" className="hover:text-text">
                    Entrar
                  </Link>
                </nav>
              )}
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
