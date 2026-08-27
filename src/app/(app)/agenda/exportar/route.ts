import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { estadoTarea } from "@/lib/estados";
import { fechaHoy } from "@/lib/fechas";
import { respuestaTabla } from "@/lib/exportar";
import type { Tarea } from "@/lib/tipos";

/** Export de las tareas (mismos filtros que la página). */
export async function GET(request: NextRequest) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;
  const mostrarHechas = sp.get("hechas") === "1";
  const formato = sp.get("formato");

  const { data } = await supabase
    .from("tareas")
    .select("*, potreros(nombre), grupos(nombre), perfiles:responsable_id(nombre)")
    .eq("rancho_id", rancho.id)
    .order("fecha_vence", { ascending: true, nullsFirst: false });

  type Fila = Tarea & {
    potreros: { nombre: string } | null;
    grupos: { nombre: string } | null;
    perfiles: { nombre: string | null } | null;
  };
  const lista = ((data ?? []) as unknown as Fila[]).filter((t) =>
    mostrarHechas ? true : t.estado === "pendiente" || t.estado === "en_curso"
  );

  const filas = [
    [
      "Tarea", "Prioridad", "Categoría", "Empieza", "Vence", "Responsable",
      "Potrero", "Grupo", "Estado", "Hecha el", "Detalle",
    ],
    ...lista.map((t) => [
      t.nombre,
      t.prioridad,
      t.categoria,
      t.fecha_inicio,
      t.fecha_vence,
      t.perfiles?.nombre,
      t.potreros?.nombre,
      t.grupos?.nombre,
      estadoTarea(t.estado).etiqueta,
      t.hecha_at?.slice(0, 10),
      t.descripcion,
    ]),
  ];

  return respuestaTabla(formato, filas, `tareas-${fechaHoy()}`, "Tareas");
}
