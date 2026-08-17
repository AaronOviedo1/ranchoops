"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";

function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

export type RenglonVenta = {
  clase: string;
  cabezas: number;
  kilos_salida?: number | null;
  kilos_venta?: number | null;
  precio_kg?: number | null;
  precio_cabeza?: number | null;
  total: number;
};

export async function crearVenta(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let renglones: RenglonVenta[] = [];
  try {
    renglones = JSON.parse(String(formData.get("renglones") ?? "[]"));
  } catch {
    renglones = [];
  }
  renglones = renglones.filter((r) => r.clase && r.cabezas > 0);
  if (renglones.length === 0) {
    redirect(`/ventas/nueva?error=${encodeURIComponent("Agrega al menos un renglón")}`);
  }

  const fecha = campo(formData, "fecha") ?? new Date().toISOString().slice(0, 10);

  const { data: venta, error } = await supabase
    .from("ventas")
    .insert({
      rancho_id: rancho.id,
      fecha,
      comprador: campo(formData, "comprador"),
      guia: campo(formData, "guia"),
      reemo: campo(formData, "reemo"),
      division_id: campo(formData, "division_id"),
      obs: campo(formData, "obs"),
      creado_por: user?.id,
    })
    .select("id")
    .single();

  if (error || !venta) {
    redirect(`/ventas/nueva?error=${encodeURIComponent(error?.message ?? "Error")}`);
  }

  await supabase.from("venta_renglones").insert(
    renglones.map((r) => ({
      rancho_id: rancho.id,
      venta_id: venta.id,
      clase: r.clase,
      cabezas: r.cabezas,
      kilos_salida: r.kilos_salida ?? null,
      kilos_venta: r.kilos_venta ?? null,
      precio_kg: r.precio_kg ?? null,
      precio_cabeza: r.precio_cabeza ?? null,
      total: r.total,
    }))
  );

  // Animales individuales vendidos (opcional): salen del inventario activo
  const animalIds = formData.getAll("animal_id").map(String).filter(Boolean);
  if (animalIds.length > 0) {
    await supabase.from("venta_animales").insert(
      animalIds.map((animalId) => ({
        rancho_id: rancho.id,
        venta_id: venta.id,
        animal_id: animalId,
      }))
    );
    await supabase
      .from("animales")
      .update({
        status: "vendido",
        fecha_salida: fecha,
        causa_salida: "venta",
        grupo_id: null,
      })
      .in("id", animalIds)
      .eq("rancho_id", rancho.id);
  }

  revalidatePath("/ventas");
  revalidatePath("/ganado");
  redirect(`/ventas/${venta.id}`);
}

export async function eliminarVenta(id: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  // Reactiva los animales ligados antes de borrar
  const { data: ligados } = await supabase
    .from("venta_animales")
    .select("animal_id")
    .eq("venta_id", id);
  if (ligados && ligados.length > 0) {
    await supabase
      .from("animales")
      .update({ status: "activo", fecha_salida: null, causa_salida: null })
      .in("id", ligados.map((l) => l.animal_id))
      .eq("rancho_id", rancho.id);
  }

  await supabase.from("ventas").delete().eq("id", id).eq("rancho_id", rancho.id);
  revalidatePath("/ventas");
  redirect("/ventas");
}
