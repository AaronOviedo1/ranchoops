import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import {
  categoriaDeTipo,
  categoriaInventario,
  etiquetaTipoProducto,
} from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";
import { respuestaTabla } from "@/lib/exportar";
import { cargarInventario } from "../datos";

/**
 * Export del inventario. Con `?categoria=` se lleva solo esa pestaña; sin él,
 * todo, con la categoría como columna.
 */
export async function GET(request: NextRequest) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;
  const categoria = categoriaInventario(sp.get("categoria"));

  const { existencias } = await cargarInventario(supabase, rancho.id, categoria?.tipos);

  const filas: (string | number | null | undefined)[][] = [
    [
      "Producto", "Categoría", "Tipo", "Existencia", "Unidad", "Kg por unidad",
      "Kg totales", "Mínimo", "Costo por unidad", "Valor", "Caducidad (estimada)",
      "Días de retiro", "Controlado", "Proveedor",
    ],
    ...existencias.map((p) => [
      p.nombre,
      categoriaDeTipo(p.tipo).etiqueta,
      etiquetaTipoProducto(p.tipo),
      p.existencia,
      p.unidad,
      p.contenido_kg,
      p.contenido_kg != null ? p.contenido_kg * p.existencia : null,
      p.stock_minimo,
      p.costo_unitario,
      p.costo_unitario != null ? p.costo_unitario * p.existencia : null,
      p.caducidad,
      p.dias_retiro,
      p.controlado ? "sí" : "",
      p.proveedor,
    ]),
  ];

  return respuestaTabla(
    sp.get("formato"),
    filas,
    `inventario${categoria ? `-${categoria.slug}` : ""}-${fechaHoy()}`,
    categoria?.etiqueta ?? "Inventario"
  );
}
