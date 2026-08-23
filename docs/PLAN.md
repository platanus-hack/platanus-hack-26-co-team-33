# Peaje · plan de implementación

Plataforma tipo "Secret para Agentic Finance": cualquier negocio registra su web con su
email, un gateway MPP hace cobrables sus endpoints para agentes de IA, y un dashboard
muestra el revenue. Retiros y un iframe embebible para su propio admin quedan de roadmap
cercano (backend listo, ver Estado en el README).

## Arquitectura

```
[Agente (mppx / Claude)] ──HTTP/MCP──> [Gateway multi-tenant (Hono)] ──proxy──> [Origin del cliente]
                                        │
                                        ├── flujo MPP (Challenge/Credential/Receipt)
                                        ├── settlement en Tempo testnet (el SDK valida y broadcastea)
                                        └── Ledger (Supabase): acredita cada Receipt al tenant

[Dashboard Next.js] ── onboarding por email (Privy verifica el OTP; crea la wallet de
                        payout del tenant server-side), lee ledger, config de tenant
[Widget embebible]  ── iframe servido desde /embed, protegido por frame-ancestors + JWT corto
                        (roadmap, ver nota al final — no implementado)
```

El demo de M1-M4 usó una app Next.js aparte ("DataLatam") como cliente sin código de pagos;
se retiró del monorepo una vez que hubo tenants reales en producción (ej. `clima-andino`)
para demostrar el flujo contra datos de verdad en vez de un mock local.

Decisiones fijas:

- Un solo treasury wallet de la plataforma recibe todos los pagos; el ledger reparte por `tenant_id`.
- "Retirar" = transferencia on-chain de stablecoin testnet desde la treasury a la wallet del tenant.
- El cliente nunca toca crypto en el onboarding: email, Privy le crea la wallet de payout automáticamente.

## Stack

| Pieza | Elección |
|---|---|
| Gateway | Node + Hono, SDK `mppx` |
| Settlement | Tempo Moderato (testnet, chain 42431), pathUSD |
| DB | Supabase (Postgres, acceso por service role) |
| Auth + wallets de merchant | Privy (login por email OTP, server wallets) |
| Dashboard + landing + embed | Next.js App Router |
| Agente demo | CLI `mppx` |

## Milestones

### M1 · Ciclo de pago completo en un endpoint — hecho

- [x] Scaffold del monorepo (pnpm workspaces)
- [x] Gateway Hono con un endpoint protegido con MPP y precio fijo
- [x] Treasury en Tempo testnet, wallet de agente fondeada
- [x] `mppx validate` pasa (25 checks, 0 fallos)
- [x] Pago real Challenge → Credential → Receipt
- [x] Receipt persistido en `payments`

### M2 · Multi-tenant — hecho

- [x] Esquema completo en Supabase + seed del tenant demo (`datalatam`)
- [x] Resolución de tenant por path: `/{slug}/*` → busca `routes`, aplica precio, hace proxy al origin
- [x] Discovery MPP por tenant en `/{slug}/openapi.json`
- [x] Cada Receipt acredita al `tenant_id` correcto
- [x] Onboarding en dashboard: crear tenant → API key (una vez) + embed_secret + slug — reemplazado
      luego por login/registro con email vía Privy (ver M4.5)
- [x] CRUD mínimo de rutas y precios

### M3 · Dashboard y retiros — hecho

- [x] Balance disponible, requests pagados, revenue total, gráfica 7 días, tabla de últimos pagos
- [x] Retiro: wallet destino → transferencia desde treasury → `withdrawals` con `tx_ref` → link al explorer
- [x] Estados: pending → confirmed (polling del tx desde la UI cada 3 s)
- Nota: la lógica de treasury funciona y se probó con transacciones reales (llamando la API
  interna directo, con el secreto de la plataforma) — ningún usuario puede retirar todavía, ni
  por UI ni por una API pública. Feature disponible pronto, ver Estado en el README.

### M4 · MCP + descubrimiento — hecho

El embed sale del MVP, ver la nota al final.

- [x] MCP server por tenant: expone sus `routes` como tools pagas usando el mismo flujo MPP vía
      JSON-RPC (nombre, descripción y precio por tool desde la DB). Ver `apps/gateway/src/mcp.ts`.
