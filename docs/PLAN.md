# Peaje · plan de implementación

Plataforma tipo "Secret para Agentic Finance": cualquier negocio obtiene un API key,
un gateway MPP que hace cobrables sus endpoints para agentes de IA, un dashboard con
retiros y un iframe embebible para su propio admin.

## Arquitectura

```
[Agente (mppx / Claude)] ──HTTP──> [Gateway multi-tenant (Hono)] ──proxy──> [Origin del cliente]
                                        │
                                        ├── flujo MPP (Challenge/Credential/Receipt)
                                        ├── settlement en Tempo testnet (el SDK valida y broadcastea)
                                        └── Ledger (Supabase): acredita cada Receipt al tenant

[Dashboard Next.js] ── lee ledger, config de tenant, ejecuta retiros (treasury -> wallet del cliente)
[Widget embebible]  ── iframe servido desde /embed, protegido por frame-ancestors + JWT corto
[Demo "DataLatam"]  ── app Next.js que encarna al cliente: API de datos + admin con el iframe
```

Decisiones fijas:

- Un solo treasury wallet de la plataforma recibe todos los pagos; el ledger reparte por `tenant_id`.
- "Retirar" = transferencia on-chain de stablecoin testnet desde la treasury a la wallet del tenant.
- El cliente nunca toca crypto en el onboarding: API key, URL de gateway y snippet de iframe.

## Stack

| Pieza | Elección |
|---|---|
| Gateway | Node + Hono, SDK `mppx` |
| Settlement | Tempo Moderato (testnet, chain 42431), pathUSD |
| DB | Supabase (Postgres, acceso por service role) |
| Dashboard + landing + embed | Next.js App Router |
| Cliente demo | app Next.js aparte ("DataLatam") |
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
- [x] Onboarding en dashboard: crear tenant → API key (una vez) + embed_secret + slug
- [x] CRUD mínimo de rutas y precios

### M3 · Dashboard y retiros — hecho

- [x] Balance disponible, requests pagados, revenue total, gráfica 7 días, tabla de últimos pagos
- [x] Retiro: wallet destino → transferencia desde treasury → `withdrawals` con `tx_ref` → link al explorer
- [x] Estados: pending → confirmed (polling del tx desde la UI cada 3 s)

### M4 · MCP + descubrimiento

El embed sale del MVP, ver la nota al final.

- [ ] MCP server por tenant: expone sus `routes` como tools pagas usando el mismo flujo MPP vía
      JSON-RPC (nombre, descripción y precio por tool desde la DB).
- [ ] Probar el ciclo completo desde Claude: descubre la tool → la invoca → paga → recibe el recurso.
- [ ] Auto-registro de descubrimiento en el onboarding del tenant:
  - [ ] Servir `/.well-known/` con la metadata de agent-readiness del tenant (lo que leen auditores
        tipo isitagentready.com).
  - [ ] Submit de los endpoints a índices del ecosistema MPP (MPPScan de Merit Systems); si no hay
        API pública de submit, mockear el paso en el demo y mostrarlo como "publicado".
- [ ] DataLatam queda como web demo simple: landing + API detrás del gateway + admin decorado sin
      iframe (solo captura del dashboard si hace falta mostrar algo).

### M5 · Pulido + demo

- [ ] Landing de la plataforma
- [ ] Ensayar el demo dos veces con cronómetro + video de respaldo
- [ ] Deck: problema → demo → cómo funciona → roadmap Stripe (fiat vía PaymentIntents + SPT)
- [ ] Diapositiva de roadmap: embed white-label para plataformas con usuarios finales (modelo
      Stripe Connect embedded components), basado en [EMBED-SPEC.md](./EMBED-SPEC.md)

## Guion del demo (~4 min)

1. **El problema:** `npx mppx validate` contra la web de DataLatam → falla. Los agentes no pueden pagarle.
2. **La integración:** registrar DataLatam, copiar API key, apuntar al gateway. Menos de 2 minutos, cero código de pagos.
3. **El pago:** lanzar el agente con `mppx` → recibe el Challenge, paga solo, obtiene el recurso. Settlement en el explorer de Tempo.
4. **El dinero:** abrir el dashboard del tenant → sube el revenue → botón retirar → llega la plata.
5. **La validación y el alcance:** correr `mppx validate` otra vez → pasa. Rematar mostrando el
   mismo endpoint como tool MCP pagada desde Claude, y el pitch de descubrimiento: "no solo te
   hacemos cobrable, te hacemos encontrable por cualquier agente".
6. **Cierre:** "Stripe le dio MPP a los devs. Peaje se lo da a cualquier negocio: API key, iframe y botón de retirar."

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
