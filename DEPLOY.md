# Deploy en Vercel + Neon (paso a paso)

Costo para arrancar: **US$0**. Solo el dominio es opcional (~US$10/año).

---

## 1. Base de datos gratis en Neon

1. Entrá a https://neon.tech y creá una cuenta (con GitHub o Google).
2. **Create Project** → elegí región **AWS us-east** (o São Paulo si aparece).
3. Copiá la **Connection string** (botón "Connect", opción *Pooled connection*).
   Se ve así:
   ```
   postgresql://usuario:clave@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Crear las tablas y cargar datos (desde tu PC)

En `creatorbid/.env`, pegá esa URL en `DATABASE_URL`. Después:

```bash
cd creatorbid
npm install
npm run db:push     # crea las tablas en Neon
npm run db:seed     # (opcional) 12 creadores de ejemplo
npm run dev         # probá local contra Neon: http://localhost:3200
```

> A partir de acá, local y producción usan la **misma base** Neon. Una sola.

## 3. Subir el código a GitHub

Si el proyecto todavía no está en git:

```bash
cd creatorbid
git init
git add .
git commit -m "LanceTop"
```

Creá un repo en https://github.com/new y seguí las instrucciones para
`git remote add origin ...` + `git push`.

> El `.gitignore` ya excluye `.env` y la base local: tus secretos no se suben.

## 4. Deploy en Vercel

1. Entrá a https://vercel.com y **Add New → Project**; importá tu repo de GitHub.
2. Vercel detecta Next.js solo. Si el proyecto está en la subcarpeta `creatorbid/`,
   poné **Root Directory = `creatorbid`**.
3. En **Environment Variables**, cargá (mismos nombres que tu `.env`):
   - `DATABASE_URL` → la URL de Neon
   - `PAYMENT_PROVIDER` → `infinitepay` (o `sandbox` para probar sin cobrar)
   - `NEXT_PUBLIC_BASE_URL` → tu dominio de Vercel (ver paso 5)
   - `INFINITEPAY_HANDLE`, `INFINITEPAY_WEBHOOK_SECRET` (si usás InfinitePay)
4. **Deploy**. En ~1 minuto tenés `https://tu-app.vercel.app`.

## 5. Ajustar la URL pública

Tras el primer deploy, Vercel te da el dominio. Volvé a Environment Variables,
poné ese valor en `NEXT_PUBLIC_BASE_URL` (ej. `https://lancetop.vercel.app`) y
**redeploy** (Deployments → ⋯ → Redeploy). Así los webhooks apuntan bien.

## 6. Conectar el webhook de InfinitePay

Como HTTPS ya es automático en Vercel, **no hace falta ngrok**. La app arma sola
la URL del webhook con tu secreto:

```
https://tu-app.vercel.app/api/payments/infinitepay/<INFINITEPAY_WEBHOOK_SECRET>
```

InfinitePay recibe ese `webhook_url` en cada cobro que crea la app, así que no
tenés que configurar nada extra en su panel (a menos que su cuenta pida
registrar el dominio; en ese caso, usá esa misma URL).

---

## Checklist para cobrar de verdad
- [ ] `PAYMENT_PROVIDER="infinitepay"` en Vercel
- [ ] `INFINITEPAY_HANDLE` = tu $tag (sin el $)
- [ ] `INFINITEPAY_WEBHOOK_SECRET` = una cadena larga y aleatoria
- [ ] `NEXT_PUBLIC_BASE_URL` = tu dominio real
- [ ] Una prueba con monto chico (ej. R$5) para confirmar que el ranking sube solo

## Notas
- **Actualizar el sitio**: cada `git push` a la rama principal redeploya solo.
- **Migraciones futuras**: si cambiás `schema.prisma`, corré `npm run db:push`
  contra Neon (o `prisma migrate deploy` si adoptás migraciones).
- **Plan gratis de Vercel**: alcanza para empezar; si el tráfico crece, se escala.
