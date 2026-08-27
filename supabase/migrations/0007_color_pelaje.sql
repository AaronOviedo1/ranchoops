-- Color de pelaje.
--
-- Solo aplica a bovinos y equinos: es como se identifica al animal a ojo
-- ("la colorada", "el tordillo") cuando el arete no se alcanza a leer.
--
-- Texto libre con catálogo en la app (src/lib/catalogos.ts), igual que la
-- raza: sin check, para que una importación con un color de fuera no truene.
--
-- Idempotente: se puede correr varias veces sin romper nada.

alter table public.animales add column if not exists color_pelaje text;

notify pgrst, 'reload schema';
