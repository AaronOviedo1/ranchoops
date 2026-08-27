import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// El bucket `ranchops` es privado: lo que se guarda en la base es la ruta
// (`{rancho_id}/animales/{uuid}.jpg`) y se firma al mostrarla.

const VIGENCIA = 60 * 60; // 1 hora

export async function urlFirmada(
  supabase: SupabaseClient,
  ruta: string | null | undefined
): Promise<string | null> {
  if (!ruta) return null;
  const { data } = await supabase.storage.from("ranchops").createSignedUrl(ruta, VIGENCIA);
  return data?.signedUrl ?? null;
}

/** Firma varias rutas de una sola llamada. Devuelve un mapa ruta → URL. */
export async function urlsFirmadas(
  supabase: SupabaseClient,
  rutas: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const limpias = [...new Set(rutas.filter((r): r is string => !!r))];
  if (limpias.length === 0) return new Map();

  const { data } = await supabase.storage
    .from("ranchops")
    .createSignedUrls(limpias, VIGENCIA);

  return new Map(
    (data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl]] : []))
  );
}

export async function borrarArchivo(
  supabase: SupabaseClient,
  ruta: string | null | undefined
): Promise<void> {
  if (!ruta) return;
  await supabase.storage.from("ranchops").remove([ruta]);
}
