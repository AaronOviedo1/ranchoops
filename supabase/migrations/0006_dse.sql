-- Equivalencias DSE (Dry Sheep Equivalent) por categoría de animal.
--
-- El DSE mide cuánto come cada animal en relación a una oveja seca: un toro
-- come 19.1 veces lo que ella, un ternero 1.91. Sirve para expresar la carga
-- de un potrero en una sola cifra, aunque adentro haya vacas, novillos y
-- corderos revueltos.
--
-- El catálogo es más fino que las clases de la app (distingue castrados,
-- espayadas y destetados), por eso vive en su propia tabla y no en el check
-- de `animales.clase`. Un animal puede apuntar a su categoría exacta con
-- `animales.categoria_dse`; si no lo hace, `clase_default` da la equivalencia
-- que le toca por su clase.
--
-- Idempotente: se puede correr varias veces sin romper nada.

-- ============================================================
-- Catálogo (global, igual para todos los ranchos)
-- ============================================================

create table if not exists public.categorias_dse (
  especie text not null check (especie in ('bovino','equino','ovino','caprino','cervido','asnal','otro')),
  valor text not null,
  etiqueta text not null,
  dse numeric not null,
  sexo text check (sexo in ('H','M')),
  -- Clase de la app que cae en esta categoría cuando el animal no tiene una
  -- asignada a mano. Única por especie: es un mapeo, no una lista.
  clase_default text,
  orden integer not null default 0,
  primary key (especie, valor)
);

create unique index if not exists categorias_dse_clase_default_idx
  on public.categorias_dse (especie, clase_default)
  where clase_default is not null;

insert into public.categorias_dse (especie, valor, etiqueta, dse, sexo, clase_default, orden) values
  -- Bovinos
  ('bovino','ternero',                    'Ternero',                     1.91, 'M', 'becerro',  10),
  ('bovino','ternera',                    'Ternera',                     1.91, 'H', 'becerra',  20),
  ('bovino','ternero_novillo',            'Ternero novillo',             1.91, 'M', null,       30),
  ('bovino','ternero_toro',               'Ternero toro',                5,    'M', null,       40),
  ('bovino','destetado',                  'Destetado',                   4.39, 'M', null,       50),
  ('bovino','ternera_destetada',          'Ternera destetada',           4.39, 'H', null,       60),
  ('bovino','ternera_espayada_destetada', 'Ternera espayada destetada',  4.39, 'H', null,       70),
  ('bovino','destetado_novillo',          'Destetado novillo',           4.39, 'M', null,       80),
  ('bovino','destetado_toro',             'Destetado toro',              9.1,  'M', 'torete',   90),
  ('bovino','anial',                      'Añal',                        9.55, null, null,     100),
  ('bovino','vaquillona',                 'Vaquillona',                  9.55, 'H', 'vaquilla',110),
  ('bovino','vaquillona_espayada',        'Vaquillona espayada',         9.55, 'H', null,      120),
  ('bovino','vaca',                       'Vaca',                       12.6,  'H', 'vaca',    130),
  ('bovino','vaca_espayada',              'Vaca espayada',               9.55, 'H', null,      140),
  ('bovino','novillo',                    'Novillo',                     9.55, 'M', 'novillo', 150),
  ('bovino','toro',                       'Toro',                       19.1,  'M', 'toro',    160),
  -- Ovinos (los corderos van en 0: comen a través de la madre)
  ('ovino','cordero',                     'Cordero',                     0,    'M', 'cordero', 10),
  ('ovino','cordera',                     'Cordera',                     0,    'H', 'cordera', 20),
  ('ovino','cordero_carnero',             'Cordero carnero',             0,    'M', null,      30),
  ('ovino','cordero_capon',               'Cordero capón',               0,    'M', null,      40),
  ('ovino','destetado',                   'Destetado',                   1.1,  'M', null,      50),
  ('ovino','destetada_hembra',            'Destetada hembra',            1.1,  'H', null,      60),
  ('ovino','destetado_carnero',           'Destetado carnero',           1.1,  'M', null,      70),
  ('ovino','destetado_capon',             'Destetado capón',             1.1,  'M', null,      80),
  ('ovino','borreguillo',                 'Borreguillo',                 1,    'M', null,      90),
  ('ovino','borreguilla',                 'Borreguilla',                 1,    'H', null,     100),
  ('ovino','borreguillo_carnero',         'Borreguillo carnero',         1,    'M', null,     110),
  ('ovino','borreguillo_capon',           'Borreguillo capón',           1,    'M', null,     120),
  ('ovino','oveja_borreguilla',           'Oveja borreguilla',           1,    'H', null,     130),
  ('ovino','oveja',                       'Oveja',                       1,    'H', 'borrega',140),
  ('ovino','capon',                       'Capón',                       1,    'M', null,     150),
  ('ovino','carnero',                     'Carnero',                     3.4,  'M', 'borrego',160)
on conflict (especie, valor) do update set
  etiqueta      = excluded.etiqueta,
  dse           = excluded.dse,
  sexo          = excluded.sexo,
  clase_default = excluded.clase_default,
  orden         = excluded.orden;

alter table public.categorias_dse enable row level security;

do $$
begin
  begin
    create policy "categorias_dse lectura" on public.categorias_dse
      for select to authenticated, anon using (true);
  exception when duplicate_object then null;
  end;
end $$;

grant select on public.categorias_dse to anon, authenticated;
grant all on public.categorias_dse to service_role;

-- ============================================================
-- Categoría exacta por animal (opcional)
-- ============================================================

alter table public.animales add column if not exists categoria_dse text;

alter table public.animales drop constraint if exists animales_categoria_dse_fkey;
alter table public.animales add constraint animales_categoria_dse_fkey
  foreign key (especie, categoria_dse)
  references public.categorias_dse (especie, valor) on update cascade;

-- ============================================================
-- DSE efectivo de un animal: el de su categoría, o el de su clase
-- ============================================================

create or replace function public.dse_animal(
  p_especie text,
  p_clase text,
  p_categoria_dse text default null
)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select c.dse from public.categorias_dse c
      where c.especie = p_especie and c.valor = p_categoria_dse),
    (select c.dse from public.categorias_dse c
      where c.especie = p_especie and c.clase_default = p_clase),
    0
  );
$$;

grant execute on function public.dse_animal(text, text, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
