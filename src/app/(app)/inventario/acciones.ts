"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";

function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

export async function crearProducto(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const nombre = campo(formData, "nombre");
  if (!nombre) redirect("/inventario");

  const { error } = await supabase.from("productos").insert({
    rancho_id: rancho.id,
    nombre,
    tipo: campo(formData, "tipo") ?? "otro",
    unidad: campo(formData, "unidad") ?? "saco",
    contenido_kg: campo(formData, "contenido_kg") ? Number(campo(formData, "contenido_kg")) : null,
    costo_unitario: campo(formData, "costo_unitario") ? Number(campo(formData, "costo_unitario")) : null,
    stock_minimo: campo(formData, "stock_minimo") ? Number(campo(formData, "stock_minimo")) : null,
    proveedor: campo(formData, "proveedor"),
  });
  if (error) redirect(`/inventario?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/inventario");
  redirect("/inventario");
}

/** Entrada de inventario (compra); opcionalmente registra también el gasto. */
export async function registrarEntrada(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const productoId = campo(formData, "producto_id");
  const cantidad = Number(campo(formData, "cantidad") ?? 0);
  if (!productoId || !(cantidad > 0)) redirect("/inventario");

  const fecha = campo(formData, "fecha") ?? new Date().toISOString().slice(0, 10);
  const costoUnitario = campo(formData, "costo_unitario")
    ? Number(campo(formData, "costo_unitario"))
    : null;
  const costoTotal = costoUnitario != null ? costoUnitario * cantidad : null;
  const proveedor = campo(formData, "proveedor");

  const { data: producto } = await supabase
    .from("productos")
    .select("nombre, tipo")
    .eq("id", productoId)
    .single();

  await supabase.from("inventario_movimientos").insert({
    rancho_id: rancho.id,
    producto_id: productoId,
    tipo: "entrada",
    cantidad,
    costo_unitario: costoUnitario,
    costo_total: costoTotal,
    fecha,
    proveedor,
    obs: campo(formData, "obs"),
  });

  // Actualiza el costo unitario de referencia del producto
  if (costoUnitario != null) {
    await supabase
      .from("productos")
      .update({ costo_unitario: costoUnitario })
      .eq("id", productoId);
  }

  if (formData.get("crear_gasto") === "on" && costoTotal != null) {
    const categoria =
      producto?.tipo === "alimento" || producto?.tipo === "suplemento"
        ? "Alimento"
        : producto?.tipo === "mineral"
          ? "Minerales"
          : producto?.tipo === "vacuna"
            ? "Vacunas"
            : producto?.tipo === "semen"
              ? "Semen"
              : producto?.tipo === "combustible"
                ? "Combustible"
                : "Medicamentos";
    await supabase.from("gastos").insert({
      rancho_id: rancho.id,
      fecha,
      concepto: `Compra: ${producto?.nombre ?? "insumo"} (${cantidad})`,
      proveedor,
      monto: costoTotal,
      categoria,
      creado_por: user?.id,
    });
    revalidatePath("/costos");
  }

  revalidatePath("/inventario");
  redirect("/inventario");
}

export async function ajustarInventario(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const productoId = campo(formData, "producto_id");
  const cantidad = Number(campo(formData, "cantidad") ?? 0);
  if (!productoId || !Number.isFinite(cantidad)) redirect("/inventario");

  await supabase.from("inventario_movimientos").insert({
    rancho_id: rancho.id,
    producto_id: productoId,
    tipo: "ajuste",
    cantidad,
    fecha: new Date().toISOString().slice(0, 10),
    obs: campo(formData, "obs") ?? "Ajuste manual",
  });
  revalidatePath("/inventario");
  redirect("/inventario");
}
