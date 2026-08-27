// Los tres análisis del hato que se consultan en Registros y se exportan:
// rendimiento de las madres, rendimiento de cada animal y la reconciliación
// del inventario. Viven aquí, no en las páginas, para que la página y el
// route de exportar saquen exactamente las mismas cifras.
//
// Todo se calcula de lo que ya se captura (animales, eventos, ventas,
// compras): no hay tablas nuevas. Las aproximaciones se dicen en pantalla.

import type { SupabaseClient } from "@supabase/supabase-js";
import { diasEntre } from "@/lib/pesos";
import { fechaHoy } from "@/lib/fechas";
import type { EventoAnimal } from "@/lib/tipos";

// ─────────────────────────────────────────────────────────────
// 1. Rendimiento de la madre
// ─────────────────────────────────────────────────────────────

export type FilaMadre = {
  id: string;
  arete: string | null;
  siniga: string | null;
  clase: string;
  fecha_nacimiento: string | null;
  status: string;
  status_reproductivo: string | null;
  /** true = cargada, false = vacía, null = sin diagnóstico. */
  gestante: boolean | null;
  /** Servicios registrados (inseminaciones). */
  servicios: number;
  crias: number;
  criasAnio: number;
  destetadas: number;
  /** % de crías que llegaron al destete. */
  eficienciaDestete: number | null;
  pesoDestetePromedio: number | null;
  ultimoParto: string | null;
  /** Promedio de días entre un parto y el siguiente. */
  intervaloPartos: number | null;
};

