-- Fix 1 (funcional): crear un rancho fallaba.
--   El INSERT ... RETURNING evalúa también la política de SELECT, y en ese
--   instante el usuario todavía no es miembro del rancho recién creado.
--   Solución: función SECURITY DEFINER que crea rancho + membresía de forma
--   atómica (además evita ranchos huérfanos si fallaba el segundo insert).
--
-- Fix 2 (seguridad): la política de inserción en rancho_usuarios permitía
--   `usuario_id = auth.uid()` para CUALQUIER rancho_id, así que un usuario
--   autenticado podía auto-agregarse al rancho de otra persona y ver todos
--   sus datos. Ahora solo un miembro puede agregar miembros.

create or replace function public.crear_rancho_con_membresia(
  p_nombre text,
  p_upp text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nuevo_id uuid;
begin
  if uid is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'El nombre del rancho es obligatorio';
  end if;

  insert into public.ranchos (nombre, upp)
  values (trim(p_nombre), nullif(trim(coalesce(p_upp, '')), ''))
  returning id into nuevo_id;

  insert into public.rancho_usuarios (rancho_id, usuario_id, rol)
  values (nuevo_id, uid, 'admin');

  return nuevo_id;
end;
$$;

revoke all on function public.crear_rancho_con_membresia(text, text) from public;
grant execute on function public.crear_rancho_con_membresia(text, text) to authenticated;

-- La creación de ranchos pasa exclusivamente por la función de arriba
drop policy if exists "ranchos insert" on public.ranchos;

-- Solo miembros pueden agregar miembros (cierra la escalada de privilegios)
drop policy if exists "membresias insert propia" on public.rancho_usuarios;
create policy "membresias insert por miembro" on public.rancho_usuarios
  for insert with check (public.es_miembro(rancho_id));

notify pgrst, 'reload schema';
