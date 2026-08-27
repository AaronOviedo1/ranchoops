import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { estadoPotrero } from "@/lib/estados";
import { fechaHoy } from "@/lib/fechas";
import { respuestaTabla } from "@/lib/exportar";
import type { PotreroCarga, PotreroEstado } from "@/lib/tipos";

/** Export de la lista de potreros, con el mismo estado que muestra la página. */
export async function GET(request: NextRequest) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const formato = request.nextUrl.searchParams.get("formato");

  const [{ data: estados }, { data: grupos }, { data: potreros }, { data: cargas }] =
    await Promise.all([
      supabase
        .from("v_potrero_estado")
        .select("*")
        .eq("rancho_id", rancho.id)
        .order("nombre"),
      supabase.from("grupos").select("id, nombre").eq("rancho_id", rancho.id),
      supabase
        .from("potreros")
        .select("id, tipo_vegetacion, capacidad_estimada")
        .eq("rancho_id", rancho.id),
      supabase
        .from("v_potrero_carga")
        .select("*")
        .eq("rancho_id", rancho.id),
    ]);

  const nombreGrupo = new Map((grupos ?? []).map((g) => [g.id, g.nombre]));
  const extra = new Map((potreros ?? []).map((p) => [p.id, p]));
  const carga = new Map(
    ((cargas ?? []) as PotreroCarga[]).map((c) => [c.potrero_id, c])
  );
  const meta = rancho.meta_dias_descanso;

  const filas: (string | number | null | undefined)[][] = [
    [
      "Potrero", "Estado", "Superficie (has)", "Grupo actual",
      "Ocupado desde", "Días ocupado", "Última salida", "Días de descanso",
      "Cabezas", "UA", "UA/ha", "% capacidad",
      "Capacidad (cabezas)", "Vegetación",
    ],
    ...((estados ?? []) as PotreroEstado[]).map((p) => [
      p.nombre,
      estadoPotrero(p.dias_descanso, meta, !!p.grupo_actual_id).etiqueta,
      p.superficie_has,
      p.grupo_actual_id ? (nombreGrupo.get(p.grupo_actual_id) ?? "") : "",
      p.ocupado_desde,
      p.dias_ocupado,
      p.ultima_salida,
      p.dias_descanso,
      carga.get(p.potrero_id)?.cabezas,
      carga.get(p.potrero_id)?.ua,
      carga.get(p.potrero_id)?.ua_por_ha,
      carga.get(p.potrero_id)?.pct_capacidad,
      extra.get(p.potrero_id)?.capacidad_estimada,
      extra.get(p.potrero_id)?.tipo_vegetacion,
    ]),
  ];

  return respuestaTabla(formato, filas, `potreros-${fechaHoy()}`, "Potreros");
}
