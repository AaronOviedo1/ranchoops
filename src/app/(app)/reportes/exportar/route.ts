import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { etiquetaTrabajo } from "@/lib/catalogos";

function csv(filas: (string | number | null | undefined)[][]): string {
  return (
    "﻿" + // BOM para que Excel abra acentos bien
    filas
      .map((fila) =>
        fila
          .map((celda) => {
            const v = celda == null ? "" : String(celda);
            return /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
          })
          .join(",")
      )
      .join("\n")
  );
}

export async function GET(request: NextRequest) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const tipo = request.nextUrl.searchParams.get("tipo") ?? "ganado";

  if (tipo === "ganado") {
    const { data } = await supabase
      .from("animales")
      .select("*, grupos(nombre), divisiones(nombre)")
      .eq("rancho_id", rancho.id)
      .order("arete_control");

    const filas: (string | number | null)[][] = [
      [
        "Arete control", "SINIIGA", "Nombre", "Sexo", "Clase", "Raza",
        "Fecha nacimiento", "Peso nacimiento", "Procedencia", "Padre/semental",
        "Grupo", "División", "Status", "Status reproductivo", "Fecha salida",
        "Causa salida", "Notas",
      ],
      ...(data ?? []).map((a) => [
        a.arete_control, a.siniga, a.nombre, a.sexo, a.clase, a.raza,
        a.fecha_nacimiento, a.peso_nacimiento, a.procedencia, a.padre_texto,
        (a.grupos as unknown as { nombre: string } | null)?.nombre ?? "",
        (a.divisiones as unknown as { nombre: string } | null)?.nombre ?? "",
        a.status, a.status_reproductivo, a.fecha_salida, a.causa_salida, a.notas,
      ]),
    ];

    return new NextResponse(csv(filas), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inventario-ganado.csv"`,
      },
    });
  }

  // Reporte mensual
  const mesParam = request.nextUrl.searchParams.get("mes");
  const mes =
    mesParam && /^\d{4}-\d{2}$/.test(mesParam)
      ? mesParam
      : new Date().toISOString().slice(0, 7);
  const inicio = `${mes}-01`;
  const fin = `${mes}-31`;

  const [{ data: activos }, { data: eventos }, { data: renglones }, { data: gastos }, { data: lluvias }] =
    await Promise.all([
      supabase.from("animales").select("clase").eq("rancho_id", rancho.id).eq("status", "activo"),
      supabase
        .from("eventos")
        .select("tipo, fecha, obs, resultado, evento_animales(count)")
        .eq("rancho_id", rancho.id)
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha"),
      supabase
        .from("venta_renglones")
        .select("clase, cabezas, total, ventas!inner(fecha)")
        .eq("rancho_id", rancho.id)
        .gte("ventas.fecha", inicio)
        .lte("ventas.fecha", fin),
      supabase
        .from("gastos")
        .select("fecha, concepto, categoria, proveedor, monto")
        .eq("rancho_id", rancho.id)
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha"),
      supabase
        .from("lluvias")
        .select("fecha, cantidad, pluviometros(nombre)")
        .eq("rancho_id", rancho.id)
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha"),
    ]);

  const porClase = new Map<string, number>();
  for (const a of activos ?? []) porClase.set(a.clase, (porClase.get(a.clase) ?? 0) + 1);

  const filas: (string | number | null)[][] = [
    [`Reporte mensual ${mes} — ${rancho.nombre}`],
    [],
    ["INVENTARIO ACTUAL POR CLASE"],
    ...[...porClase.entries()].map(([c, n]) => [c, n]),
    ["Total", (activos ?? []).length],
    [],
    ["EVENTOS DEL MES", "Fecha", "Animales", "Detalle"],
    ...(eventos ?? []).map((e) => [
      etiquetaTrabajo(e.tipo),
      e.fecha,
      (e.evento_animales as { count: number }[])?.[0]?.count ?? 0,
      e.obs ?? e.resultado ?? "",
    ]),
    [],
    ["VENTAS DEL MES", "Clase", "Cabezas", "Total"],
    ...(renglones ?? []).map((r) => [
      "",
      r.clase,
      r.cabezas,
      Number(r.total),
    ]),
    [],
    ["GASTOS DEL MES", "Fecha", "Categoría", "Proveedor", "Monto"],
    ...(gastos ?? []).map((g) => [g.concepto, g.fecha, g.categoria, g.proveedor, Number(g.monto)]),
    [],
    ["LLUVIAS DEL MES", "Fecha", "Pluviómetro", "Cantidad"],
    ...(lluvias ?? []).map((l) => [
      "",
      l.fecha,
      (l.pluviometros as unknown as { nombre: string } | null)?.nombre ?? "",
      Number(l.cantidad),
    ]),
  ];

  return new NextResponse(csv(filas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${mes}.csv"`,
    },
  });
}
