-- Roles del rancho.
--
-- "Esta información capaz no la quisieras que la vea una morra administrativa":
-- los costos y las ventas quedan solo para quien administra.
--
--   admin      → todo
--   operador   → operación y tierra; sin costos ni ventas
--   capturista → captura de trabajos y bitácora; sin dinero ni configuración
--
-- La navegación esconde lo que no toca, pero quien manda es RLS: aunque
-- alguien escriba la URL a mano, la base no le devuelve las filas.

-- Los miembros de antes eran miembros plenos: se quedan como admin.
update public.rancho_usuarios set rol = 'admin' where rol = 'miembro';

alter table public.rancho_usuarios drop constraint if exists rancho_usuarios_rol_check;
alter table public.rancho_usuarios add constraint rancho_usuarios_rol_check
  check (rol in ('admin', 'operador', 'capturista'));

alter table public.rancho_usuarios alter column rol set default 'operador';

-- Rol del usuario en un rancho (security definer para no recursar sobre RLS)
create or replace function public.rol_en(r uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.rancho_usuarios
  where rancho_id = r and usuario_id = (select auth.uid());
$$;

create or replace function public.es_admin(r uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.rol_en(r) = 'admin', false);
$$;

grant execute on function public.rol_en(uuid) to authenticated;
grant execute on function public.es_admin(uuid) to authenticated;

-- El dinero es solo de quien administra. La política uniforme que creó la
-- migración 0001 se llama "miembros todo" en todas las tablas.
do $$
declare t text;
begin
  foreach t in array array['gastos', 'ventas', 'venta_renglones', 'venta_animales']
  loop
    execute format('drop policy if exists %I on public.%I', 'miembros todo', t);
    execute format('drop policy if exists %I on public.%I', 'solo admin', t);
    execute format(
      'create policy %I on public.%I for all using (public.es_admin(rancho_id)) with check (public.es_admin(rancho_id))',
      'solo admin', t
    );
  end loop;
end $$;

-- Solo un admin puede cambiar quién entra y con qué rol.
drop policy if exists "membresias insert por miembro" on public.rancho_usuarios;
drop policy if exists "membresias insert por admin" on public.rancho_usuarios;
-- Al crear un rancho, quien lo crea se agrega vía crear_rancho_con_membresia
-- (SECURITY DEFINER), que no pasa por esta política.
create policy "membresias insert por admin" on public.rancho_usuarios
  for insert with check (public.es_admin(rancho_id));

drop policy if exists "membresias delete" on public.rancho_usuarios;
drop policy if exists "membresias delete por admin" on public.rancho_usuarios;
create policy "membresias delete por admin" on public.rancho_usuarios
  for delete using (public.es_admin(rancho_id));

do $$
begin
  begin
    create policy "membresias update por admin" on public.rancho_usuarios
      for update using (public.es_admin(rancho_id))
      with check (public.es_admin(rancho_id));
  exception when duplicate_object then null;
  end;
end $$;

-- Los datos del rancho los edita quien administra.
drop policy if exists "ranchos update" on public.ranchos;
create policy "ranchos update" on public.ranchos
  for update using (public.es_admin(id));

notify pgrst, 'reload schema';

-- Invitar a alguien ahora exige ser admin y dice con qué rol entra.
create or replace function public.agregar_miembro_por_correo(
  correo text,
  r uuid,
  p_rol text default 'operador'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if not public.es_admin(r) then
    return 'Solo quien administra el rancho puede agregar gente';
  end if;
  if p_rol not in ('admin', 'operador', 'capturista') then
    return 'Rol no válido';
  end if;

  select id into uid from auth.users where lower(email) = lower(correo) limit 1;
  if uid is null then
    return 'No existe una cuenta con ese correo; pide a la persona que se registre primero';
  end if;

  insert into public.rancho_usuarios (rancho_id, usuario_id, rol)
  values (r, uid, p_rol)
  on conflict (rancho_id, usuario_id) do update set rol = excluded.rol;
  return 'ok';
end;
$$;

-- La firma vieja (2 argumentos) ya no se usa.
drop function if exists public.agregar_miembro_por_correo(text, uuid);

revoke all on function public.agregar_miembro_por_correo(text, uuid, text) from public;
grant execute on function public.agregar_miembro_por_correo(text, uuid, text) to authenticated;

notify pgrst, 'reload schema';
