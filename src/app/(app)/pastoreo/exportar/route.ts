import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { uaTotal } from "@/lib/dse";
import { fechaHoy } from "@/lib/fechas";
import { respuestaTabla } from "@/lib/exportar";
import type { PastoreoMes, PotreroEstado } from "@/lib/tipos";

/** Export del resumen de pastoreo del año (mismos filtros que la página). */
export async function GET(request: NextRequest) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;

  const potreroFiltro = sp.get("potrero")?.trim() ?? "";
  const anioTexto = sp.get("anio")?.trim() ?? "";
  const anio = /^\d{4}$/.test(anioTexto) ? Number(anioTexto) : new Date().getFullYear();
  const formato = sp.get("formato");

  let qMensual = supabase
    .from("v_pastoreo_mensual")
    .select("*")
    .eq("rancho_id", rancho.id)
    .gte("mes", `${anio}-01-01`)
    .lte("mes", `${anio}-12-31`);
  if (potreroFiltro) qMensual = qMensual.eq("potrero_id", potreroFiltro);

  let qMovs = supabase
    .from("grupo_movimientos")
    .select("potrero_id, calif_buniga")
    .eq("rancho_id", rancho.id)
    .gte("fecha_entrada", `${anio}-01-01`)
    .lte("fecha_entrada", `${anio}-12-31`);
  if (potreroFiltro) qMovs = qMovs.eq("potrero_id", potreroFiltro);

  const [{ data: mensual }, { data: estados }, { data: animales }, { data: movs }] =
    await Promise.all([
      qMensual,
      supabase
        .from("v_potrero_estado")
        .select("*")
        .eq("rancho_id", rancho.id)
        .order("nombre"),
      supabase
        .from("animales")
        .select("grupo_id, especie, clase, categoria_dse")
        .eq("rancho_id", rancho.id)
        .eq("status", "activo"),
      qMovs,
    ]);

  const porGrupo = new Map<string, { ua: number; n: number }>();
  for (const a of animales ?? []) {
    if (!a.grupo_id) continue;
    const acc = porGrupo.get(a.grupo_id) ?? { ua: 0, n: 0 };
    acc.ua += uaTotal([a]);
    acc.n += 1;
    porGrupo.set(a.grupo_id, acc);
  }
  const factorRancho =
    (animales ?? []).length > 0 ? uaTotal(animales ?? []) / (animales ?? []).length : 1;
  const factorDe = (grupoId: string) => {
    const g = porGrupo.get(grupoId);
    return g && g.n > 0 ? g.ua / g.n : factorRancho;
  };

  const porPotrero = new Map<string, { dias: number; cabezasDia: number; uaDia: number }>();
  for (const f of (mensual ?? []) as PastoreoMes[]) {
    const acc = porPotrero.get(f.potrero_id) ?? { dias: 0, cabezasDia: 0, uaDia: 0 };
    acc.dias += Number(f.dias_ocupado);
    acc.cabezasDia += Number(f.cabezas_dia);
    acc.uaDia += Number(f.cabezas_dia) * factorDe(f.grupo_id);
    porPotrero.set(f.potrero_id, acc);
  }
  const veces = new Map<string, { n: number; buniga: number[] }>();
  for (const m of movs ?? []) {
    const acc = veces.get(m.potrero_id) ?? { n: 0, buniga: [] };
    acc.n += 1;
    if (m.calif_buniga != null) acc.buniga.push(Number(m.calif_buniga));
    veces.set(m.potrero_id, acc);
  }

  const lista = ((estados ?? []) as PotreroEstado[]).filter(
    (p) => !potreroFiltro || p.potrero_id === potreroFiltro
  );

  const filas: (string | number | null | undefined)[][] = [
    [
      "Potrero", "Superficie (has)", `Veces pastoreado ${anio}`,
      `Días ocupado ${anio}`, "Días de descanso actual", "Meta de descanso",
      "Cabezas-día", "UA-día", "Buñiga promedio",
    ],
    ...lista.map((p) => {
      const acc = porPotrero.get(p.potrero_id);
      const v = veces.get(p.potrero_id);
      const buniga =
        v && v.buniga.length
          ? Math.round((v.buniga.reduce((s, x) => s + x, 0) / v.buniga.length) * 10) / 10
          : null;
      return [
        p.nombre,
        p.superficie_has,
        v?.n ?? 0,
        acc?.dias ?? 0,
        p.grupo_actual_id ? "ocupado" : p.dias_descanso,
        rancho.meta_dias_descanso,
        acc ? Math.round(acc.cabezasDia) : 0,
        acc ? Math.round(acc.uaDia) : 0,
        buniga,
      ];
    }),
  ];

  return respuestaTabla(formato, filas, `pastoreo-${anio}-${fechaHoy()}`, "Pastoreo");
}
