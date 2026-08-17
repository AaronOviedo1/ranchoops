"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";

function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

export async function actualizarRancho(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  await supabase
    .from("ranchos")
    .update({
      nombre: campo(formData, "nombre") ?? rancho.nombre,
      upp: campo(formData, "upp"),
      unidad_lluvia: campo(formData, "unidad_lluvia") === "mm" ? "mm" : "in",
      meta_dias_descanso: campo(formData, "meta_dias_descanso")
        ? Number(campo(formData, "meta_dias_descanso"))
        : rancho.meta_dias_descanso,
    })
    .eq("id", rancho.id);

  revalidatePath("/", "layout");
  redirect("/configuracion?ok=1");
}

export async function crearDivision(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const nombre = campo(formData, "nombre");
  if (!nombre) redirect("/configuracion");
  await supabase.from("divisiones").insert({ rancho_id: rancho.id, nombre });
  revalidatePath("/configuracion");
  redirect("/configuracion");
}

export async function alternarDivision(id: string, activo: boolean) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  await supabase
    .from("divisiones")
    .update({ activo })
    .eq("id", id)
    .eq("rancho_id", rancho.id);
  revalidatePath("/configuracion");
}

export async function invitarMiembro(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const correo = campo(formData, "correo");
  if (!correo) redirect("/configuracion");

  const { data, error } = await supabase.rpc("agregar_miembro_por_correo", {
    correo,
    r: rancho.id,
  });
  const mensaje = error ? error.message : String(data);
  revalidatePath("/configuracion");
  redirect(
    mensaje === "ok"
      ? "/configuracion?ok=1"
      : `/configuracion?error=${encodeURIComponent(mensaje)}`
  );
}
