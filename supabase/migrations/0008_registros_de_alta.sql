-- Lo que se captura al dar de alta un animal, con su fecha.
--
-- El alta deja de ser una ficha suelta: en la misma pantalla se registra el
-- arete que se le puso, cuándo entró al grupo, de dónde y a qué potrero se
-- movió, cuánto pesó y en qué condición corporal venía. Cada bloque genera
-- su evento con la fecha en que pasó, no con la fecha de captura.
--
-- Todo se apoya en lo que ya existe: divisiones, potreros, grupos y eventos.
-- Lo único nuevo son estas columnas de identificación y la condición corporal
-- (que viaja como cualquier otro evento, en evento_animales.valores).
--
-- Idempotente: se puede correr varias veces sin romper nada.

-- ============================================================
-- Identificación
-- ============================================================

-- Qué clase de arete es el de control: visual, electrónico, de manejo o de
-- lote. El SINIIGA sigue en su propia columna, es el oficial.
alter table public.animales add column if not exists tipo_arete text;
alter table public.animales add column if not exists fecha_identificacion date;

-- La fecha en que el animal entra al conteo del rancho. Vacía significa que
-- cuenta desde que nació; se llena cuando el animal se contabiliza a partir
-- del día en que se identificó (compras, animales que ya estaban).
alter table public.animales add column if not exists fecha_en_campo date;

-- Desde cuándo está en su grupo de manejo / división.
alter table public.animales add column if not exists fecha_ingreso_grupo date;

create index if not exists animales_fecha_en_campo_idx
  on public.animales (rancho_id, fecha_en_campo)
  where fecha_en_campo is not null;

notify pgrst, 'reload schema';
