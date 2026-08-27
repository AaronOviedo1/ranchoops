"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";

function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

export async function crearTarea(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nombre = campo(formData, "nombre");
  if (!nombre) redirect("/agenda/tareas");

  const { error } = await supabase.from("tareas").insert({
    rancho_id: rancho.id,
    nombre,
    descripcion: campo(formData, "descripcion"),
    prioridad: campo(formData, "prioridad") ?? "media",
    categoria: campo(formData, "categoria") ?? "General",
    fecha_inicio: campo(formData, "fecha_inicio"),
    fecha_vence: campo(formData, "fecha_vence"),
    responsable_id: campo(formData, "responsable_id"),
    potrero_id: campo(formData, "potrero_id"),
    grupo_id: campo(formData, "grupo_id"),
    creado_por: user?.id,
  });

  if (error) {
    redirect(`/agenda/tareas?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/agenda");
  revalidatePath("/agenda/tareas");
  redirect("/agenda/tareas");
}

export async function editarTarea(id: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const nombre = campo(formData, "nombre");
  if (!nombre) redirect("/agenda/tareas");

  const { error } = await supabase
    .from("tareas")
    .update({
      nombre,
      descripcion: campo(formData, "descripcion"),
      prioridad: campo(formData, "prioridad") ?? "media",
      categoria: campo(formData, "categoria") ?? "General",
      fecha_inicio: campo(formData, "fecha_inicio"),
      fecha_vence: campo(formData, "fecha_vence"),
      responsable_id: campo(formData, "responsable_id"),
      potrero_id: campo(formData, "potrero_id"),
      grupo_id: campo(formData, "grupo_id"),
      estado: campo(formData, "estado") ?? "pendiente",
    })
    .eq("id", id)
    .eq("rancho_id", rancho.id);

  if (error) {
    redirect(`/agenda/tareas?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/agenda");
  revalidatePath("/agenda/tareas");
  redirect("/agenda/tareas");
}

/** Un click y ya: la tarea se marca hecha, sin diálogos de por medio. */
export async function completarTarea(id: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("tareas")
    .update({ estado: "hecha", hecha_at: new Date().toISOString(), hecha_por: user?.id })
    .eq("id", id)
    .eq("rancho_id", rancho.id);

  revalidatePath("/agenda");
  revalidatePath("/agenda/tareas");
}

/** Duplica la tarea sin fechas: para lo que se repite cada temporada. */
export async function copiarTarea(id: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: original } = await supabase
    .from("tareas")
    .select("nombre, descripcion, prioridad, categoria, responsable_id, potrero_id, grupo_id")
    .eq("id", id)
    .eq("rancho_id", rancho.id)
    .single();
  if (!original) return;

  await supabase.from("tareas").insert({
    ...original,
    rancho_id: rancho.id,
    creado_por: user?.id,
  });

  revalidatePath("/agenda/tareas");
}

export async function eliminarTarea(id: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  await supabase.from("tareas").delete().eq("id", id).eq("rancho_id", rancho.id);
  revalidatePath("/agenda");
  revalidatePath("/agenda/tareas");
}
