# 🐄 RanchOps

Aplicación web de administración de ranchos ganaderos (inspirada en AgriWebb),
hecha para la operación de José Carlos: ganado, potreros, pastoreo rotacional,
lluvias, trabajos de ganado, inventario de insumos, costos y ventas — todo
conectado en una sola base de datos.

**Stack:** Next.js (App Router) · Supabase (Postgres + Auth + Storage) · Mapbox · Tailwind + shadcn/ui · Vercel.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. Aplica el esquema: abre el **SQL Editor** del proyecto y ejecuta el contenido
   de [`supabase/migrations/0001_esquema_inicial.sql`](supabase/migrations/0001_esquema_inicial.sql)
   — o con la CLI: `supabase link --project-ref <ref>` y `supabase db push`.
3. En **Authentication → Providers → Email**, puedes desactivar
   "Confirm email" para que las cuentas entren sin confirmación por correo
   (recomendado al inicio).

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (anon/public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (solo para el script de importación) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | [account.mapbox.com](https://account.mapbox.com) (token público, gratis) |

### 3. Correr en local

```bash
pnpm install
pnpm dev
```

Abre http://localhost:3000, crea tu cuenta y luego tu rancho (se crean solas
las divisiones Pie de cría / Repasto / Engorda y el catálogo inicial de insumos).

### 4. Importar los Exceles reales (opcional pero recomendado)

Con el rancho ya creado desde la app y los `.xlsx` en `datos-excel/`:

```bash
pnpm importar "La Jaimea"
```

Importa: inventario de ganado 2026 con crías y eventos generales, los ~33
potreros con todo el historial de pastoreo por temporada, los pluviómetros con
todas sus lecturas, y las ventas 2023–2026. Cada sección se salta sola si el
rancho ya tiene datos de ese tipo.

### 5. Desplegar en Vercel

```bash
vercel
```

Agrega las variables `NEXT_PUBLIC_*` en Vercel → Settings → Environment
Variables y vuelve a desplegar. Sin ellas, la app muestra la guía de
instalación en `/instalacion`.

## Estructura

- `supabase/migrations/` — esquema completo (tablas, vistas, RLS por rancho, storage).
- `src/app/(app)/` — módulos: dashboard, ganado, grupos, trabajos, bitácora,
  potreros, mapa, lluvias, inventario, costos, ventas, reportes, configuración.
- `src/app/(auth)/` — login y creación de rancho.
- `src/lib/catalogos.ts` — vocabulario del dominio (tipos de trabajo, clases,
  categorías de gasto, productos iniciales).
- `scripts/importar-excel.ts` — migración de los Exceles.

## Conceptos del modelo

Rancho → divisiones → potreros → **grupos** (lotes de manejo) → **animales**.
Todo lo que pasa es un **evento** fechado (vacunación, palpación, parto, pesaje,
alimentación, movimiento de potrero, nota de bitácora…) ligado a los animales
que participaron. Un evento con producto descuenta el **inventario** y genera
**costo**. La **palpación** actualiza el status reproductivo; el **parto** crea
la cría ligada a su madre; la **venta** saca al animal del inventario activo
conservando su historial. Los **días de descanso** de cada potrero se calculan
solos a partir de las entradas y salidas de grupos.
