# Peaje

**Los agentes de IA hoy no pueden usar tu web: no la entienden, no la encuentran y no tienen cómo pagarte. Peaje arregla las tres.**

Peaje convierte cualquier sitio o API en un negocio listo para agentes: legible y descubrible para máquinas, y cobrable por request. Todo sin que el dueño escriba una línea de código de pagos ni toque crypto en el onboarding.

## Cómo funciona

1. **Registras tu negocio con tu email.** Un OTP, y listo: creamos tu wallet de cobro automáticamente (Privy). Nada de API keys ni seed phrases.
2. **Le pones precio a tus links.** Cualquier URL pública (una página, un PDF, un dataset, una ruta de tu API) se vuelve cobrable. ¿Muchas? Importa tu sitemap y ponles precio en lote. Lo que no tiene precio pasa gratis.
3. **El agente paga solo.** Tu gateway responde `HTTP 402 Payment Required` con el protocolo **MPP** (el estándar de pagos máquina-a-máquina de Tempo + Stripe). El agente paga en stablecoin, reintenta y recibe el recurso con su receipt verificable on-chain. Settlement en ~1 segundo en Tempo. El protocolo ya soporta tarjetas vía Stripe (Shared Payment Tokens): está en nuestro roadmap para que el agente pague con lo que tenga.
4. **Ves la plata entrar.** Dashboard con revenue en vivo y pagos por agente (wallet + tx en el explorer). Retiros on-chain: la lógica de treasury ya funciona y se probó con transacciones reales — feature disponible pronto para los usuarios en el dashboard.

## No solo cobrable: encontrable

De nada sirve cobrar si los agentes no te encuentran. Peaje audita tu sitio con **Ora** (ora.ai, el auditor de agent-readiness) y te muestra tu score hoy vs. a cuánto llega con el kit aplicado, con la ganancia estimada por check. El kit genera los bloques exactos para tu web (`llms.txt`, JSON-LD, `pricing.md`, `.well-known/ai-catalog.json` y más), un prompt para aplicarlo todo de una con tu coding agent, y un verificador que chequea tu dominio bloque por bloque.

Además, cada negocio obtiene **un MCP server con tools pagas**: sus rutas expuestas por JSON-RPC para que Claude o cualquier cliente MCP las descubra, pague y consuma. Y el gateway sirve solo el resto del paquete de descubrimiento: OpenAPI con precios, `auth.md`, `agents.md`, agent cards A2A y catálogo ARD.

## Funciona hoy, en producción

- `npx mppx validate` contra el gateway en producción: **90 checks, 0 fallos** (el auditor oficial del protocolo paga cada ruta de verdad)
- Pagos reales de agentes en Tempo testnet (HTTP y MCP), cada uno con su tx on-chain
- Lógica de retiros on-chain probada end-to-end (treasury) — feature disponible pronto para los usuarios
- La capa Payments de Ora (checks de MPP y x402), donde casi todo internet marca N/A, cubierta de fábrica

## Stack

Gateway multi-tenant en Hono + SDK `mppx` (Railway) · Dashboard Next.js (Vercel) · Supabase · Login y wallets por Privy · Settlement en Tempo testnet (pathUSD) · MCP sobre Streamable HTTP

## Pruébalo

```bash
# crea una wallet efímera, la fondea en testnet, y paga de verdad por el
# pronóstico de Bogotá a través de Peaje — sin cuenta previa
npx mppx@latest validate https://peaje-gateway.up.railway.app/clima-andino
```

Dashboard: [peaje-dashboard.vercel.app](https://peaje-dashboard.vercel.app)
