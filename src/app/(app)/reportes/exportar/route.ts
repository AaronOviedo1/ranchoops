import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  etiquetaClase,
  etiquetaReproductivo,
  etiquetaTrabajo,
} from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";
import { respuestaCsv, respuestaXlsx, type Hoja } from "@/lib/exportar";

export async function GET(request: NextRequest) {
  const { rancho } = await requireAdmin();
  const supabase = await createClient();
  const tipo = request.nextUrl.searchParams.get("tipo") ?? "ganado";

  // "Que no me haya miedo la raza de que lo dejé de usar": todo el rancho en
  // un Excel de varias hojas, cuando quieran y sin pedir permiso.
  if (tipo === "todo") {
    const consulta = (tabla: string, columnas: string, orden?: string) => {
      const q = supabase.from(tabla).select(columnas).eq("rancho_id", rancho.id);
      return orden ? q.order(orden) : q;
    };

    const [
      animales,
      grupos,
      potreros,
      divisiones,
      eventos,
      eventoAnimales,
      movimientos,
      lluvias,
      pluviometros,
      productos,
      inventario,
      gastos,
      ventas,
      renglones,
      infraestructura,
    ] = await Promise.all([
      consulta("animales", "*, grupos(nombre), divisiones(nombre)", "arete_control"),
      consulta("grupos", "*, divisiones(nombre), potreros:potrero_actual_id(nombre)", "nombre"),
      consulta("potreros", "id, nombre, superficie_has, tipo_vegetacion, capacidad_estimada, activo, notas", "nombre"),
      consulta("divisiones", "id, nombre, descripcion, activo", "nombre"),
      consulta("eventos", "*, grupos(nombre), productos(nombre)", "fecha"),
      consulta("evento_animales", "evento_id, animal_id, valores"),
      consulta("grupo_movimientos", "*, grupos(nombre), potreros(nombre)", "fecha_entrada"),
      consulta("lluvias", "*, pluviometros(nombre)", "fecha"),
      consulta("pluviometros", "id, nombre, activo", "nombre"),
      consulta("productos", "id, nombre, tipo, unidad, contenido_kg, costo_unitario, stock_minimo, proveedor, controlado, activo", "nombre"),
      consulta("inventario_movimientos", "*, productos(nombre)", "fecha"),
      consulta("gastos", "*, divisiones(nombre), grupos(nombre)", "fecha"),
      consulta("ventas", "*, divisiones(nombre)", "fecha"),
      consulta("venta_renglones", "*"),
      consulta("infraestructura", "id, nombre, tipo, capacidad, capacidad_actual, notas", "nombre"),
    ]);

    const nombreDe = (v: unknown) =>
      (v as { nombre?: string } | null)?.nombre ?? "";

    // PostgREST no tipa los joins sin genéricos; el resto del proyecto hace lo mismo.
    const filas = (res: { data: unknown }): Record<string, unknown>[] =>
      (res.data ?? []) as Record<string, unknown>[];

    const hojas: Hoja[] = [];
    const hoja = (nombre: string, filas: Record<string, unknown>[]) => {
      hojas.push({ nombre, filas });
    };

    hoja(
      "Ganado",
      filas(animales).map((a: Record<string, unknown>) => ({
        Arete: a.arete_control,
        SINIIGA: a.siniga,
        Nombre: a.nombre,
        Especie: a.especie,
        Clase: etiquetaClase(String(a.clase ?? "")),
        Sexo: a.sexo,
        Raza: a.raza,
        "Color de pelaje": a.color_pelaje,
        Nacimiento: a.fecha_nacimiento,
        "Peso al nacer": a.peso_nacimiento,
        "Peso al destete": a.peso_destete,
        "Fecha de destete": a.fecha_destete,
        Procedencia: a.procedencia,
        Semental: a.padre_texto,
        Grupo: nombreDe(a.grupos),
        División: nombreDe(a.divisiones),
        Status: a.status,
        "Estado reproductivo": etiquetaReproductivo(
          a.status_reproductivo as string | null
        ),
        "Fecha de salida": a.fecha_salida,
        "Causa de salida": a.causa_salida,
        Notas: a.notas,
      }))
    );

    hoja(
      "Grupos",
      filas(grupos).map((g: Record<string, unknown>) => ({
        Grupo: g.nombre,
        División: nombreDe(g.divisiones),
        "Potrero actual": nombreDe(g.potreros),
        Activo: g.activo ? "sí" : "no",
        Notas: g.notas,
      }))
    );

    hoja("Potreros", filas(potreros));
    hoja("Divisiones", filas(divisiones));

    hoja(
      "Trabajos",
      filas(eventos).map((e: Record<string, unknown>) => ({
        Fecha: e.fecha,
        Trabajo: etiquetaTrabajo(String(e.tipo ?? "")),
        Grupo: nombreDe(e.grupos),
        Producto: nombreDe(e.productos),
        Cantidad: e.cantidad,
        Dosis: e.dosis,
        Responsable: e.responsable,
        MVZ: e.mvz,
        "Folio de receta": e.receta_folio,
        Resultado: e.resultado,
        Costo: e.costo_total,
        Jornada: e.sesion_id,
        Observaciones: e.obs,
      }))
    );

    hoja(
      "Trabajos por animal",
      filas(eventoAnimales).map((ea: Record<string, unknown>) => {
        const v = (ea.valores ?? {}) as Record<string, unknown>;
        return {
          Evento: ea.evento_id,
          Animal: ea.animal_id,
          Peso: v.peso,
          "Ganancia diaria": v.gdp,
          Resultado: v.resultado,
          Destino: v.destino,
          Observaciones: v.obs,
        };
      })
    );

    hoja(
      "Movimientos de potrero",
      filas(movimientos).map((m: Record<string, unknown>) => ({
        Grupo: nombreDe(m.grupos),
        Potrero: nombreDe(m.potreros),
        Entrada: m.fecha_entrada,
        Salida: m.fecha_salida,
        "Animales entrada": m.num_animales_entrada,
        "Animales salida": m.num_animales_salida,
        Buñiga: m.calif_buniga,
        Residuo: m.residuo,
        Observaciones: m.obs,
      }))
    );

    hoja(
      "Lluvias",
      filas(lluvias).map((l: Record<string, unknown>) => ({
        Fecha: l.fecha,
        Pluviómetro: nombreDe(l.pluviometros),
        Cantidad: l.cantidad,
        Unidad: rancho.unidad_lluvia,
        Observaciones: l.obs,
      }))
    );
    hoja("Pluviómetros", filas(pluviometros));
    hoja("Productos", filas(productos));

    hoja(
      "Inventario",
      filas(inventario).map((m: Record<string, unknown>) => ({
        Fecha: m.fecha,
        Producto: nombreDe(m.productos),
        Movimiento: m.tipo,
        Cantidad: m.cantidad,
        "Costo unitario": m.costo_unitario,
        "Costo total": m.costo_total,
        Proveedor: m.proveedor,
        Observaciones: m.obs,
      }))
    );

    hoja(
      "Costos",
      filas(gastos).map((g: Record<string, unknown>) => ({
        Fecha: g.fecha,
        Concepto: g.concepto,
        Categoría: g.categoria,
        Monto: g.monto,
        Proveedor: g.proveedor,
        División: nombreDe(g.divisiones),
        Grupo: nombreDe(g.grupos),
        Animales: g.num_animales,
        Observaciones: g.obs,
      }))
    );

    hoja(
      "Ventas",
      filas(ventas).map((v: Record<string, unknown>) => ({
        Folio: v.id,
        Fecha: v.fecha,
        Comprador: v.comprador,
        GUIA: v.guia,
        REEMO: v.reemo,
        División: nombreDe(v.divisiones),
        Observaciones: v.obs,
      }))
    );

    hoja(
      "Ventas por renglón",
      filas(renglones).map((r: Record<string, unknown>) => ({
        Venta: r.venta_id,
        Clase: r.clase,
        Cabezas: r.cabezas,
        "Kilos salida": r.kilos_salida,
        "Kilos venta": r.kilos_venta,
        "Precio por kilo": r.precio_kg,
        "Precio por cabeza": r.precio_cabeza,
        Total: r.total,
      }))
    );

    hoja("Infraestructura", filas(infraestructura));

    const archivo = `ranchops-${rancho.nombre.replace(/[^\w]+/g, "-").toLowerCase()}-${fechaHoy()}.xlsx`;
    return respuestaXlsx(hojas, archivo);
  }

  if (tipo === "ganado") {
    const { data } = await supabase
      .from("animales")
      .select("*, grupos(nombre), divisiones(nombre)")
      .eq("rancho_id", rancho.id)
      .order("arete_control");

    const filas: (string | number | null)[][] = [
      [
        "Arete control", "SINIIGA", "Nombre", "Sexo", "Clase", "Raza",
        "Color de pelaje", "Fecha nacimiento", "Peso nacimiento",
        "Procedencia", "Padre/semental",
        "Grupo", "División", "Status", "Status reproductivo", "Fecha salida",
        "Causa salida", "Notas",
      ],
      ...(data ?? []).map((a) => [
        a.arete_control, a.siniga, a.nombre, a.sexo, a.clase, a.raza,
        a.color_pelaje, a.fecha_nacimiento, a.peso_nacimiento,
        a.procedencia, a.padre_texto,
        (a.grupos as unknown as { nombre: string } | null)?.nombre ?? "",
        (a.divisiones as unknown as { nombre: string } | null)?.nombre ?? "",
        a.status, a.status_reproductivo, a.fecha_salida, a.causa_salida, a.notas,
      ]),
    ];

    return respuestaCsv(filas, "inventario-ganado.csv");
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

  return respuestaCsv(filas, `reporte-${mes}.csv`);
}
