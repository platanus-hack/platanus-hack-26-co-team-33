import Link from 'next/link'

export default function Landing() {
  return (
    <div className="space-y-16 py-8">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-medium leading-tight">
          Los agentes ya están usando tu API. Todavía no te pagan.
        </h1>
        <p className="mt-5 text-lg text-muted">
          Peaje pone un cobro por request delante de la API que ya tenés. El agente pide, recibe un
          402, paga solo y sigue. Vos ves la plata entrar y la retirás.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/nuevo"
            className="rounded-lg bg-accent px-5 py-3 text-sm font-medium text-black"
          >
            Registrar mi negocio
          </Link>
          <Link
            href="/acceder"
            className="rounded-lg border border-border px-5 py-3 text-sm text-muted hover:text-text"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-6">
        <Paso
          n="01"
          titulo="Registrás tu API"
          texto="Nombre y URL. Te damos un gateway y un API key. No tocás tu código."
        />
        <Paso
          n="02"
          titulo="Ponés precios"
          texto="Elegís qué rutas cobran y cuánto. El resto pasa gratis."
        />
        <Paso
          n="03"
          titulo="Cobrás y retirás"
          texto="Cada pago queda en tu panel, con la wallet del agente y la tx. Retirás cuando querés."
        />
      </section>

      <section className="rounded-lg border border-border bg-panel p-6">
        <p className="text-sm text-muted">
          Peaje habla MPP, el estándar de pagos máquina a máquina sobre HTTP 402 que hicieron Tempo
          y Stripe. Cualquier agente que lo entienda le puede pagar a tu API sin que ustedes se
          conozcan.
        </p>
      </section>
    </div>
  )
}

function Paso({ n, titulo, texto }: { n: string; titulo: string; texto: string }) {
  return (
    <div>
      <p className="font-mono text-xs text-accent">{n}</p>
      <h3 className="mt-2 font-medium">{titulo}</h3>
      <p className="mt-1.5 text-sm text-muted">{texto}</p>
    </div>
  )
}
