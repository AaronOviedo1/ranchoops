-- Cambios pedidos en la junta del 18 de agosto con José Carlos y Miguel.
--
-- 1. El rancho no es solo de bovinos: se agrega `especie` y las clases de
--    equinos, ovinos, caprinos, cérvidos y asnales.
-- 2. El peso al destete es el dato que nadie registra y todos quieren
--    (nacen de 40 kg y se destetan de 200).
-- 3. En la manga se hacen varias cosas al mismo animal en una sola pasada:
--    `sesion_id` agrupa los eventos de una jornada sin cambiar la lógica de
--    inventario ni de costos (cada acción sigue siendo su propio evento).
-- 4. El mapa necesita más tipos de área e infraestructura.
-- 5. Los medicamentos controlados (xilacina) necesitan bitácora comprobable.
--
-- Idempotente: se puede correr varias veces sin romper nada.

-- ============================================================
-- Animales: especie, clases por especie, destete, padre ligado
-- ============================================================

alter table public.animales add column if not exists especie text;
alter table public.animales add column if not exists peso_destete numeric;
alter table public.animales add column if not exists fecha_destete date;
alter table public.animales add column if not exists padre_id uuid
  references public.animales (id) on delete set null;

-- Backfill antes de imponer el not null: lo que hoy es 'caballo' es equino,
-- todo lo demás nació como bovino.
update public.animales
set especie = case when clase = 'caballo' then 'equino' else 'bovino' end
where especie is null;

alter table public.animales alter column especie set default 'bovino';
alter table public.animales alter column especie set not null;

alter table public.animales drop constraint if exists animales_especie_check;
alter table public.animales add constraint animales_especie_check
  check (especie in ('bovino','equino','ovino','caprino','cervido','asnal','otro'));

-- El check viejo solo admitía las 8 clases bovinas + 'caballo'. Se sustituye
-- por la unión de todas las especies; que la clase corresponda a la especie
-- lo valida la app (src/lib/catalogos.ts), no la base.
alter table public.animales drop constraint if exists animales_clase_check;
alter table public.animales add constraint animales_clase_check
  check (clase in (
    -- bovinos
    'vaca','vaquilla','toro','torete','novillo','becerro','becerra',
    -- equinos ('caballo' se conserva: es lo que ya está capturado)
    'caballo','yegua','garanon','capon','potro','potranca',
    -- ovinos
    'borrego','borrega','cordero','cordera',
    -- caprinos
    'chivo','chiva','cabrito','cabrita',
    -- cérvidos
    'venado','cierva','cervatillo',
    -- asnales
    'burro','burra','burrito',
    'otro'
  ));

create index if not exists animales_especie_idx on public.animales (rancho_id, especie);
create index if not exists animales_madre_idx on public.animales (madre_id);

-- ============================================================
-- Infraestructura: áreas y puntos que faltaban en el mapa
-- ============================================================

alter table public.infraestructura add column if not exists capacidad numeric;
alter table public.infraestructura add column if not exists capacidad_actual numeric;

alter table public.infraestructura drop constraint if exists infraestructura_tipo_check;
alter table public.infraestructura add constraint infraestructura_tipo_check
  check (tipo in (
    -- agua
    'bebedero','pila','pozo','papalote','tanque','tuberia',
    -- manejo
    'corral','manga','feedlot','comedero','bloque_mineral','cebo','tranquera',
    -- energía y accesos
    'panel_solar','camino','cerco',
    -- áreas
    'humedal','erosion','agricola','pivote',
    'otro'
  ));

-- ============================================================
-- Eventos: sesiones de manga, foto y bitácora de controlados
-- ============================================================

alter table public.eventos add column if not exists sesion_id uuid;
alter table public.eventos add column if not exists foto_url text;
alter table public.eventos add column if not exists receta_folio text;
alter table public.eventos add column if not exists mvz text;

create index if not exists eventos_sesion_idx on public.eventos (sesion_id)
  where sesion_id is not null;

alter table public.productos add column if not exists controlado boolean not null default false;

-- ============================================================
-- Plantillas de trabajo (reusar la misma jornada en otro grupo, otro día)
-- ============================================================

create table if not exists public.plantillas_trabajo (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  nombre text not null,
  -- [{tipo, producto_id, dosis, cantidad_por_animal}]
  pasos jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  creado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists plantillas_trabajo_rancho_idx
  on public.plantillas_trabajo (rancho_id) where activo;

alter table public.plantillas_trabajo enable row level security;

do $$
begin
  begin
    create policy "plantillas_trabajo por membresia" on public.plantillas_trabajo
      for all using (public.es_miembro(rancho_id))
      with check (public.es_miembro(rancho_id));
  exception when duplicate_object then null;
  end;
end $$;

grant all on public.plantillas_trabajo to anon, authenticated, service_role;

-- ============================================================
-- Roles (fase de permisos): operador y capturista
-- ============================================================

alter table public.rancho_usuarios drop constraint if exists rancho_usuarios_rol_check;
alter table public.rancho_usuarios add constraint rancho_usuarios_rol_check
  check (rol in ('admin','operador','capturista','miembro'));

notify pgrst, 'reload schema';

-- ============================================================
-- Preacondicionamiento en los ranchos que ya existían
--
-- "Los destete y pasaron a preacondicionamiento: los metieron en un corral
--  30 días, les di comida, y ya lo saqué al repasto."
-- ============================================================

insert into public.divisiones (rancho_id, nombre, descripcion)
select r.id, 'Preacondicionamiento', 'Corral de transición entre el destete y el repasto'
from public.ranchos r
where not exists (
  select 1 from public.divisiones d
  where d.rancho_id = r.id and lower(d.nombre) = 'preacondicionamiento'
);

notify pgrst, 'reload schema';
