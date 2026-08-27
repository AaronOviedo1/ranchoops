"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { fechaHoy } from "@/lib/fechas";
import { campo } from "@/lib/formulario";

/** Nota rápida de bitácora (diario del rancho). */
export async function registrarNota(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const obs = campo(formData, "obs");
  if (!obs) redirect("/bitacora");

  await supabase.from("eventos").insert({
    rancho_id: rancho.id,
    tipo: "nota_bitacora",
    fecha: campo(formData, "fecha") ?? fechaHoy(),
    grupo_id: campo(formData, "grupo_id"),
    obs,
    creado_por: user?.id,
  });

  revalidatePath("/bitacora");
  redirect("/bitacora");
}
