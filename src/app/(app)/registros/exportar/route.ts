import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembresia, requireRancho } from "@/lib/auth";
import {
  etiquetaClase,
  etiquetaEventoPesaje,
  etiquetaReproductivo,
  etiquetaTrabajo,
  mesesGestacion,
  normalizarReproductivo,
} from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";
import { respuestaTabla } from "@/lib/exportar";
import { tipoRegistro, TIPOS_EVENTO_CONOCIDOS } from "@/lib/registros";
import {
  reconciliacionHato,
  rendimientoAnimales,
  rendimientoMadres,
} from "@/lib/analisis";
import type { EventoAnimal } from "@/lib/tipos";

/** Export de un tipo de registro con los mismos filtros que la página. */
export async function GET(request: NextRequest) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;

  const tipo = sp.get("tipo") ?? "";
  const anioTexto = sp.get("anio") ?? "";
  const anio = /^\d{4}$/.test(anioTexto) ? Number(anioTexto) : null;
  const formato = sp.get("formato");
  const hoy = fechaHoy();

  // ── Análisis (misma lógica que sus páginas, en src/lib/analisis.ts) ──
  if (tipo === "madres") {
    const status = sp.get("status") === "todos" ? "todos" : "activo";
    const a = anio ?? Number(hoy.slice(0, 4));
    const filas = await rendimientoMadres(supabase, rancho.id, { anio: a, status });
    return respuestaTabla(
      formato,
      [
        [
          "Arete", "SINIIGA", "Clase", "Status", "Estado reproductivo", "Gestante",
          "Servicios (IA)", "Crías", `Crías ${a}`, "Destetadas", "Eficiencia de destete (%)",
          "Peso al destete promedio (kg)", "Último parto", "Intervalo entre partos (días)",
        ],
        ...filas.map((f) => [
          f.arete, f.siniga, etiquetaClase(f.clase), f.status,
          etiquetaReproductivo(f.status_reproductivo),
          f.gestante == null ? "" : f.gestante ? "sí" : "no",
          f.servicios, f.crias, f.criasAnio, f.destetadas,
          f.eficienciaDestete != null ? Math.round(f.eficienciaDestete) : null,
          f.pesoDestetePromedio != null ? Math.round(f.pesoDestetePromedio) : null,
          f.ultimoParto, f.intervaloPartos,
        ]),
      ],
      `rendimiento-madres-${hoy}`,
      "Madres"
    );
  }

  if (tipo === "rendimiento") {
    const s = sp.get("status");
    const status = s === "vendido" ? "vendido" : s === "todos" ? "todos" : "activo";
    const { rol } = await requireMembresia();
    const conDinero = rol === "admin";
    const filas = await rendimientoAnimales(supabase, rancho.id, { status, conDinero });
    const enc = [
      "Arete", "SINIIGA", "Clase", "Status", "Procedencia", "En el campo desde",
      "Fecha de salida", "Días en el campo", "Primer peso (kg)", "Fecha primer peso",
      "Último peso (kg)", "Fecha último peso", "Ganancia total (kg)", "GDP general (kg/día)",
      "GDP reciente (kg/día)", "Peso estimado hoy (kg)",
      ...(conDinero ? ["Costos directos", "Compra ($)", "Fecha de compra", "Venta ($)", "Fecha de venta", "Resultado ($)"] : []),
    ];
    return respuestaTabla(
      formato,
      [
        enc,
        ...filas.map((f) => [
          f.arete, f.siniga, etiquetaClase(f.clase), f.status, f.procedencia,
          f.enCampoDesde, f.fechaSalida, f.diasEnCampo,
          f.primerPeso?.peso, f.primerPeso?.fecha, f.ultimoPeso?.peso, f.ultimoPeso?.fecha,
          f.gananciaTotal, f.gdpGeneral != null ? Math.round(f.gdpGeneral * 1000) / 1000 : null,
          f.gdpReciente != null ? Math.round(f.gdpReciente * 1000) / 1000 : null,
          f.pesoEstimado != null ? Math.round(f.pesoEstimado) : null,
          ...(conDinero
            ? [f.costos, f.compra?.precio, f.compra?.fecha, f.venta?.precio, f.venta?.fecha, f.resultado]
            : []),
        ]),
      ],
      `rendimiento-animales-${hoy}`,
      "Rendimiento"
    );
  }

  if (tipo === "hato") {
    const a = anio ?? Number(hoy.slice(0, 4));
    const { filas, total } = await reconciliacionHato(supabase, rancho.id, a);
    const aFila = (f: typeof total) => [
      f.clase === "Total" ? "Total" : etiquetaClase(f.clase),
      f.inicial, f.nacimientos, f.compradas, f.otrasEntradas,
      f.vendidas, f.muertes, f.otrasSalidas, f.cierre, f.actual,
    ];
    return respuestaTabla(
      formato,
      [
        [
          "Clase", `Iniciales ${a}`, "Nacimientos", "Compradas", "Otras entradas",
          "Vendidas", "Muertes", "Otras salidas", "Cierre", "Activos hoy",
        ],
        ...filas.map(aFila),
        aFila(total),
      ],
      `reconciliacion-hato-${a}-${hoy}`,
      "Hato"
    );
  }

  const def = tipoRegistro(tipo);
  if (!def) notFound();
  const archivo = `registros-${def.slug}${anio ? `-${anio}` : ""}-${fechaHoy()}`;

  if (def.fuente === "grupo_movimientos") {
    let q = supabase
      .from("grupo_movimientos")
      .select("*, grupos(nombre), potreros(nombre)")
      .eq("rancho_id", rancho.id)
      .order("fecha_entrada", { ascending: false });
    if (anio) q = q.gte("fecha_entrada", `${anio}-01-01`).lte("fecha_entrada", `${anio}-12-31`);
    const { data } = await q;
    const filas = [
      ["Entrada", "Salida", "Grupo", "Potrero", "Cabezas entrada", "Cabezas salida", "Buñiga", "Residuo", "Obs"],
      ...(data ?? []).map((m) => [
        m.fecha_entrada,
        m.fecha_salida,
        (m.grupos as unknown as { nombre: string } | null)?.nombre,
        (m.potreros as unknown as { nombre: string } | null)?.nombre,
        m.num_animales_entrada,
        m.num_animales_salida,
        m.calif_buniga,
        m.residuo,
        m.obs,
      ]),
    ];
    return respuestaTabla(formato, filas, archivo, def.etiqueta);
  }

  if (def.fuente === "venta_animales") {
    let q = supabase
      .from("venta_animales")
      .select("venta_id, ventas!inner(fecha, comprador), animales(arete_control, siniga, clase)")
      .eq("rancho_id", rancho.id);
    if (anio) q = q.gte("ventas.fecha", `${anio}-01-01`).lte("ventas.fecha", `${anio}-12-31`);
    const { data } = await q;
    type Fila = {
      venta_id: string;
      ventas: { fecha: string; comprador: string | null };
      animales: { arete_control: string | null; siniga: string | null; clase: string } | null;
    };
    const lista = ((data ?? []) as unknown as Fila[]).sort((a, b) =>
      b.ventas.fecha.localeCompare(a.ventas.fecha)
    );
    const filas = [
      ["Fecha", "Arete", "SINIIGA", "Clase", "Comprador", "Venta"],
      ...lista.map((f) => [
        f.ventas.fecha,
        f.animales?.arete_control,
        f.animales?.siniga,
        f.animales?.clase,
        f.ventas.comprador,
        f.venta_id,
      ]),
    ];
    return respuestaTabla(formato, filas, archivo, def.etiqueta);
  }

  if (def.fuente === "compras") {
    let q = supabase
      .from("compras")
      .select("*, divisiones(nombre), compra_renglones(clase, cabezas, kilos, precio_kg, precio_cabeza, total)")
      .eq("rancho_id", rancho.id)
      .order("fecha", { ascending: false });
    if (anio) q = q.gte("fecha", `${anio}-01-01`).lte("fecha", `${anio}-12-31`);
    const { data } = await q;
    type Renglon = { clase: string; cabezas: number; kilos: number | null; precio_kg: number | null; precio_cabeza: number | null; total: number };
    const filas: (string | number | null | undefined)[][] = [
      ["Fecha", "Proveedor", "División", "GUIA", "REEMO", "Clase", "Cabezas", "Kilos", "$/kg", "$/cabeza", "Total", "Obs"],
    ];
    for (const c of data ?? []) {
      const renglones = (c.compra_renglones ?? []) as Renglon[];
      for (const r of renglones.length ? renglones : [null]) {
        filas.push([
          c.fecha,
          c.proveedor,
          (c.divisiones as unknown as { nombre: string } | null)?.nombre,
          c.guia,
          c.reemo,
          r?.clase,
          r?.cabezas,
          r?.kilos,
          r?.precio_kg,
          r?.precio_cabeza,
          r?.total,
          c.obs,
        ]);
      }
    }
    return respuestaTabla(formato, filas, archivo, def.etiqueta);
  }

  // Fuente eventos: superset plano de columnas por animal
  let q = supabase
    .from("evento_animales")
    .select(
      "id, animal_id, valores, eventos!inner(id, tipo, fecha, dosis, resultado, obs, detalle, mvz, receta_folio, costo_total, productos(nombre, dias_retiro)), animales(arete_control, siniga)"
    )
    .eq("rancho_id", rancho.id)
    .limit(10000);
  if (def.slug !== "otros") q = q.in("eventos.tipo", def.tiposEvento ?? []);
  if (anio) q = q.gte("eventos.fecha", `${anio}-01-01`).lte("eventos.fecha", `${anio}-12-31`);
  const { data } = await q;

  type Cruda = {
    id: string;
    animal_id: string | null;
    valores: EventoAnimal["valores"];
    eventos: {
      id: string;
      tipo: string;
      fecha: string;
      dosis: string | null;
      resultado: string | null;
      obs: string | null;
      detalle: Record<string, unknown> | null;
      mvz: string | null;
      receta_folio: string | null;
      costo_total: number | null;
      productos: { nombre: string; dias_retiro: number | null } | null;
    };
    animales: { arete_control: string | null; siniga: string | null } | null;
  };
  let crudas = (data ?? []) as unknown as Cruda[];
  if (def.slug === "otros") {
    crudas = crudas.filter(
      (c) => c.eventos.tipo === "otro" || !TIPOS_EVENTO_CONOCIDOS.has(c.eventos.tipo)
    );
  }
  crudas.sort((a, b) => b.eventos.fecha.localeCompare(a.eventos.fecha));

  const porEvento = new Map<string, number>();
  for (const c of crudas) {
    porEvento.set(c.eventos.id, (porEvento.get(c.eventos.id) ?? 0) + 1);
  }

  const retiroHasta = (fecha: string, dias: number | null) => {
    if (dias == null) return null;
    const d = new Date(`${fecha}T12:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  };
  const paricion = (fecha: string, resultado: string | null | undefined) => {
    const m = mesesGestacion(normalizarReproductivo(resultado));
    if (m == null) return null;
    const d = new Date(`${fecha}T12:00:00`);
    d.setMonth(d.getMonth() + (9 - m));
    return d.toISOString().slice(0, 10);
  };

  const filas = [
    [
      "Fecha", "Trabajo", "Arete", "SINIIGA", "Peso (kg)", "GDP (kg/día)",
      "Condición", "Resultado", "Parición estimada", "Evento de pesaje",
      "Producto", "Dosis", "Retiro (días)", "Retiro hasta", "MVZ",
      "Folio receta", "Costo del evento", "Animales en el evento",
      "Costo/cabeza", "Obs del evento", "Obs del animal",
    ],
    ...crudas.map((c) => {
      const n = porEvento.get(c.eventos.id) ?? 1;
      const resultado = c.valores?.resultado ?? c.eventos.resultado;
      return [
        c.eventos.fecha,
        etiquetaTrabajo(c.eventos.tipo),
        c.animales?.arete_control,
        c.animales?.siniga,
        c.valores?.peso,
        c.valores?.gdp,
        c.valores?.condicion,
        resultado ? etiquetaReproductivo(normalizarReproductivo(resultado)) : null,
        paricion(c.eventos.fecha, resultado),
        etiquetaEventoPesaje((c.eventos.detalle?.evento_pesaje as string) ?? null),
        c.eventos.productos?.nombre,
        c.eventos.dosis,
        c.eventos.productos?.dias_retiro,
        retiroHasta(c.eventos.fecha, c.eventos.productos?.dias_retiro ?? null),
        c.eventos.mvz,
        c.eventos.receta_folio,
        c.eventos.costo_total,
        n,
        c.eventos.costo_total != null ? Number(c.eventos.costo_total) / n : null,
        c.eventos.obs,
        c.valores?.obs,
      ];
    }),
  ];
  return respuestaTabla(formato, filas, archivo, def.etiqueta);
}
