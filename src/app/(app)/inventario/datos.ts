import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Existencia } from "@/lib/tipos";
import { caducidadProxima } from "@/lib/inventario";

/** La existencia con lo que la vista no trae y cada pestaña necesita. */
export type ExistenciaDetalle = Existencia & {
  contenido_kg: number | null;
  dias_retiro: number | null;
  controlado: boolean;
  proveedor: string | null;
  /** Estimada: ver `caducidadProxima`. */
  caducidad: string | null;
};

export type MovimientoReciente = {
  id: string;
  tipo: "entrada" | "salida" | "ajuste";
  cantidad: number;
  fecha: string;
  obs: string | null;
  producto: string;
};

/**
 * Todo lo que pinta el inventario, de un jalón. Con `tipos` se queda solo con
 * los productos de una pestaña (y con sus movimientos).
 */
export async function cargarInventario(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ranchoId: string,
  tipos?: string[]
): Promise<{ existencias: ExistenciaDetalle[]; movimientos: MovimientoReciente[] }> {
  let qExistencias = supabase
    .from("v_existencias")
    .select("*")
    .eq("rancho_id", ranchoId)
    .order("nombre");
  // `v_existencias` no expone kg, retiro ni controlado: salen de `productos`.
  let qProductos = supabase
    .from("productos")
    .select("id, contenido_kg, dias_retiro, controlado, proveedor")
    .eq("rancho_id", ranchoId)
    .eq("activo", true);
  let qEntradas = supabase
    .from("inventario_movimientos")
    .select("producto_id, fecha, cantidad, caducidad, productos!inner(tipo)")
    .eq("rancho_id", ranchoId)
    .eq("tipo", "entrada")
    .not("caducidad", "is", null);
  let qMovimientos = supabase
    .from("inventario_movimientos")
    .select("id, tipo, cantidad, fecha, obs, productos!inner(nombre, tipo)")
    .eq("rancho_id", ranchoId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  if (tipos) {
    qExistencias = qExistencias.in("tipo", tipos);
    qProductos = qProductos.in("tipo", tipos);
    qEntradas = qEntradas.in("productos.tipo", tipos);
    qMovimientos = qMovimientos.in("productos.tipo", tipos);
  }

  const [{ data: existencias }, { data: productos }, { data: entradas }, { data: movimientos }] =
    await Promise.all([qExistencias, qProductos, qEntradas, qMovimientos]);

  const detalle = new Map((productos ?? []).map((p) => [p.id, p]));
  const entradasPor = new Map<string, { fecha: string; cantidad: number; caducidad: string }[]>();
  for (const e of (entradas ?? []) as unknown as {
    producto_id: string;
    fecha: string;
    cantidad: number;
    caducidad: string;
  }[]) {
    const lista = entradasPor.get(e.producto_id);
    if (lista) lista.push(e);
    else entradasPor.set(e.producto_id, [e]);
  }

  return {
    existencias: ((existencias ?? []) as Existencia[]).map((e) => {
      const p = detalle.get(e.producto_id);
      return {
        ...e,
        contenido_kg: p?.contenido_kg ?? null,
        dias_retiro: p?.dias_retiro ?? null,
        controlado: p?.controlado ?? false,
        proveedor: p?.proveedor ?? null,
        caducidad: caducidadProxima(entradasPor.get(e.producto_id) ?? [], e.existencia),
      };
    }),
    movimientos: ((movimientos ?? []) as unknown as {
      id: string;
      tipo: MovimientoReciente["tipo"];
      cantidad: number;
      fecha: string;
      obs: string | null;
      productos: { nombre: string } | null;
    }[]).map((m) => ({
      id: m.id,
      tipo: m.tipo,
      cantidad: m.cantidad,
      fecha: m.fecha,
      obs: m.obs,
      producto: m.productos?.nombre ?? "—",
    })),
  };
}
