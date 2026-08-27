-- Carga animal en UA (unidad animal mexicana).
--
-- En Sonora el agostadero se habla en UA: una vaca adulta de ~450 kg con su
-- cría al pie. Por eso la cría vale 0 UA (come a través de la madre) y el
-- coeficiente se expresa en "hectáreas por UA", como lo publica COTECOCA.
--
-- El DSE australiano de la migración 0006 se queda para el export y la
-- compatibilidad; la interfaz enseña UA y cabezas. Los valores viven en la
-- tabla para poderse afinar por SQL sin tocar código (con su espejo en
-- src/lib/dse.ts, como el resto del catálogo).
--
-- Idempotente: se puede correr varias veces sin romper nada.

-- ============================================================
-- UA por categoría
-- ============================================================

alter table public.categorias_dse add column if not exists ua numeric not null default 0;

update public.categorias_dse set ua = v.ua from (values
  -- Bovinos (equivalencias tipo COTECOCA; la cría al pie va con la madre)
  ('bovino','ternero',                    0),
  ('bovino','ternera',                    0),
  ('bovino','ternero_novillo',            0),
  ('bovino','ternero_toro',               0.3),
  ('bovino','destetado',                  0.6),
  ('bovino','ternera_destetada',          0.6),
  ('bovino','ternera_espayada_destetada', 0.6),
  ('bovino','destetado_novillo',          0.6),
  ('bovino','destetado_toro',             0.7),
  ('bovino','anial',                      0.7),
  ('bovino','vaquillona',                 0.7),
  ('bovino','vaquillona_espayada',        0.7),
  ('bovino','vaca',                       1.0),
  ('bovino','vaca_espayada',              1.0),
  ('bovino','novillo',                    0.7),
  ('bovino','toro',                       1.25),
  -- Ovinos (~5 borregas por UA)
  ('ovino','cordero',                     0),
  ('ovino','cordera',                     0),
  ('ovino','cordero_carnero',             0),
  ('ovino','cordero_capon',               0),
  ('ovino','destetado',                   0.15),
  ('ovino','destetada_hembra',            0.15),
  ('ovino','destetado_carnero',           0.15),
  ('ovino','destetado_capon',             0.15),
  ('ovino','borreguillo',                 0.2),
  ('ovino','borreguilla',                 0.2),
  ('ovino','borreguillo_carnero',         0.2),
  ('ovino','borreguillo_capon',           0.2),
  ('ovino','oveja_borreguilla',           0.2),
  ('ovino','oveja',                       0.2),
  ('ovino','capon',                       0.2),
  ('ovino','carnero',                     0.25)
) as v(especie, valor, ua)
where categorias_dse.especie = v.especie and categorias_dse.valor = v.valor;

-- ============================================================
-- UA efectiva de un animal (espejo de dse_animal)
-- ============================================================

create or replace function public.ua_animal(
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
    (select c.ua from public.categorias_dse c
      where c.especie = p_especie and c.valor = p_categoria_dse),
    (select c.ua from public.categorias_dse c
      where c.especie = p_especie and c.clase_default = p_clase),
    0
  );
$$;

grant execute on function public.ua_animal(text, text, text) to anon, authenticated, service_role;

-- ============================================================
-- Carga actual de cada potrero (por los grupos parados en él)
-- ============================================================

create or replace view public.v_potrero_carga with (security_invoker = true) as
select
  p.id as potrero_id,
  p.rancho_id,
  count(a.id)::int as cabezas,
  round(coalesce(sum(public.ua_animal(a.especie, a.clase, a.categoria_dse)), 0), 2) as ua,
  case when coalesce(p.superficie_has, 0) > 0
    then round(coalesce(sum(public.ua_animal(a.especie, a.clase, a.categoria_dse)), 0) / p.superficie_has, 3)
  end as ua_por_ha,
  case when coalesce(p.capacidad_estimada, 0) > 0
    then round(100.0 * count(a.id) / p.capacidad_estimada)::int
  end as pct_capacidad
from public.potreros p
left join public.grupos g on g.potrero_actual_id = p.id and g.activo
left join public.animales a on a.grupo_id = g.id and a.status = 'activo'
where p.activo
group by p.id;

grant select on public.v_potrero_carga to anon, authenticated, service_role;

-- ============================================================
-- Historia de pastoreo por potrero y mes (para cruzar con la lluvia)
-- ============================================================

create or replace view public.v_pastoreo_mensual with (security_invoker = true) as
select
  gm.rancho_id,
  gm.potrero_id,
  gm.grupo_id,
  date_trunc('month', d.dia)::date as mes,
  count(*)::int as dias_ocupado,
  sum(coalesce(gm.num_animales_entrada, 0))::numeric as cabezas_dia
from public.grupo_movimientos gm
cross join lateral generate_series(
  gm.fecha_entrada::timestamp,
  least(coalesce(gm.fecha_salida, current_date), current_date)::timestamp,
  interval '1 day'
) as d(dia)
group by gm.rancho_id, gm.potrero_id, gm.grupo_id, date_trunc('month', d.dia);

grant select on public.v_pastoreo_mensual to anon, authenticated, service_role;

notify pgrst, 'reload schema';
