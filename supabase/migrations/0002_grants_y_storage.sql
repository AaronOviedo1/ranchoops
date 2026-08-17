-- Fix: permisos de PostgREST para los roles de Supabase y políticas de Storage.
-- Necesario cuando la migración 0001 se corrió sin los default privileges de
-- Supabase (síntoma: "Could not find the table ... in the schema cache" para
-- usuarios normales, aunque el service role sí ve las tablas).

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- Bucket (por si no existe; también se puede crear desde el dashboard)
insert into storage.buckets (id, name, public)
values ('ranchops', 'ranchops', false)
on conflict (id) do nothing;

-- Políticas de storage (ignora el error si ya existen)
do $$
begin
  begin
    create policy "archivos de miembros select" on storage.objects
      for select using (
        bucket_id = 'ranchops'
        and public.es_miembro(((storage.foldername(name))[1])::uuid)
      );
  exception when duplicate_object then null;
  end;
  begin
    create policy "archivos de miembros insert" on storage.objects
      for insert with check (
        bucket_id = 'ranchops'
        and public.es_miembro(((storage.foldername(name))[1])::uuid)
      );
  exception when duplicate_object then null;
  end;
  begin
    create policy "archivos de miembros delete" on storage.objects
      for delete using (
        bucket_id = 'ranchops'
        and public.es_miembro(((storage.foldername(name))[1])::uuid)
      );
  exception when duplicate_object then null;
  end;
end $$;

-- Recarga el esquema de PostgREST
notify pgrst, 'reload schema';
