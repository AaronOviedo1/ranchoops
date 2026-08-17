"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";

function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

export async function crearGrupo(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const nombre = campo(formData, "nombre");
  if (!nombre) redirect("/grupos");

  const { data, error } = await supabase
    .from("grupos")
    .insert({
      rancho_id: rancho.id,
      nombre,
      division_id: campo(formData, "division_id"),
      notas: campo(formData, "notas"),
    })
    .select("id")
    .single();

  if (error) redirect(`/grupos?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/grupos");
  redirect(`/grupos/${data.id}`);
}

export async function archivarGrupo(grupoId: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  await supabase
    .from("animales")
    .update({ grupo_id: null })
    .eq("grupo_id", grupoId)
    .eq("rancho_id", rancho.id);
  await supabase
    .from("grupos")
    .update({ activo: false })
    .eq("id", grupoId)
    .eq("rancho_id", rancho.id);
  revalidatePath("/grupos");
  redirect("/grupos");
}

/** Asigna animales al grupo y deja constancia en su historial. */
export async function asignarAnimales(grupoId: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ids = formData.getAll("animal_id").map(String).filter(Boolean);
  if (ids.length === 0) redirect(`/grupos/${grupoId}`);

  await supabase
    .from("animales")
    .update({ grupo_id: grupoId })
    .in("id", ids)
    .eq("rancho_id", rancho.id);

  const { data: evento } = await supabase
    .from("eventos")
    .insert({
      rancho_id: rancho.id,
      tipo: "cambio_grupo",
      fecha: new Date().toISOString().slice(0, 10),
      grupo_id: grupoId,
      resultado: "entrada al grupo",
      creado_por: user?.id,
    })
    .select("id")
    .single();
  if (evento) {
    await supabase.from("evento_animales").insert(
      ids.map((animalId) => ({
        rancho_id: rancho.id,
        evento_id: evento.id,
        animal_id: animalId,
        valores: { resultado: "entrada al grupo" },
      }))
    );
  }

  revalidatePath(`/grupos/${grupoId}`);
  revalidatePath("/ganado");
  redirect(`/grupos/${grupoId}`);
}

export async function quitarAnimal(grupoId: string, animalId: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  await supabase
    .from("animales")
    .update({ grupo_id: null })
    .eq("id", animalId)
    .eq("rancho_id", rancho.id);
  revalidatePath(`/grupos/${grupoId}`);
}

/**
 * Mueve el grupo a otro potrero: cierra la ocupación abierta (con buñiga/residuo)
 * y abre la nueva. Con potrero destino vacío, solo registra la salida.
 */
export async function moverAPotrero(grupoId: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const potreroDestino = campo(formData, "potrero_id");
  const fecha = campo(formData, "fecha") ?? new Date().toISOString().slice(0, 10);
  const numAnimales = campo(formData, "num_animales");
  const califBuniga = campo(formData, "calif_buniga");
  const residuo = campo(formData, "residuo");
  const obs = campo(formData, "obs");

  // Cierra la ocupación abierta del grupo
  const { data: abierta } = await supabase
    .from("grupo_movimientos")
    .select("id, potrero_id")
    .eq("grupo_id", grupoId)
    .eq("rancho_id", rancho.id)
    .is("fecha_salida", null)
    .order("fecha_entrada", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (abierta) {
    await supabase
      .from("grupo_movimientos")
      .update({
        fecha_salida: fecha,
        num_animales_salida: numAnimales ? Number(numAnimales) : null,
        calif_buniga: califBuniga ? Number(califBuniga) : null,
        residuo,
        obs,
      })
      .eq("id", abierta.id);
  }

  if (potreroDestino) {
    await supabase.from("grupo_movimientos").insert({
      rancho_id: rancho.id,
      grupo_id: grupoId,
      potrero_id: potreroDestino,
      fecha_entrada: fecha,
      num_animales_entrada: numAnimales ? Number(numAnimales) : null,
    });
  }

  await supabase
    .from("grupos")
    .update({ potrero_actual_id: potreroDestino })
    .eq("id", grupoId)
    .eq("rancho_id", rancho.id);

  await supabase.from("eventos").insert({
    rancho_id: rancho.id,
    tipo: "movimiento_potrero",
    fecha,
    grupo_id: grupoId,
    potrero_id: potreroDestino,
    resultado: potreroDestino ? "cambio de potrero" : "salida de potrero",
    obs,
    creado_por: user?.id,
  });

  revalidatePath(`/grupos/${grupoId}`);
  revalidatePath("/potreros");
  revalidatePath("/mapa");
  redirect(`/grupos/${grupoId}`);
}
