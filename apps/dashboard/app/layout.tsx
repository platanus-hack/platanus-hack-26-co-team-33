import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const sans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Peaje · cobrale a los agentes que usan tu API',
  description:
    'Poné un peaje en tu API y cobrá por request a los agentes de IA. API key, iframe y botón de retirar.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-mono text-sm tracking-tight">
              peaje
            </Link>
            <nav className="flex gap-5 text-sm text-muted">
              <Link href="/nuevo" className="hover:text-text">
                Registrar negocio
              </Link>
              <Link href="/acceder" className="hover:text-text">
                Entrar
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  )
}
