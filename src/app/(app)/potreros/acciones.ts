"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { fechaHoy } from "@/lib/fechas";

function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

function datosPotrero(formData: FormData) {
  return {
    nombre: campo(formData, "nombre"),
    superficie_has: campo(formData, "superficie_has")
      ? Number(campo(formData, "superficie_has"))
      : null,
    tipo_vegetacion: campo(formData, "tipo_vegetacion"),
    capacidad_estimada: campo(formData, "capacidad_estimada")
      ? Number(campo(formData, "capacidad_estimada"))
      : null,
    notas: campo(formData, "notas"),
  };
}

export async function crearPotrero(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const datos = datosPotrero(formData);
  if (!datos.nombre) redirect("/potreros");

  const { error } = await supabase
    .from("potreros")
    .insert({ rancho_id: rancho.id, ...datos });
  if (error) redirect(`/potreros?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/potreros");
  redirect("/potreros");
}

export async function actualizarPotrero(id: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  await supabase
    .from("potreros")
    .update(datosPotrero(formData))
    .eq("id", id)
    .eq("rancho_id", rancho.id);
  revalidatePath("/potreros");
  revalidatePath(`/potreros/${id}`);
  redirect(`/potreros/${id}`);
}

export async function desactivarPotrero(id: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  await supabase
    .from("potreros")
    .update({ activo: false })
    .eq("id", id)
    .eq("rancho_id", rancho.id);
  revalidatePath("/potreros");
  redirect("/potreros");
}

// ---- Acciones llamadas desde el mapa (JSON, no formularios) ----

/**
 * Las acciones del mapa no redirigen: el mapa se queda donde está. Devuelven
 * el error de la base para que el formulario lo enseñe en vez de fingir que
 * guardó y dejar al usuario dibujando lo mismo tres veces.
 */
type Resultado = { error?: string };

export async function guardarGeomPotrero(input: {
  potreroId?: string;
  nombre?: string;
  geom: GeoJSON.Feature;
  superficieHas: number;
}): Promise<Resultado> {
  const rancho = await requireRancho();
  const supabase = await createClient();

  if (input.potreroId) {
    const { error } = await supabase
      .from("potreros")
      .update({ geom: input.geom, superficie_has: input.superficieHas })
      .eq("id", input.potreroId)
      .eq("rancho_id", rancho.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("potreros").insert({
      rancho_id: rancho.id,
      nombre: input.nombre ?? "Potrero nuevo",
      geom: input.geom,
      superficie_has: input.superficieHas,
    });
    if (error) return { error: error.message };
  }
  revalidatePath("/mapa");
  revalidatePath("/potreros");
  return {};
}

export async function guardarPunto(input: {
  capa: "pluviometro" | "infraestructura";
  nombre: string;
  tipo?: string;
  geom: GeoJSON.Feature;
}): Promise<Resultado> {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { error } =
    input.capa === "pluviometro"
      ? await supabase.from("pluviometros").insert({
          rancho_id: rancho.id,
          nombre: input.nombre,
          geom: input.geom,
        })
      : await supabase.from("infraestructura").insert({
          rancho_id: rancho.id,
          nombre: input.nombre,
          tipo: input.tipo ?? "otro",
          geom: input.geom,
        });
  if (error) return { error: error.message };

  revalidatePath("/mapa");
  revalidatePath("/lluvias");
  return {};
}

/** Geometría de infraestructura: punto, línea (tubería, cercos) o área. */
export async function guardarGeometria(input: {
  tipo: string;
  nombre: string;
  geom: GeoJSON.Feature;
  capacidad?: number | null;
  notas?: string | null;
}): Promise<Resultado> {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { error } = await supabase.from("infraestructura").insert({
    rancho_id: rancho.id,
    nombre: input.nombre,
    tipo: input.tipo,
    geom: input.geom,
    capacidad: input.capacidad ?? null,
    notas: input.notas ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/mapa");
  return {};
}

/**
 * Quita del mapa algo que se marcó ahí mismo.
 *
 * La infraestructura solo existe como marca, así que se borra. El pluviómetro
 * no: sus lluvias cuelgan de él y un borrado se llevaría el historial de
 * milímetros por delante, así que se desactiva y desaparece del mapa.
 */
export async function borrarMarcaMapa(input: {
  id: string;
  capa: "infraestructura" | "pluviometro";
}): Promise<Resultado> {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { error } =
    input.capa === "pluviometro"
      ? await supabase
          .from("pluviometros")
          .update({ activo: false })
          .eq("id", input.id)
          .eq("rancho_id", rancho.id)
      : await supabase
          .from("infraestructura")
          .delete()
          .eq("id", input.id)
          .eq("rancho_id", rancho.id);
  if (error) return { error: error.message };

  revalidatePath("/mapa");
  revalidatePath("/lluvias");
  return {};
}

/**
 * Borra el trazo de un potrero, no el potrero: el nombre, el historial de
 * ocupaciones y los animales siguen ahí, listos para volver a dibujarlo o
 * traerlo de un KMZ.
 */
export async function quitarTrazoPotrero(id: string): Promise<Resultado> {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { error } = await supabase
    .from("potreros")
    .update({ geom: null })
    .eq("id", id)
    .eq("rancho_id", rancho.id);
  if (error) return { error: error.message };

  revalidatePath("/mapa");
  revalidatePath("/potreros");
  revalidatePath(`/potreros/${id}`);
  return {};
}

/**
 * Trae los polígonos de un KMZ/KML que el rancho ya tenía trazados.
 *
 * "Buscas las coordenadas en Google, lo sacas, y ese es un KMZ con las
 * coordenadas ya trazadas": esto evita volver a dibujar el rancho entero.
 */
export async function importarGeometrias(
  entradas: {
    destino: "potrero_nuevo" | "potrero_existente" | "infraestructura";
    potreroId?: string;
    nombre: string;
    tipo?: string;
    geom: GeoJSON.Feature;
    superficieHas?: number | null;
  }[]
): Promise<{ potreros: number; areas: number }> {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const nuevos = entradas.filter((e) => e.destino === "potrero_nuevo");
  const existentes = entradas.filter((e) => e.destino === "potrero_existente");
  const infra = entradas.filter((e) => e.destino === "infraestructura");

  if (nuevos.length > 0) {
    await supabase.from("potreros").insert(
      nuevos.map((e) => ({
        rancho_id: rancho.id,
        nombre: e.nombre,
        geom: e.geom,
        superficie_has: e.superficieHas ?? null,
      }))
    );
  }

  // Uno por uno: cada polígono va a un potrero distinto.
  for (const e of existentes) {
    if (!e.potreroId) continue;
    await supabase
      .from("potreros")
      .update({ geom: e.geom, superficie_has: e.superficieHas ?? null })
      .eq("id", e.potreroId)
      .eq("rancho_id", rancho.id);
  }

  if (infra.length > 0) {
    await supabase.from("infraestructura").insert(
      infra.map((e) => ({
        rancho_id: rancho.id,
        nombre: e.nombre,
        tipo: e.tipo ?? "otro",
        geom: e.geom,
      }))
    );
  }

  revalidatePath("/mapa");
  revalidatePath("/potreros");
  return { potreros: nuevos.length + existentes.length, areas: infra.length };
}

/**
 * Mueve un grupo al potrero en el que se hizo clic, cerrando la ocupación
 * anterior. Es el mismo movimiento de `/grupos/[id]`, pero desde el mapa.
 */
export async function moverGrupoDesdeMapa(input: {
  grupoId: string;
  potreroId: string;
}) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hoy = fechaHoy();

  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, potrero_actual_id")
    .eq("id", input.grupoId)
    .eq("rancho_id", rancho.id)
    .single();
  if (!grupo) return;

  const { count } = await supabase
    .from("animales")
    .select("id", { count: "exact", head: true })
    .eq("grupo_id", input.grupoId)
    .eq("status", "activo");

  if (grupo.potrero_actual_id) {
    await supabase
      .from("grupo_movimientos")
      .update({ fecha_salida: hoy, num_animales_salida: count ?? null })
      .eq("grupo_id", input.grupoId)
      .is("fecha_salida", null);
  }

  await supabase.from("grupo_movimientos").insert({
    rancho_id: rancho.id,
    grupo_id: input.grupoId,
    potrero_id: input.potreroId,
    fecha_entrada: hoy,
    num_animales_entrada: count ?? null,
  });

  await supabase
    .from("grupos")
    .update({ potrero_actual_id: input.potreroId })
    .eq("id", input.grupoId)
    .eq("rancho_id", rancho.id);

  await supabase.from("eventos").insert({
    rancho_id: rancho.id,
    tipo: "movimiento_potrero",
    fecha: hoy,
    grupo_id: input.grupoId,
    potrero_id: input.potreroId,
    resultado: `${count ?? 0} animales`,
    creado_por: user?.id,
  });

  revalidatePath("/mapa");
  revalidatePath("/potreros");
  revalidatePath("/grupos");
}
