-- RanchOps: esquema inicial
-- Jerarquía: rancho > divisiones > potreros > grupos > animales
-- Todo evento operativo es una fila en `eventos` (+ detalle por animal en `evento_animales`).

-- ============================================================
-- Perfiles y membresías
-- ============================================================

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  created_at timestamptz not null default now()
);

create table public.ranchos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  upp text,
  unidad_lluvia text not null default 'in' check (unidad_lluvia in ('in', 'mm')),
  meta_dias_descanso integer not null default 300,
  created_at timestamptz not null default now()
);

create table public.rancho_usuarios (
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  rol text not null default 'miembro' check (rol in ('admin', 'miembro')),
  created_at timestamptz not null default now(),
  primary key (rancho_id, usuario_id)
);

-- security definer para evitar recursión de RLS sobre rancho_usuarios
create or replace function public.es_miembro(r uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rancho_usuarios
    where rancho_id = r and usuario_id = (select auth.uid())
  );
$$;

-- ============================================================
-- Estructura del rancho
-- ============================================================

create table public.divisiones (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.potreros (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  nombre text not null,
  superficie_has numeric,
  geom jsonb, -- Feature GeoJSON (polígono)
  tipo_vegetacion text,
  capacidad_estimada integer,
  activo boolean not null default true,
  notas text,
  created_at timestamptz not null default now()
);

create table public.infraestructura (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  tipo text not null check (tipo in ('corral','bebedero','pila','pozo','papalote','tanque','camino','cerco','otro')),
  nombre text not null,
  geom jsonb, -- Feature GeoJSON (punto o línea)
  notas text,
  created_at timestamptz not null default now()
);

create table public.pluviometros (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  nombre text not null,
  geom jsonb, -- punto
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.lluvias (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  pluviometro_id uuid not null references public.pluviometros (id) on delete cascade,
  fecha date not null,
  cantidad numeric not null, -- en la unidad del rancho
  obs text,
  created_at timestamptz not null default now(),
  unique (pluviometro_id, fecha)
);

-- ============================================================
-- Ganado
-- ============================================================

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  nombre text not null,
  division_id uuid references public.divisiones (id) on delete set null,
  potrero_actual_id uuid references public.potreros (id) on delete set null,
  activo boolean not null default true,
  notas text,
  created_at timestamptz not null default now()
);

-- historial de ocupación de potreros (pastoreo rotacional)
create table public.grupo_movimientos (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  potrero_id uuid not null references public.potreros (id) on delete cascade,
  fecha_entrada date not null,
  fecha_salida date,
  num_animales_entrada integer,
  num_animales_salida integer,
  calif_buniga numeric, -- 1 a 4
  residuo text check (residuo in ('muy bajo','bajo','medio','alto','muy alto')),
  obs text,
  created_at timestamptz not null default now()
);

create table public.animales (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  arete_control text,
  siniga text,
  nombre text,
  sexo text check (sexo in ('H','M')),
  clase text not null default 'vaca' check (clase in ('vaca','vaquilla','toro','torete','becerro','becerra','caballo','otro')),
  raza text,
  fecha_nacimiento date,
  peso_nacimiento numeric,
  procedencia text,
  madre_id uuid references public.animales (id) on delete set null,
  padre_texto text, -- toro o semental/pajilla (texto libre: "Elemental", "Festus"…)
  division_id uuid references public.divisiones (id) on delete set null,
  grupo_id uuid references public.grupos (id) on delete set null,
  status text not null default 'activo' check (status in ('activo','vendido','muerto','desecho','transferido')),
  status_reproductivo text, -- 'C3', 'vacía', 'parida'…
  fecha_salida date,
  causa_salida text,
  foto_url text,
  notas text,
  created_at timestamptz not null default now()
);

create index animales_rancho_status_idx on public.animales (rancho_id, status);
create index animales_grupo_idx on public.animales (grupo_id);

-- ============================================================
-- Insumos (productos e inventario)
-- ============================================================

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  nombre text not null,
  tipo text not null default 'otro' check (tipo in ('alimento','mineral','suplemento','medicamento','vacuna','hormonal','semen','combustible','otro')),
  unidad text not null default 'saco', -- saco, tina, paca, dosis, litro, pajilla…
  contenido_kg numeric, -- kg por unidad, si aplica
  costo_unitario numeric,
  stock_minimo numeric,
  proveedor text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  tipo text not null check (tipo in ('entrada','salida','ajuste')),
  cantidad numeric not null, -- positiva; el signo lo da `tipo`
  costo_unitario numeric,
  costo_total numeric,
  fecha date not null default current_date,
  proveedor text,
  evento_id uuid, -- FK a eventos (se agrega después de crear eventos)
  obs text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Eventos (registro polimórfico: el corazón del sistema)
-- ============================================================

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  tipo text not null, -- vacunacion, desparasitacion, tratamiento, vitaminado, pesaje, aretado,
                      -- castracion, ia, colocacion_cidr, retiro_cidr, aplicacion_hormonal,
                      -- palpacion, ultrasonido, parto, destete, muerte, alimentacion, curacion,
                      -- movimiento_potrero, cambio_grupo, compra, nota_bitacora, otro
  fecha date not null default current_date,
  grupo_id uuid references public.grupos (id) on delete set null,
  potrero_id uuid references public.potreros (id) on delete set null,
  producto_id uuid references public.productos (id) on delete set null,
  cantidad numeric, -- cantidad de producto usada (en unidad del producto)
  dosis text, -- "5 ml IM"
  responsable text,
  resultado text,
  costo_total numeric,
  obs text,
  detalle jsonb, -- campos específicos del tipo (p.ej. parto: {dificultad, cria_id})
  creado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index eventos_rancho_fecha_idx on public.eventos (rancho_id, fecha desc);
create index eventos_grupo_idx on public.eventos (grupo_id);
create index eventos_tipo_idx on public.eventos (rancho_id, tipo);

create table public.evento_animales (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  evento_id uuid not null references public.eventos (id) on delete cascade,
  animal_id uuid not null references public.animales (id) on delete cascade,
  valores jsonb, -- {peso: 320, resultado: "C3", obs: "..."}
  created_at timestamptz not null default now(),
  unique (evento_id, animal_id)
);

create index evento_animales_animal_idx on public.evento_animales (animal_id);

alter table public.inventario_movimientos
  add constraint inventario_movimientos_evento_fk
  foreign key (evento_id) references public.eventos (id) on delete set null;

-- ============================================================
-- Finanzas
-- ============================================================

create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  fecha date not null default current_date,
  concepto text not null,
  proveedor text,
  monto numeric not null,
  categoria text not null default 'otros',
  division_id uuid references public.divisiones (id) on delete set null,
  potrero_id uuid references public.potreros (id) on delete set null,
  grupo_id uuid references public.grupos (id) on delete set null,
  num_animales integer,
  comprobante_url text,
  obs text,
  creado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index gastos_rancho_fecha_idx on public.gastos (rancho_id, fecha desc);

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  fecha date not null default current_date,
  comprador text,
  guia text,
  reemo text,
  division_id uuid references public.divisiones (id) on delete set null,
  obs text,
  creado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.venta_renglones (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  venta_id uuid not null references public.ventas (id) on delete cascade,
  clase text not null, -- vacas, toros, toretes, becerros, becerras, vaquillas, caballos…
  cabezas integer not null default 1,
  kilos_salida numeric,
  kilos_venta numeric,
  precio_kg numeric,
  precio_cabeza numeric,
  total numeric not null default 0
);

create table public.venta_animales (
  venta_id uuid not null references public.ventas (id) on delete cascade,
  animal_id uuid not null references public.animales (id) on delete cascade,
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  primary key (venta_id, animal_id)
);

-- ============================================================
-- Vistas
-- ============================================================

-- Existencias por producto
create or replace view public.v_existencias with (security_invoker = true) as
select
  p.id as producto_id,
  p.rancho_id,
  p.nombre,
  p.tipo,
  p.unidad,
  p.stock_minimo,
  p.costo_unitario,
  coalesce(sum(
    case im.tipo
      when 'entrada' then im.cantidad
      when 'salida' then -im.cantidad
      else im.cantidad
    end
  ), 0) as existencia
from public.productos p
left join public.inventario_movimientos im on im.producto_id = p.id
where p.activo
group by p.id;

-- Estado de cada potrero: ocupación actual y días de descanso
create or replace view public.v_potrero_estado with (security_invoker = true) as
select
  p.id as potrero_id,
  p.rancho_id,
  p.nombre,
  p.superficie_has,
  oc.grupo_id as grupo_actual_id,
  oc.fecha_entrada as ocupado_desde,
  case when oc.id is not null
    then (current_date - oc.fecha_entrada)
  end as dias_ocupado,
  us.ultima_salida,
  case when oc.id is null and us.ultima_salida is not null
    then (current_date - us.ultima_salida)
  end as dias_descanso
from public.potreros p
left join lateral (
  select gm.id, gm.grupo_id, gm.fecha_entrada
  from public.grupo_movimientos gm
  where gm.potrero_id = p.id and gm.fecha_salida is null
  order by gm.fecha_entrada desc
  limit 1
) oc on true
left join lateral (
  select max(gm.fecha_salida) as ultima_salida
  from public.grupo_movimientos gm
  where gm.potrero_id = p.id and gm.fecha_salida is not null
) us on true
where p.activo;

-- ============================================================
-- RLS
-- ============================================================

alter table public.perfiles enable row level security;
alter table public.ranchos enable row level security;
alter table public.rancho_usuarios enable row level security;
alter table public.divisiones enable row level security;
alter table public.potreros enable row level security;
alter table public.infraestructura enable row level security;
alter table public.pluviometros enable row level security;
alter table public.lluvias enable row level security;
alter table public.grupos enable row level security;
alter table public.grupo_movimientos enable row level security;
alter table public.animales enable row level security;
alter table public.productos enable row level security;
alter table public.inventario_movimientos enable row level security;
alter table public.eventos enable row level security;
alter table public.evento_animales enable row level security;
alter table public.gastos enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_renglones enable row level security;
alter table public.venta_animales enable row level security;

-- perfiles: cada quien el suyo
create policy "perfil propio" on public.perfiles
  for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ranchos: miembros leen/actualizan; cualquier usuario autenticado puede crear
create policy "ranchos select" on public.ranchos
  for select using (public.es_miembro(id));
create policy "ranchos insert" on public.ranchos
  for insert with check ((select auth.uid()) is not null);
create policy "ranchos update" on public.ranchos
  for update using (public.es_miembro(id));

-- rancho_usuarios: ver membresías propias o de mis ranchos; el creador se agrega a sí mismo
create policy "membresias select" on public.rancho_usuarios
  for select using (usuario_id = (select auth.uid()) or public.es_miembro(rancho_id));
create policy "membresias insert propia" on public.rancho_usuarios
  for insert with check (usuario_id = (select auth.uid()) or public.es_miembro(rancho_id));
create policy "membresias delete" on public.rancho_usuarios
  for delete using (public.es_miembro(rancho_id));

-- resto de tablas: política uniforme por membresía del rancho
do $$
declare
  t text;
begin
  foreach t in array array[
    'divisiones','potreros','infraestructura','pluviometros','lluvias',
    'grupos','grupo_movimientos','animales','productos','inventario_movimientos',
    'eventos','evento_animales','gastos','ventas','venta_renglones','venta_animales'
  ]
  loop
    execute format(
      'create policy "miembros todo" on public.%I for all using (public.es_miembro(rancho_id)) with check (public.es_miembro(rancho_id));',
      t
    );
  end loop;
end $$;

-- Agregar un miembro por correo (solo miembros del rancho pueden invitar)
create or replace function public.agregar_miembro_por_correo(correo text, r uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if not public.es_miembro(r) then
    return 'No tienes permiso en este rancho';
  end if;
  select id into uid from auth.users where lower(email) = lower(correo) limit 1;
  if uid is null then
    return 'No existe una cuenta con ese correo; pide a la persona que se registre primero';
  end if;
  insert into public.rancho_usuarios (rancho_id, usuario_id, rol)
  values (r, uid, 'miembro')
  on conflict do nothing;
  return 'ok';
end;
$$;

-- ============================================================
-- Storage: bucket para fotos y comprobantes
-- ============================================================

insert into storage.buckets (id, name, public)
values ('ranchops', 'ranchops', false)
on conflict (id) do nothing;

create policy "archivos de miembros select" on storage.objects
  for select using (
    bucket_id = 'ranchops'
    and public.es_miembro(((storage.foldername(name))[1])::uuid)
  );
create policy "archivos de miembros insert" on storage.objects
  for insert with check (
    bucket_id = 'ranchops'
    and public.es_miembro(((storage.foldername(name))[1])::uuid)
  );
create policy "archivos de miembros delete" on storage.objects
  for delete using (
    bucket_id = 'ranchops'
    and public.es_miembro(((storage.foldername(name))[1])::uuid)
  );
