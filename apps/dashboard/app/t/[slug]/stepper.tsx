import Link from 'next/link'

export type PasoEstado = 'hecho' | 'actual' | 'pendiente'

export type Paso = {
  n: number
  titulo: string
  estado: PasoEstado
  href: string
}

/** Recorrido de onboarding: siempre visible arriba del panel y del kit. */
export function Stepper({ pasos }: { pasos: Paso[] }) {
  return (
    <nav aria-label="Pasos" className="flex flex-wrap gap-2">
      {pasos.map((p) => (
        <Link
          key={p.n}
          href={p.href}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
            p.estado === 'hecho'
              ? 'border-accent/40 text-accent'
              : p.estado === 'actual'
                ? 'border-accent bg-accent text-black'
                : 'border-border text-muted hover:text-text'
          }`}
        >
          <span className="font-mono">{p.estado === 'hecho' ? '✓' : p.n}</span>
          {p.titulo}
        </Link>
      ))}
    </nav>
  )
}

/**
 * Deriva el estado de los 5 pasos a partir de lo que ya existe.
 * Los "hecho" son verificables; el paso actual es el primero pendiente.
 */
export function derivarPasos(input: {
  slug: string
  hayScore: boolean
  hayRutas: boolean
  hayPagos: boolean
  kitAplicado: boolean
}): Paso[] {
  const base = `/t/${input.slug}`
  const hechos = [
    true, // 1: registrado (si está acá, ya pasó)
    input.hayScore,
    input.hayRutas,
    input.kitAplicado,
    false, // 5: se marca cuando el re-scan muestra la mejora
  ]
  const primerPendiente = hechos.findIndex((h) => !h)
  const defs = [
    { titulo: 'Registra tu negocio', href: base },
    { titulo: 'Mira tu score', href: `${base}#score` },
    { titulo: 'Cobra a los agentes', href: `${base}#rutas` },
    { titulo: 'Haz que te encuentren', href: `${base}/kit` },
    { titulo: 'Score final', href: `${base}#score-final` },
  ]
  return defs.map((d, i) => ({
    n: i + 1,
    titulo: d.titulo,
    href: d.href,
    estado: hechos[i] ? 'hecho' : i === primerPendiente ? 'actual' : 'pendiente',
  }))
}
