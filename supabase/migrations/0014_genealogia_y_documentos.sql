-- Padres de fuera y documentos del animal.
--
-- 1) "Quise meterle al toro que compré la mamá y el papá, pero sólo me deja
--    poner opciones del mismo rancho": un toro de registro traído de fuera
--    tiene padres que no están —ni van a estar— en el inventario. Solo existen
--    en el certificado de la asociación, con su nombre y su número de registro.
--    `padre_texto` ya guardaba el nombre del semental de fuera (0001); faltaban
--    su registro y todo el lado materno.
--
-- 2) "Ya le saqué las pruebas de genomas y quisiera subirlas": hasta ahora un
--    animal aguantaba una sola foto (animales.foto_url). Los papeles del animal
--    —genómica, certificado de registro, ultrasonidos, facturas— necesitan su
--    propia tabla, porque son varios y cada uno tiene su fecha y su tipo.
--
-- Idempotente: se puede correr varias veces sin romper nada.

-- ── Genealogía ────────────────────────────────────────────────────────────
alter table public.animales add column if not exists num_registro text;
alter table public.animales add column if not exists madre_texto text;
alter table public.animales add column if not exists madre_registro text;
alter table public.animales add column if not exists padre_registro text;

comment on column public.animales.num_registro is
  'Número de registro del propio animal en su asociación de criadores.';
comment on column public.animales.madre_texto is
  'Madre que no está en el rancho (nombre tal como viene en el certificado).';

-- La ficha de un toro ahora lista a sus hijos igual que la de una vaca lista a
-- sus crías; el índice de madre existe desde 0004, el de padre nunca se creó.
create index if not exists animales_padre_idx on public.animales (padre_id);

-- ── Documentos del animal ─────────────────────────────────────────────────
-- `archivo_url` guarda la RUTA dentro del bucket privado `ranchops`
-- ({rancho_id}/documentos/{uuid}.pdf), no una URL: se firma al mostrarla, igual
-- que animales.foto_url y gastos.comprobante_url.
create table if not exists public.animal_documentos (
  id uuid primary key default gen_random_uuid(),
  rancho_id uuid not null references public.ranchos (id) on delete cascade,
  animal_id uuid not null references public.animales (id) on delete cascade,
  tipo text not null default 'otro'
    check (tipo in ('genomica','registro','ultrasonido','laboratorio','factura','otro')),
  titulo text,
  fecha date,
  nota text,
  archivo_url text not null,
  nombre_archivo text,
  mime text,
  creado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Esta lista tiene que coincidir con TIPOS_DOCUMENTO en src/lib/catalogos.ts.
comment on column public.animal_documentos.tipo is
  'Catálogo espejo de TIPOS_DOCUMENTO (src/lib/catalogos.ts).';

create index if not exists animal_documentos_animal_idx
  on public.animal_documentos (animal_id, fecha desc nulls last, created_at desc);

alter table public.animal_documentos enable row level security;

do $$
begin
  begin
    create policy "miembros todo" on public.animal_documentos
      for all using (public.es_miembro(rancho_id))
      with check (public.es_miembro(rancho_id));
  exception when duplicate_object then null;
  end;
end $$;

grant all on public.animal_documentos to authenticated, service_role;

notify pgrst, 'reload schema';
