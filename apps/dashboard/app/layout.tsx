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
        <header className="sticky top-4 z-40 mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-between rounded-full border border-border bg-panel px-5 py-2.5 shadow-lg shadow-black/30">
            <Link href="/" className="font-mono text-sm tracking-tight text-text">
              peaje
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link
                href="/nuevo"
                className="rounded-full bg-text px-4 py-1.5 font-medium text-bg"
              >
                Registrar negocio
              </Link>
              <Link
                href="/acceder"
                className="rounded-full border border-border px-4 py-1.5 text-muted hover:border-muted hover:text-text"
              >
                Entrar
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-center text-xs text-muted">
            Made with love by{' '}
            <a
              href="https://github.com/platanus-hack/platanus-hack-26-co-team-33"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-border underline-offset-2 hover:text-text"
            >
              Team 33
            </a>{' '}
            at Platanus Hack Bogotá 26
          </p>
        </footer>
      </body>
    </html>
  )
}
