"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";

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

export async function guardarGeomPotrero(input: {
  potreroId?: string;
  nombre?: string;
  geom: GeoJSON.Feature;
  superficieHas: number;
}) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  if (input.potreroId) {
    await supabase
      .from("potreros")
      .update({ geom: input.geom, superficie_has: input.superficieHas })
      .eq("id", input.potreroId)
      .eq("rancho_id", rancho.id);
  } else {
    await supabase.from("potreros").insert({
      rancho_id: rancho.id,
      nombre: input.nombre ?? "Potrero nuevo",
      geom: input.geom,
      superficie_has: input.superficieHas,
    });
  }
  revalidatePath("/mapa");
  revalidatePath("/potreros");
}

export async function guardarPunto(input: {
  capa: "pluviometro" | "infraestructura";
  nombre: string;
  tipo?: string;
  geom: GeoJSON.Feature;
}) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  if (input.capa === "pluviometro") {
    await supabase.from("pluviometros").insert({
      rancho_id: rancho.id,
      nombre: input.nombre,
      geom: input.geom,
    });
  } else {
    await supabase.from("infraestructura").insert({
      rancho_id: rancho.id,
      nombre: input.nombre,
      tipo: input.tipo ?? "otro",
      geom: input.geom,
    });
  }
  revalidatePath("/mapa");
  revalidatePath("/lluvias");
}
