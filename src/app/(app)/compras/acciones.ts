"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { fechaHoy } from "@/lib/fechas";

function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

export type RenglonCompra = {
  clase: string;
  cabezas: number;
  kilos?: number | null;
  precio_kg?: number | null;
  precio_cabeza?: number | null;
  total: number;
};

export async function crearCompra(formData: FormData) {
  const { rancho } = await requireAdmin();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let renglones: RenglonCompra[] = [];
  try {
    renglones = JSON.parse(String(formData.get("renglones") ?? "[]"));
  } catch {
    renglones = [];
  }
  renglones = renglones.filter((r) => r.clase && r.cabezas > 0);
  if (renglones.length === 0) {
    redirect(`/compras/nueva?error=${encodeURIComponent("Agrega al menos un renglón")}`);
  }

  const fecha = campo(formData, "fecha") ?? fechaHoy();
  const proveedor = campo(formData, "proveedor");
  const divisionId = campo(formData, "division_id");

  const { data: compra, error } = await supabase
    .from("compras")
    .insert({
      rancho_id: rancho.id,
      fecha,
      proveedor,
      guia: campo(formData, "guia"),
      reemo: campo(formData, "reemo"),
      division_id: divisionId,
      obs: campo(formData, "obs"),
      creado_por: user?.id,
    })
    .select("id")
    .single();

  if (error || !compra) {
    redirect(`/compras/nueva?error=${encodeURIComponent(error?.message ?? "Error")}`);
  }

  await supabase.from("compra_renglones").insert(
    renglones.map((r) => ({
      rancho_id: rancho.id,
      compra_id: compra.id,
      clase: r.clase,
      cabezas: r.cabezas,
      kilos: r.kilos ?? null,
      precio_kg: r.precio_kg ?? null,
      precio_cabeza: r.precio_cabeza ?? null,
      total: r.total,
    }))
  );

  // El costo se carga a la división, no al grupo — y solo si la persona
  // dejó la casilla marcada: nada se registra solo.
  if (formData.get("crear_gasto") && divisionId) {
    const total = renglones.reduce((s, r) => s + Number(r.total), 0);
    const cabezas = renglones.reduce((s, r) => s + r.cabezas, 0);
    if (total > 0) {
      await supabase.from("gastos").insert({
        rancho_id: rancho.id,
        fecha,
        concepto: `Compra de ganado${proveedor ? ` — ${proveedor}` : ""}`,
        proveedor,
        monto: total,
        categoria: "Compra de ganado",
        division_id: divisionId,
        num_animales: cabezas,
        obs: `Compra ${compra.id}`,
        creado_por: user?.id,
      });
    }
  }

  revalidatePath("/compras");
  revalidatePath("/costos");
  redirect(`/compras/${compra.id}`);
}

export async function eliminarCompra(id: string) {
  const { rancho } = await requireAdmin();
  const supabase = await createClient();
  await supabase.from("compras").delete().eq("id", id).eq("rancho_id", rancho.id);
  revalidatePath("/compras");
  redirect("/compras");
}
