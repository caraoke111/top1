# LanceTop — o ranking de criadores que o dinheiro decide

Clon funcional de CreatorBid: un ranking de creadores donde la posición se
decide **pujando dinero real por Pix**. Sin jurados, sin algoritmo. Solo ego.

Stack: **Next.js 16** (App Router) · **Prisma** · **SQLite** (dev) / **Postgres** (prod)
· capa de pagos **intercambiable** con **modo sandbox** (Pix simulado, sin credenciales).

---

## Cómo correr en local (Windows)

```bash
cd creatorbid
npm install            # instala + genera el cliente Prisma
npm run db:push        # crea la base SQLite (prisma/dev.db)
npm run db:seed        # carga 12 creadores de ejemplo
npm run dev            # http://localhost:3200
```

Todo funciona sin ninguna credencial: el modo **sandbox** genera un QR y un
código Pix, y podés confirmar el pago con el botón **"Simular pagamento"** o
dejar que se autoconfirme (ver `SANDBOX_AUTO_CONFIRM_SECS` en `.env`).

---

## Cómo funciona el juego

- Cada creador tiene un **lance** (puja en R$). El ranking se ordena por lance.
- Para superar a alguien pagás un poco más que su lance (`priceToBeat` en
  `lib/site.ts`: +5% o +R$1, lo que sea mayor).
- Si ya estás en el ranking, usá el **mismo @** para subir tu propio lance.
- Widgets: **más clicado (24h)**, **reinado más largo** (tiempo en el #1) y
  **ego más grande** (lance más alto).
- **Presencia en vivo**: cada visitante manda un heartbeat; se muestra cuántos
  "olhos" están mirando.

Reglas y textos centralizados en [`lib/site.ts`](lib/site.ts) — cambiá ahí el
nombre de marca, la moneda, los incrementos y todos los textos (PT-BR).

---

## Pasar a producción

### 1. Base de datos → Postgres
En [`prisma/schema.prisma`](prisma/schema.prisma) cambiá:
```prisma
datasource db {
  provider = "postgresql"   // era "sqlite"
  url      = env("DATABASE_URL")
}
```
Poné en `.env` la URL de Neon/Supabase/Vercel Postgres y corré:
```bash
npx prisma migrate deploy
npm run db:seed   # opcional
```

### Automatización de pagos (ya implementada: Mercado Pago)

El flujo automático **no tiene pasos manuales**: cuando el dinero entra, el
proveedor llama a tu **webhook**, tu server marca el lance como pago y reordena
el ranking; el frontend (polling cada 5s) hace subir al usuario solo.

```
puja → QR Pix → usuario paga en su banco
     → Mercado Pago → POST /api/payments/webhook (verifica firma + monto)
     → applyPaidBid() → ranking reordenado → el usuario sube automáticamente
```

**Probarlo en modo test (sin CNPJ):**
1. Creá una app en https://www.mercadopago.com.br/developers y copiá el
   **access token de teste** → `.env`: `MERCADOPAGO_ACCESS_TOKEN="TEST-..."`.
2. Poné `PAYMENT_PROVIDER="mercadopago"`.
3. En **Webhooks** del panel MP, configurá la URL pública
   `https://.../api/payments/webhook` y copiá la **firma secreta** →
   `MERCADOPAGO_WEBHOOK_SECRET`.
4. En local, MP no llega a `localhost`: exponé el puerto con **ngrok**
   (`ngrok http 3200`) y usá esa URL en `NEXT_PUBLIC_BASE_URL` y en el webhook.
   *Aun sin webhook, el checkout confirma solo por el fallback de polling
   (`isPaid`) que consulta el estado directo a MP.*
5. Pagá el QR con un **usuario de prueba** de MP → el ranking se reordena solo.

Las 2 verificaciones de seguridad ya están en el webhook
([`app/api/payments/webhook/route.ts`](app/api/payments/webhook/route.ts)):
**firma HMAC** (que venga de MP) y **monto** (que lo pagado ≥ el lance).

### InfinitePay (recomendado — Pix real, sin CNPJ nuevo)

**Ya implementado** ([`lib/payments/infinitepay.ts`](lib/payments/infinitepay.ts)
+ webhook [`app/api/payments/infinitepay/[secret]/route.ts`](app/api/payments/infinitepay/)).
Es una pasarela real: **montos dinámicos** (cualquier valor) y Pix, con la cuenta
que ya tenés en Brasil.

Activarlo:
1. `.env`: `PAYMENT_PROVIDER="infinitepay"`, `INFINITEPAY_HANDLE="tu-tag"`,
   `INFINITEPAY_WEBHOOK_SECRET="cadena-larga-aleatoria"`.
2. `NEXT_PUBLIC_BASE_URL` = tu dominio (o la URL de **ngrok** en local).
3. La app crea el link vía `POST /links` con `order_nsu=<bidId>` y configura el
   `webhook_url` a `{BASE}/api/payments/infinitepay/{SECRET}`.

**Seguridad del webhook** (la doc no trae firma, así que va en capas):
`app/api/payments/infinitepay/[secret]/route.ts` verifica **(1)** el secreto en
la URL, **(2)** el pago real llamando a `POST /payment_check` (no confía en la
notificación), **(3)** que el monto pagado cubra el lance, **(4)** idempotencia.

> Como InfinitePay permite montos libres, se puede volver al mecanismo original
> de "puja libre + robar por R$1" (hoy usa niveles fijos, heredados de Hotmart).
> Es un cambio chico en `lib/site.ts` + el selector del modal.

### Otros proveedores ya cableados
- **Hotmart** (`lib/payments/hotmart.ts`) — Merchant of Record, precios fijos.
- **Mercado Pago** (`lib/payments/mercadopago.ts`) — Pix propio con QR.

Para agregar otro (ej. **dLocal**): implementá `createCharge` + `isPaid` de la
interfaz [`lib/payments/index.ts`](lib/payments/index.ts), agregá el `case` en
`getPaymentProvider()` y su ruta de webhook. Nada del frontend ni del ranking
cambia — todo habla con la interfaz abstracta.

---

## Estructura

```
app/
  page.tsx                     → home
  api/
    ranking/route.ts           → GET ranking + widgets + presencia
    bids/route.ts              → POST crear lance (genera Pix)
    payments/[id]/route.ts     → GET estado (polling, autoconfirma sandbox)
    payments/confirm/route.ts  → POST confirmar (botón demo / webhook real)
    clicks/route.ts            → POST registrar clic
    presence/route.ts          → POST heartbeat de presencia
components/                     → Hero, Leaderboard, WidgetsBar, BidModal
lib/
  site.ts                      → marca, reglas, textos (editá acá)
  bids.ts                      → lógica de ranking, reinado, widgets
  payments/                    → capa de pagos (sandbox + stubs reales)
  prisma.ts                    → cliente Prisma
prisma/
  schema.prisma                → modelo de datos
  seed.mjs                     → datos de ejemplo
```
