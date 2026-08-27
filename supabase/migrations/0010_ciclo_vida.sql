-- Ciclo de vida: retiro (carencia), metas de peso y compras de ganado.
--
-- 1. `productos.dias_retiro`: días que la carne no se puede vender después
--    de aplicar el producto. La app AVISA (ficha y venta), nunca bloquea:
--    la regla de la casa es que la persona decide.
-- 2. Lote y caducidad en las entradas de inventario, para la trazabilidad
--    de tratamientos.
-- 3. Meta de peso por animal (peso y fecha objetivo) para la proyección.
-- 4. Compras de ganado: espejo de ventas (renglones por clase + liga por
--    animal), con el mismo candado solo-admin del dinero (migración 0005).
--
-- Idempotente: se puede correr varias veces sin romper nada.

-- ============================================================
-- Retiro y trazabilidad de insumos
-- ============================================================

alter table public.productos add column if not exists dias_retiro integer;
alter table public.inventario_movimientos add column if not exists lote text;
alter table public.inventario_movimientos add column if not exists caducidad date;

-- Animales que siguen dentro del período de retiro por algún tratamiento
create or replace view public.v_animales_en_retiro with (security_invoker = true) as
select
  ea.rancho_id,
  ea.animal_id,
  e.fecha as fecha_tratamiento,
  p.nombre as producto,
  p.dias_retiro,
  (e.fecha + p.dias_retiro) as retiro_hasta
from public.evento_animales ea
join public.eventos e on e.id = ea.evento_id
join public.productos p on p.id = e.producto_id
where p.dias_retiro is not null
  and e.fecha + p.dias_retiro >= current_date;

grant select on public.v_animales_en_retiro to anon, authenticated, service_role;

-- ============================================================
-- Meta de peso por animal
-- ============================================================

alter table public.animales add column if not exists peso_objetivo numeric;
alter table public.animales add column if not exists fecha_objetivo date;

-- ============================================================
-- Compras de ganado
-- ============================================================

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  fecha date not null default current_date,
  proveedor text,
  guia text,
  reemo text,
  division_id uuid references public.divisiones (id) on delete set null,
  obs text,
  creado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.compra_renglones (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  compra_id uuid not null references public.compras (id) on delete cascade,
  clase text not null,
  cabezas integer not null default 1,
  kilos numeric,
  precio_kg numeric,
  precio_cabeza numeric,
  total numeric not null default 0
);

create table if not exists public.compra_animales (
  compra_id uuid not null references public.compras (id) on delete cascade,
  animal_id uuid not null references public.animales (id) on delete cascade,
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  primary key (compra_id, animal_id)
);

create index if not exists compras_rancho_idx on public.compras (rancho_id, fecha);
create index if not exists compra_renglones_compra_idx on public.compra_renglones (compra_id);
create index if not exists compra_animales_animal_idx on public.compra_animales (animal_id);

alter table public.compras enable row level security;
alter table public.compra_renglones enable row level security;
alter table public.compra_animales enable row level security;

-- El dinero es solo de quien administra, igual que ventas y gastos.
do $$
declare t text;
begin
  foreach t in array array['compras', 'compra_renglones', 'compra_animales']
  loop
    execute format('drop policy if exists %I on public.%I', 'solo admin', t);
    execute format(
      'create policy %I on public.%I for all using (public.es_admin(rancho_id)) with check (public.es_admin(rancho_id))',
      'solo admin', t
    );
  end loop;
end $$;

grant all on public.compras, public.compra_renglones, public.compra_animales to authenticated, service_role;

notify pgrst, 'reload schema';