export async function rendimientoMadres(
  supabase: SupabaseClient,
  ranchoId: string,
  opciones: { anio: number; status: "activo" | "todos" }
): Promise<FilaMadre[]> {
  let qHembras = supabase
    .from("animales")
    .select("id, arete_control, siniga, clase, fecha_nacimiento, status, status_reproductivo")
    .eq("rancho_id", ranchoId)
    .eq("sexo", "H");
  if (opciones.status === "activo") qHembras = qHembras.eq("status", "activo");

  const [{ data: hembras }, { data: crias }, { data: servicios }] = await Promise.all([
    qHembras.limit(5000),
    supabase
      .from("animales")
      .select("id, madre_id, fecha_nacimiento, fecha_destete, peso_destete")
      .eq("rancho_id", ranchoId)
      .not("madre_id", "is", null)
      .limit(10000),
    supabase
      .from("evento_animales")
      .select("animal_id, eventos!inner(tipo)")
      .eq("rancho_id", ranchoId)
      .in("eventos.tipo", ["ia"])
      .limit(10000),
  ]);

  const porMadre = new Map<
    string,
    { nacimiento: string | null; destete: string | null; pesoDestete: number | null }[]
  >();
  for (const c of crias ?? []) {
    const lista = porMadre.get(c.madre_id) ?? [];
    lista.push({
      nacimiento: c.fecha_nacimiento,
      destete: c.fecha_destete,
      pesoDestete: c.peso_destete,
    });
    porMadre.set(c.madre_id, lista);
  }
  const serviciosDe = new Map<string, number>();
  for (const s of servicios ?? []) {
    serviciosDe.set(s.animal_id, (serviciosDe.get(s.animal_id) ?? 0) + 1);
  }

  return (hembras ?? []).map((h) => {
    const lista = porMadre.get(h.id) ?? [];
    const destetadas = lista.filter((c) => c.destete || c.pesoDestete != null).length;
    const pesos = lista
      .map((c) => c.pesoDestete)
      .filter((p): p is number => p != null);
    const partos = lista
      .map((c) => c.nacimiento)
      .filter((f): f is string => !!f)
      .sort();
    let intervalo: number | null = null;
    if (partos.length >= 2) {
      const difs = partos.slice(1).map((f, i) => diasEntre(partos[i], f));
      intervalo = Math.round(difs.reduce((s, d) => s + d, 0) / difs.length);
    }
    const sr = h.status_reproductivo ?? "";
    const gestante = /^cargada/.test(sr) || sr === "parida_y_cargada"
      ? true
      : /^vacia/.test(sr)
        ? false
        : null;
    return {
      id: h.id,
      arete: h.arete_control,
      siniga: h.siniga,
      clase: h.clase,
      fecha_nacimiento: h.fecha_nacimiento,
      status: h.status,
      status_reproductivo: h.status_reproductivo,
      gestante,
      servicios: serviciosDe.get(h.id) ?? 0,
      crias: lista.length,
      criasAnio: partos.filter((f) => f.startsWith(String(opciones.anio))).length,
      destetadas,
      eficienciaDestete: lista.length > 0 ? (destetadas / lista.length) * 100 : null,
      pesoDestetePromedio: pesos.length
        ? pesos.reduce((s, p) => s + p, 0) / pesos.length
        : null,
      ultimoParto: partos.length ? partos[partos.length - 1] : null,
      intervaloPartos: intervalo,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// 2. Rendimiento del animal (en el campo y en vida)
// ─────────────────────────────────────────────────────────────

export type FilaRendimiento = {
  id: string;
  arete: string | null;
  siniga: string | null;
  clase: string;
  status: string;
  procedencia: string | null;
  enCampoDesde: string | null;
  fechaSalida: string | null;
  diasEnCampo: number | null;
  primerPeso: { fecha: string; peso: number } | null;
  ultimoPeso: { fecha: string; peso: number } | null;
  gananciaTotal: number | null;
  /** GDP del primer al último pesaje. */
  gdpGeneral: number | null;
  /** GDP entre los dos últimos pesajes. */
  gdpReciente: number | null;
  /** Último peso proyectado a hoy con la GDP general. */
  pesoEstimado: number | null;
  /** Costos directos prorrateados de los trabajos con costo. */
  costos: number;
  compra: { fecha: string; precio: number | null } | null;
  venta: { fecha: string; precio: number | null } | null;
  /** Venta − compra − costos, solo cuando ya se vendió. */
  resultado: number | null;
};

export async function rendimientoAnimales(
  supabase: SupabaseClient,
  ranchoId: string,
  opciones: { status: "activo" | "vendido" | "todos"; conDinero: boolean }
): Promise<FilaRendimiento[]> {
  let qAnimales = supabase
    .from("animales")
    .select(
      "id, arete_control, siniga, clase, status, procedencia, fecha_en_campo, fecha_nacimiento, peso_nacimiento, fecha_salida"
    )
    .eq("rancho_id", ranchoId);
  if (opciones.status !== "todos") qAnimales = qAnimales.eq("status", opciones.status);

  const [{ data: animales }, { data: eventosAnimal }] = await Promise.all([
    qAnimales.limit(5000),
    supabase
      .from("evento_animales")
      .select("animal_id, evento_id, valores, eventos!inner(fecha, tipo, costo_total)")
      .eq("rancho_id", ranchoId)
      .limit(20000),
  ]);

  type EA = {
    animal_id: string;
    evento_id: string;
    valores: EventoAnimal["valores"];
    eventos: { fecha: string; tipo: string; costo_total: number | null };
  };
  const filasEA = (eventosAnimal ?? []) as unknown as EA[];

  // Cuántos animales tocó cada evento, para prorratear su costo
  const cabezasPorEvento = new Map<string, number>();
  for (const f of filasEA) {
    cabezasPorEvento.set(f.evento_id, (cabezasPorEvento.get(f.evento_id) ?? 0) + 1);
  }

  const pesosDe = new Map<string, { fecha: string; peso: number }[]>();
  const costosDe = new Map<string, number>();
  for (const f of filasEA) {
    const peso = f.valores?.peso;
    if (peso != null && (f.eventos.tipo === "pesaje" || f.eventos.tipo === "destete")) {
      const lista = pesosDe.get(f.animal_id) ?? [];
      lista.push({ fecha: f.eventos.fecha, peso });
      pesosDe.set(f.animal_id, lista);
    }
    if (f.eventos.costo_total != null) {
      const n = cabezasPorEvento.get(f.evento_id) ?? 1;
      costosDe.set(
        f.animal_id,
        (costosDe.get(f.animal_id) ?? 0) + Number(f.eventos.costo_total) / n
      );
    }
  }

  // Dinero: ventas y compras ligadas por animal (RLS las esconde a quien no
  // es admin; además aquí ni se piden).
  const ventaDe = new Map<string, { fecha: string; precio: number | null }>();
  const compraDe = new Map<string, { fecha: string; precio: number | null }>();
  if (opciones.conDinero) {
    const [{ data: va }, { data: ca }] = await Promise.all([
      supabase
        .from("venta_animales")
        .select("animal_id, venta_id, ventas!inner(fecha), animales!inner(clase)")
        .eq("rancho_id", ranchoId),
      supabase
        .from("compra_animales")
        .select("animal_id, compra_id, compras!inner(fecha), animales!inner(clase)")
        .eq("rancho_id", ranchoId),
    ]);
    type Liga = {
      animal_id: string;
      venta_id?: string;
      compra_id?: string;
      ventas?: { fecha: string };
      compras?: { fecha: string };
      animales: { clase: string };
    };
    const ligasV = (va ?? []) as unknown as Liga[];
    const ligasC = (ca ?? []) as unknown as Liga[];
    const ventaIds = [...new Set(ligasV.map((l) => l.venta_id!))];
    const compraIds = [...new Set(ligasC.map((l) => l.compra_id!))];
    const [{ data: rv }, { data: rc }] = await Promise.all([
      ventaIds.length
        ? supabase
            .from("venta_renglones")
            .select("venta_id, clase, cabezas, precio_cabeza, total")
            .in("venta_id", ventaIds)
        : { data: [] },
      compraIds.length
        ? supabase
            .from("compra_renglones")
            .select("compra_id, clase, cabezas, precio_cabeza, total")
            .in("compra_id", compraIds)
        : { data: [] },
    ]);
    // El precio por cabeza se aproxima con el renglón de la clase del animal
    // (la venta se captura por clase, no animal por animal).
    const precioRenglon = (
      renglones: { clase: string; cabezas: number; precio_cabeza: number | null; total: number }[],
      clase: string
    ): number | null => {
      const plural = clase.toLowerCase();
      const r =
        renglones.find((x) => x.clase.toLowerCase().startsWith(plural)) ??
        renglones[0];
      if (!r) return null;
      return r.precio_cabeza ?? (r.cabezas > 0 ? Number(r.total) / r.cabezas : null);
    };
    for (const l of ligasV) {
      const renglones = (rv ?? []).filter((r) => r.venta_id === l.venta_id);
      ventaDe.set(l.animal_id, {
        fecha: l.ventas!.fecha,
        precio: precioRenglon(renglones, l.animales.clase),
      });
    }
    for (const l of ligasC) {
      const renglones = (rc ?? []).filter((r) => r.compra_id === l.compra_id);
      compraDe.set(l.animal_id, {
        fecha: l.compras!.fecha,
        precio: precioRenglon(renglones, l.animales.clase),
      });
    }
  }

  const hoy = fechaHoy();
  return (animales ?? []).map((a) => {
    const pesos = [...(pesosDe.get(a.id) ?? [])].sort((x, y) =>
      x.fecha.localeCompare(y.fecha)
    );
    // El peso al nacer cuenta como primer punto si lo tienen.
    if (a.fecha_nacimiento && a.peso_nacimiento != null) {
      pesos.unshift({ fecha: a.fecha_nacimiento, peso: a.peso_nacimiento });
    }
    const primero = pesos[0] ?? null;
    const ultimo = pesos.length ? pesos[pesos.length - 1] : null;
    const penultimo = pesos.length >= 2 ? pesos[pesos.length - 2] : null;

    const gdpGeneral =
      primero && ultimo && primero !== ultimo && diasEntre(primero.fecha, ultimo.fecha) > 0
        ? (ultimo.peso - primero.peso) / diasEntre(primero.fecha, ultimo.fecha)
        : null;
    const gdpReciente =
      penultimo && ultimo && diasEntre(penultimo.fecha, ultimo.fecha) > 0
        ? (ultimo.peso - penultimo.peso) / diasEntre(penultimo.fecha, ultimo.fecha)
        : null;

    const enCampoDesde = a.fecha_en_campo ?? a.fecha_nacimiento ?? null;
    const hasta = a.fecha_salida ?? hoy;
    const diasEnCampo = enCampoDesde ? diasEntre(enCampoDesde, hasta) : null;
    const pesoEstimado =
      ultimo && gdpGeneral != null && a.status === "activo"
        ? ultimo.peso + gdpGeneral * diasEntre(ultimo.fecha, hoy)
        : null;

    const costos = Math.round((costosDe.get(a.id) ?? 0) * 100) / 100;
    const compra = compraDe.get(a.id) ?? null;
    const venta = ventaDe.get(a.id) ?? null;
    const resultado =
      venta?.precio != null
        ? venta.precio - (compra?.precio ?? 0) - costos
        : null;

    return {
      id: a.id,
      arete: a.arete_control,
      siniga: a.siniga,
      clase: a.clase,
      status: a.status,
      procedencia: a.procedencia,
      enCampoDesde,
      fechaSalida: a.fecha_salida,
      diasEnCampo,
      primerPeso: primero,
      ultimoPeso: ultimo,
      gananciaTotal: primero && ultimo && primero !== ultimo ? ultimo.peso - primero.peso : null,
      gdpGeneral,
      gdpReciente,
      pesoEstimado,
      costos,
      compra,
      venta,
      resultado,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// 3. Reconciliación del hato (inventario ganadero)
// ─────────────────────────────────────────────────────────────

export type FilaHato = {
  clase: string;
  inicial: number;
  nacimientos: number;
  compradas: number;
  otrasEntradas: number;
  vendidas: number;
  muertes: number;
  otrasSalidas: number;
  /** inicial + entradas − salidas */
  cierre: number;
  /** Lo que hay hoy con esa clase (solo si el año es el actual). */
  actual: number | null;
};

export async function reconciliacionHato(
  supabase: SupabaseClient,
  ranchoId: string,
  anio: number
): Promise<{ filas: FilaHato[]; total: FilaHato }> {
  const inicio = `${anio}-01-01`;
  const fin = `${anio}-12-31`;
  const esAnioActual = anio === Number(fechaHoy().slice(0, 4));

  const [{ data: animales }, { data: compradas }] = await Promise.all([
    supabase
      .from("animales")
      .select("id, clase, status, fecha_nacimiento, fecha_en_campo, fecha_salida, causa_salida, created_at")
      .eq("rancho_id", ranchoId)
      .limit(10000),
    supabase
      .from("compra_animales")
      .select("animal_id, compras!inner(fecha)")
      .eq("rancho_id", ranchoId)
      .gte("compras.fecha", inicio)
      .lte("compras.fecha", fin),
  ]);
  const idsCompradas = new Set((compradas ?? []).map((c) => c.animal_id));

  const porClase = new Map<string, FilaHato>();
  const fila = (clase: string) => {
    let f = porClase.get(clase);
    if (!f) {
      f = {
        clase, inicial: 0, nacimientos: 0, compradas: 0, otrasEntradas: 0,
        vendidas: 0, muertes: 0, otrasSalidas: 0, cierre: 0, actual: esAnioActual ? 0 : null,
      };
      porClase.set(clase, f);
    }
    return f;
  };

  for (const a of animales ?? []) {
    const f = fila(a.clase);
    // Desde cuándo cuenta en el rancho: en el campo, si no nació, si no se capturó.
    const entrada = a.fecha_en_campo ?? a.fecha_nacimiento ?? a.created_at?.slice(0, 10) ?? inicio;
    const salida = a.status === "activo" ? null : a.fecha_salida;

    // Estaba al 1 de enero y no había salido
    if (entrada < inicio && (!salida || salida >= inicio)) f.inicial += 1;

    // Entradas del año
    if (a.fecha_nacimiento && a.fecha_nacimiento >= inicio && a.fecha_nacimiento <= fin) {
      f.nacimientos += 1;
    } else if (idsCompradas.has(a.id)) {
      f.compradas += 1;
    } else if (entrada >= inicio && entrada <= fin) {
      f.otrasEntradas += 1;
    }

    // Salidas del año
    if (salida && salida >= inicio && salida <= fin) {
      if (a.status === "vendido") f.vendidas += 1;
      else if (a.status === "muerto") f.muertes += 1;
      else f.otrasSalidas += 1;
    }

    if (esAnioActual && a.status === "activo") f.actual = (f.actual ?? 0) + 1;
  }

  const filas = [...porClase.values()]
    .map((f) => ({
      ...f,
      cierre:
        f.inicial + f.nacimientos + f.compradas + f.otrasEntradas
        - f.vendidas - f.muertes - f.otrasSalidas,
    }))
    .filter((f) => f.inicial || f.nacimientos || f.compradas || f.otrasEntradas || f.vendidas || f.muertes || f.otrasSalidas || f.actual)
    .sort((a, b) => a.clase.localeCompare(b.clase, "es"));

  const total = filas.reduce<FilaHato>(
    (t, f) => ({
      clase: "Total",
      inicial: t.inicial + f.inicial,
      nacimientos: t.nacimientos + f.nacimientos,
      compradas: t.compradas + f.compradas,
      otrasEntradas: t.otrasEntradas + f.otrasEntradas,
      vendidas: t.vendidas + f.vendidas,
      muertes: t.muertes + f.muertes,
      otrasSalidas: t.otrasSalidas + f.otrasSalidas,
      cierre: t.cierre + f.cierre,
      actual: esAnioActual ? (t.actual ?? 0) + (f.actual ?? 0) : null,
    }),
    {
      clase: "Total", inicial: 0, nacimientos: 0, compradas: 0, otrasEntradas: 0,
      vendidas: 0, muertes: 0, otrasSalidas: 0, cierre: 0, actual: esAnioActual ? 0 : null,
    }
  );

  return { filas, total };
}
