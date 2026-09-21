-- Borrar un potrero: de veras si nunca se usó, archivado si ya tiene historia.
--
-- `potreros.activo` existe desde 0001, pero nunca hubo botón para bajarlo: los
-- potreros que se dibujaban de más en el mapa se quedaban para siempre.
--
-- Por qué no basta con un `delete`: `grupo_movimientos.potrero_id` es
-- ON DELETE CASCADE (0001), así que borrar el potrero se llevaría por delante
-- las entradas y salidas de los grupos, que son las cabezas-día de las que sale
-- la carga animal (v_potrero_carga). El borrado real solo se permite cuando no
-- queda ni una fila colgando; si hay historial, se archiva. Esa decisión vive
-- en la server action `eliminarPotrero`, no en la base: aquí solo se ponen los
-- índices para que contar las dependencias sea barato.
--
-- Idempotente: se puede correr varias veces sin romper nada.

create index if not exists grupo_movimientos_potrero_idx
  on public.grupo_movimientos (potrero_id, fecha_entrada desc);

create index if not exists gastos_potrero_idx
  on public.gastos (potrero_id) where potrero_id is not null;

create index if not exists tareas_potrero_idx
  on public.tareas (potrero_id) where potrero_id is not null;

notify pgrst, 'reload schema';
