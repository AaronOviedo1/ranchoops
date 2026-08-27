-- Tareas del rancho: lo que HAY que hacer, con responsable y vencimiento.
--
-- No confundir con `eventos.responsable`, que es quién HIZO un trabajo ya
-- capturado. La tarea es la promesa; el evento es el hecho.
--
-- Sin "equipo": con 2-3 usuarios por rancho basta el responsable. La
-- ubicación se da a la mexicana: el potrero o el grupo al que le toca.
--
-- Idempotente: se puede correr varias veces sin romper nada.

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  nombre text not null,
  descripcion text,
  prioridad text not null default 'media' check (prioridad in ('baja','media','alta')),
  categoria text not null default 'general',
  fecha_inicio date,
  fecha_vence date,
  responsable_id uuid references auth.users (id) on delete set null,
  potrero_id uuid references public.potreros (id) on delete set null,
  grupo_id uuid references public.grupos (id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','hecha','cancelada')),
  hecha_at timestamptz,
  hecha_por uuid references auth.users (id) on delete set null,
  creado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tareas_rancho_idx on public.tareas (rancho_id, estado, fecha_vence);

alter table public.tareas enable row level security;

do $$
begin
  begin
    create policy "miembros todo" on public.tareas
      for all using (public.es_miembro(rancho_id))
      with check (public.es_miembro(rancho_id));
  exception when duplicate_object then null;
  end;
end $$;

grant all on public.tareas to authenticated, service_role;

notify pgrst, 'reload schema';
