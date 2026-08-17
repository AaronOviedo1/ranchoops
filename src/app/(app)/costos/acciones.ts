"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";

function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

export async function crearGasto(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const concepto = campo(formData, "concepto");
  const monto = Number(campo(formData, "monto") ?? 0);
  if (!concepto || !(monto > 0)) redirect("/costos");

  // Comprobante opcional (foto o PDF)
  let comprobanteUrl: string | null = null;
  const archivo = formData.get("comprobante");
  if (archivo instanceof File && archivo.size > 0) {
    const extension = archivo.name.split(".").pop() ?? "jpg";
    const ruta = `${rancho.id}/gastos/${crypto.randomUUID()}.${extension}`;
    const { error: errorSubida } = await supabase.storage
      .from("ranchops")
      .upload(ruta, archivo, { contentType: archivo.type });
    if (!errorSubida) comprobanteUrl = ruta;
  }

  const { error } = await supabase.from("gastos").insert({
    rancho_id: rancho.id,
    fecha: campo(formData, "fecha") ?? new Date().toISOString().slice(0, 10),
    concepto,
    proveedor: campo(formData, "proveedor"),
    monto,
    categoria: campo(formData, "categoria") ?? "Otros",
    division_id: campo(formData, "division_id"),
    grupo_id: campo(formData, "grupo_id"),
    num_animales: campo(formData, "num_animales")
      ? Number(campo(formData, "num_animales"))
      : null,
    comprobante_url: comprobanteUrl,
    obs: campo(formData, "obs"),
    creado_por: user?.id,
  });

  if (error) redirect(`/costos?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/costos");
  redirect("/costos");
}

export async function eliminarGasto(id: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  await supabase.from("gastos").delete().eq("id", id).eq("rancho_id", rancho.id);
  revalidatePath("/costos");
}
