"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";

export async function crearPluviometro(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) redirect("/lluvias");
  await supabase.from("pluviometros").insert({ rancho_id: rancho.id, nombre });
  revalidatePath("/lluvias");
  redirect("/lluvias");
}

/** Registra un evento de lluvia: una fecha con la lectura de cada pluviómetro. */
export async function registrarLluvia(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const fecha = String(formData.get("fecha") ?? "").trim();
  if (!fecha) redirect("/lluvias");

  const filas: {
    rancho_id: string;
    pluviometro_id: string;
    fecha: string;
    cantidad: number;
    obs: string | null;
  }[] = [];

  const obs = String(formData.get("obs") ?? "").trim() || null;

  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("lectura_")) continue;
    const texto = String(valor).trim();
    if (texto === "") continue;
    const cantidad = Number(texto);
    if (!Number.isFinite(cantidad)) continue;
    filas.push({
      rancho_id: rancho.id,
      pluviometro_id: clave.slice("lectura_".length),
      fecha,
      cantidad,
      obs,
    });
  }

  if (filas.length > 0) {
    await supabase
      .from("lluvias")
      .upsert(filas, { onConflict: "pluviometro_id,fecha" });
  }

  revalidatePath("/lluvias");
  redirect(`/lluvias?ok=${filas.length}`);
}
