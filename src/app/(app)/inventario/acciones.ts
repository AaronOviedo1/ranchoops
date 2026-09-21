"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { fechaHoy } from "@/lib/fechas";
import { bandera, campo, numero } from "@/lib/formulario";
import { CATEGORIA_GASTO_POR_TIPO, categoriaInventario } from "@/lib/catalogos";
import { revalidarInventario } from "./revalidar";

/**
 * A dónde se regresa: a la pestaña desde la que se abrió el diálogo. El slug
 * se valida contra el catálogo; nunca se redirige a un texto libre del form.
 */
function destino(formData: FormData): string {
  const categoria = categoriaInventario(campo(formData, "categoria"));
  return categoria ? `/inventario/${categoria.slug}` : "/inventario";
}

export async function crearProducto(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const volverA = destino(formData);

  const nombre = campo(formData, "nombre");
  if (!nombre) redirect(volverA);

  const { error } = await supabase.from("productos").insert({
    rancho_id: rancho.id,
    nombre,
    tipo: campo(formData, "tipo") ?? "otro",
    unidad: campo(formData, "unidad") ?? "saco",
    contenido_kg: numero(formData, "contenido_kg"),
    costo_unitario: numero(formData, "costo_unitario"),
    stock_minimo: numero(formData, "stock_minimo"),
    proveedor: campo(formData, "proveedor"),
    dias_retiro: numero(formData, "dias_retiro"),
    controlado: bandera(formData, "controlado"),
  });
  if (error) redirect(`${volverA}?error=${encodeURIComponent(error.message)}`);
  revalidarInventario();
  redirect(volverA);
}

/** Entrada de inventario (compra); opcionalmente registra también el gasto. */
export async function registrarEntrada(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const volverA = destino(formData);
  const productoId = campo(formData, "producto_id");
  const cantidad = numero(formData, "cantidad") ?? 0;
  if (!productoId || !(cantidad > 0)) redirect(volverA);

  const fecha = campo(formData, "fecha") ?? fechaHoy();
  const costoUnitario = numero(formData, "costo_unitario");
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
    lote: campo(formData, "lote"),
    caducidad: campo(formData, "caducidad"),
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
    // Lo que no tiene categoría propia (medicamento, hormonal, otro) se va a
    // "Medicamentos", como siempre.
    const categoria = CATEGORIA_GASTO_POR_TIPO[producto?.tipo ?? ""] ?? "Medicamentos";
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

  revalidarInventario();
  redirect(volverA);
}

export async function ajustarInventario(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const volverA = destino(formData);
  const productoId = campo(formData, "producto_id");
  const cantidad = numero(formData, "cantidad");
  if (!productoId || cantidad == null) redirect(volverA);

  await supabase.from("inventario_movimientos").insert({
    rancho_id: rancho.id,
    producto_id: productoId,
    tipo: "ajuste",
    cantidad,
    fecha: fechaHoy(),
    obs: campo(formData, "obs") ?? "Ajuste manual",
  });
  revalidarInventario();
  redirect(volverA);
}
