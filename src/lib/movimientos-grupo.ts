import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Pasa animales a otro grupo y deja el registro `cambio_grupo` en su
 * historial. Con `sesionId` el cambio queda como parte de la jornada de manga
 * en la que se apartaron.
 */
export async function moverAGrupo(
  supabase: SupabaseClient,
  o: {
    ranchoId: string;
    animalIds: string[];
    grupoId: string | null;
    fecha: string;
    usuarioId?: string | null;
    sesionId?: string | null;
  }
): Promise<{ error: string | null }> {
  if (o.animalIds.length === 0) return { error: null };

  const { error } = await supabase
    .from("animales")
    .update({ grupo_id: o.grupoId })
    .in("id", o.animalIds)
    .eq("rancho_id", o.ranchoId);
  if (error) return { error: error.message };

  const { data: evento } = await supabase
    .from("eventos")
    .insert({
      rancho_id: o.ranchoId,
      tipo: "cambio_grupo",
      fecha: o.fecha,
      grupo_id: o.grupoId,
      resultado: `${o.animalIds.length} animales`,
      sesion_id: o.sesionId ?? null,
      creado_por: o.usuarioId ?? null,
    })
    .select("id")
    .single();

  if (evento) {
    await supabase.from("evento_animales").insert(
      o.animalIds.map((animal_id) => ({
        rancho_id: o.ranchoId,
        evento_id: evento.id,
        animal_id,
      }))
    );
  }
  return { error: null };
}