- [x] Probar el ciclo completo desde Claude: descubre la tool → la invoca → paga → recibe el recurso.
      Scripts `scripts/mcp-agent.mts` (agente de prueba) y `scripts/mcp-bridge.mts` (bridge a Claude Code).
- [x] Auto-registro de descubrimiento en el onboarding del tenant:
  - [x] Servir `/.well-known/` con la metadata de agent-readiness del tenant (lo que leen auditores
        tipo isitagentready.com). Ver `apps/gateway/src/wellknown.ts`.
  - [ ] Submit de los endpoints a índices del ecosistema MPP (MPPScan de Merit Systems); si no hay
        API pública de submit, mockear el paso en el demo y mostrarlo como "publicado".
- [x] DataLatam quedó como web demo simple: landing + API detrás del gateway, sin código de pagos.
      Retirada del monorepo después de M4 al pasar a demostrar contra tenants reales de producción.

### M4.5 · Login por email (Privy) — hecho

Reemplaza el onboarding por API key de M2.

- [x] Registro y login del dashboard por email: OTP verificado con `@privy-io/react-auth`
      (cliente) + `@privy-io/node` (servidor, verifica el access token).
- [x] Wallet de payout del tenant creada automáticamente como server wallet de Privy al registrarse.
- [x] Sesión del dashboard: cookie httpOnly firmada con HMAC (ya no depende del API key).

### M5 · Pulido + demo

- [x] Landing de la plataforma (rediseño con lenguaje visual propio)
- [ ] Ensayar el demo dos veces con cronómetro + video de respaldo
- [ ] Deck: problema → demo → cómo funciona → roadmap Stripe (fiat vía PaymentIntents + SPT)
- [ ] Diapositiva de roadmap: embed white-label para plataformas con usuarios finales (modelo
      Stripe Connect embedded components), basado en [EMBED-SPEC.md](./EMBED-SPEC.md)

## Guion del demo (~4 min)

1. **El problema:** `npx mppx validate` contra la web de un negocio sin Peaje → falla. Los agentes no pueden pagarle.
2. **La integración:** registrar el negocio con su email (Privy le crea la wallet de payout sola),
   apuntar al gateway. Menos de 2 minutos, cero código de pagos, cero crypto.
3. **El pago:** lanzar el agente con `mppx` → recibe el Challenge, paga solo, obtiene el recurso. Settlement en el explorer de Tempo.
4. **El dinero:** abrir el dashboard del tenant → sube el revenue en vivo con cada pago.
5. **La validación y el alcance:** correr `mppx validate` otra vez → pasa. Rematar mostrando el
   mismo endpoint como tool MCP pagada desde Claude, y el pitch de descubrimiento: "no solo te
   hacemos cobrable, te hacemos encontrable por cualquier agente".
6. **Cierre:** "Stripe le dio MPP a los devs. Peaje se lo da a cualquier negocio: tu email, un gateway y tu revenue en vivo."

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Testnet caída el día del demo | Video de respaldo grabado en M5 + seed de datos para el dashboard |
| Retiro on-chain lento en vivo | Mostrar "pending" con link al explorer y cortar a la confirmación grabada |
| Fricción del SDK en un flujo nuevo | M1 primero; el ciclo de pago ya está probado end to end |

## Notas de implementación

- Sin relay: el SDK de `mppx` valida el credential y broadcastea la tx. Un servicio externo menos.
- Token: pathUSD (`0x20c0…`). USDC.e no está desplegado en Moderato; el address queda configurable por `MPP_CURRENCY`.
- El gateway usa el flujo manual de `mppx` (no el middleware de Hono) porque el precio se resuelve por request desde la DB y el Receipt hay que leerlo en el mismo scope para acreditarlo al tenant correcto.

## Nota sobre EMBED-SPEC.md

Fuera del alcance del MVP. El iframe no aplica al caso base: los agentes hablan HTTP puro y el
dueño del negocio ya tiene el dashboard. La spec queda como roadmap para el caso plataforma:
clientes con usuarios finales propios que quieren mostrar ganancias y retiros dentro de su UI
(modelo Stripe Connect). El contrato del JWT y las rutas siguen válidos tal cual.
