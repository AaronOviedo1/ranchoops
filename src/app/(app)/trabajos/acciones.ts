"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";

function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

type ValoresIndividuales = Record<string, { peso?: number; resultado?: string; obs?: string }>;

/**
 * Registra un trabajo de ganado: crea el evento, lo liga a cada animal,
 * descuenta inventario si usa producto y aplica efectos según el tipo
 * (palpación → status reproductivo, pesaje → peso individual).
 */
export async function registrarTrabajo(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tipo = campo(formData, "tipo");
  if (!tipo) redirect("/trabajos/nuevo");

  const fecha = campo(formData, "fecha") ?? new Date().toISOString().slice(0, 10);
  const grupoId = campo(formData, "grupo_id");
  const productoId = campo(formData, "producto_id");
  const cantidad = campo(formData, "cantidad");
  const animalIds = formData.getAll("animal_id").map(String).filter(Boolean);

  let valores: ValoresIndividuales = {};
  try {
    valores = JSON.parse(String(formData.get("valores") ?? "{}"));
  } catch {
    valores = {};
  }

  // Costo: manual o calculado del producto
  let costoTotal = campo(formData, "costo_total")
    ? Number(campo(formData, "costo_total"))
    : null;
  let producto: { costo_unitario: number | null; nombre: string } | null = null;
  if (productoId) {
    const { data } = await supabase
      .from("productos")
      .select("costo_unitario, nombre")
      .eq("id", productoId)
      .single();
    producto = data;
    if (costoTotal == null && producto?.costo_unitario != null && cantidad) {
      costoTotal = producto.costo_unitario * Number(cantidad);
    }
  }

  const { data: evento, error } = await supabase
    .from("eventos")
    .insert({
      rancho_id: rancho.id,
      tipo,
      fecha,
      grupo_id: grupoId,
      producto_id: productoId,
      cantidad: cantidad ? Number(cantidad) : null,
      dosis: campo(formData, "dosis"),
      responsable: campo(formData, "responsable"),
      resultado: campo(formData, "resultado"),
      costo_total: costoTotal,
      obs: campo(formData, "obs"),
      creado_por: user?.id,
    })
    .select("id")
    .single();

  if (error || !evento) {
    redirect(`/trabajos/nuevo?error=${encodeURIComponent(error?.message ?? "Error al guardar")}`);
  }

  // Liga cada animal con sus valores individuales
  if (animalIds.length > 0) {
    await supabase.from("evento_animales").insert(
      animalIds.map((animalId) => ({
        rancho_id: rancho.id,
        evento_id: evento.id,
        animal_id: animalId,
        valores: valores[animalId] ?? null,
      }))
    );
  }

  // Descuento de inventario
  if (productoId && cantidad && Number(cantidad) > 0) {
    await supabase.from("inventario_movimientos").insert({
      rancho_id: rancho.id,
      producto_id: productoId,
      tipo: "salida",
      cantidad: Number(cantidad),
      costo_unitario: producto?.costo_unitario,
      costo_total: costoTotal,
      fecha,
      evento_id: evento.id,
      obs: `Trabajo: ${tipo}`,
    });
  }

  // Efectos por tipo de trabajo
  if (tipo === "palpacion" || tipo === "ultrasonido") {
    for (const animalId of animalIds) {
      const resultado = valores[animalId]?.resultado ?? campo(formData, "resultado");
      if (resultado) {
        await supabase
          .from("animales")
          .update({ status_reproductivo: resultado })
          .eq("id", animalId)
          .eq("rancho_id", rancho.id);
      }
    }
  }

  revalidatePath("/trabajos");
  revalidatePath("/ganado");
  redirect(`/trabajos?ok=1`);
}

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
    fecha: campo(formData, "fecha") ?? new Date().toISOString().slice(0, 10),
    grupo_id: campo(formData, "grupo_id"),
    obs,
    creado_por: user?.id,
  });

  revalidatePath("/bitacora");
  redirect("/bitacora");
}
