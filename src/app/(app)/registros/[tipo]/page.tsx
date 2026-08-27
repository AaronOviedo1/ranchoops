import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { TablaPro, type ColumnaPro } from "@/components/tabla-pro";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import {
  etiquetaEventoPesaje,
  etiquetaReproductivo,
  etiquetaTrabajo,
  formatoFecha,
  formatoMoneda,
  formatoNumero,
  mesesGestacion,
  normalizarReproductivo,
} from "@/lib/catalogos";
import { tipoRegistro, TIPOS_EVENTO_CONOCIDOS } from "@/lib/registros";
import type { EventoAnimal } from "@/lib/tipos";
import { FiltroSelect } from "../../ganado/filtros";

export const metadata = { title: "Registros — RanchOps" };

/** Fila aplanada de un registro por animal (fuente eventos). */
type FilaEvento = {
  id: string;
  fecha: string;
  tipo: string;
  animal_id: string | null;
  arete: string | null;
  siniga: string | null;
  valores: EventoAnimal["valores"];
  dosis: string | null;
  resultado: string | null;
  obs: string | null;
  detalle: Record<string, unknown> | null;
  mvz: string | null;
  producto: string | null;
  dias_retiro: number | null;
  costo_total: number | null;
  cabezasEvento: number;
};

/** Parición estimada: fecha del diagnóstico + los meses que le faltan. */
function paricionEstimada(
  fecha: string,
  resultado: string | null | undefined
): string | null {
  const m = mesesGestacion(normalizarReproductivo(resultado));
  if (m == null) return null;
  const d = new Date(`${fecha}T12:00:00`);
  d.setMonth(d.getMonth() + (9 - m));
  return d.toISOString().slice(0, 10);
}

export default async function RegistroTipoPage({
  params,
  searchParams,
}: PageProps<"/registros/[tipo]">) {
  const { tipo: slug } = await params;
  const sp = await searchParams;
  const def = tipoRegistro(slug);
  if (!def) notFound();

  const rancho = await requireRancho();
  const supabase = await createClient();

  const anioTexto = typeof sp.anio === "string" ? sp.anio : "";
  const anio = /^\d{4}$/.test(anioTexto) ? Number(anioTexto) : null;
  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: 8 }, (_, i) => anioActual - i);

  const encabezado = (
    <PageHeader titulo={def.etiqueta} descripcion={def.descripcion}>
      <Button variant="outline" render={<Link href="/registros" />}>
        <ArrowLeft className="size-4" /> Todos los registros
      </Button>
    </PageHeader>
  );

  const filtroAnio = (
    <div className="mb-4">
      <FiltroSelect
        parametro="anio"
        valor={anio ? String(anio) : ""}
        placeholder="Todos los años"
        opciones={anios.map((a) => ({ valor: String(a), etiqueta: String(a) }))}
      />
    </div>
  );

  const vacio = (
    <EmptyState
      icono={ClipboardList}
      titulo="Sin registros"
      descripcion={
        anio
          ? `Nada capturado en ${anio}. Prueba con otro año.`
          : "Todavía no se captura nada de este tipo."
      }
    />
  );

  // ── Movimientos de potrero ──
  if (def.fuente === "grupo_movimientos") {
    let q = supabase
      .from("grupo_movimientos")
      .select("*, grupos(nombre), potreros(nombre)")
      .eq("rancho_id", rancho.id)
      .order("fecha_entrada", { ascending: false })
      .limit(1000);
    if (anio) {
      q = q.gte("fecha_entrada", `${anio}-01-01`).lte("fecha_entrada", `${anio}-12-31`);
    }
    const { data } = await q;
    type Fila = {
      id: string;
      fecha_entrada: string;
      fecha_salida: string | null;
      num_animales_entrada: number | null;
      num_animales_salida: number | null;
      calif_buniga: number | null;
      residuo: string | null;
      obs: string | null;
      grupos: { nombre: string } | null;
      potreros: { nombre: string } | null;
    };
    const filas = (data ?? []) as unknown as Fila[];
    return (
      <div>
        {encabezado}
        {filtroAnio}
        <TablaPro
          id={`registros-${slug}`}
          datos={filas}
          claveDe={(f) => f.id}
          vacio={vacio}
          exportarHref={`/registros/exportar?tipo=${slug}`}
          agrupables={["potrero", "grupo"]}
          columnas={[
            { clave: "entrada", encabezado: "Entrada", enTarjeta: "titulo", fija: true, celda: (f) => formatoFecha(f.fecha_entrada) },
            { clave: "salida", encabezado: "Salida", celda: (f) => (f.fecha_salida ? formatoFecha(f.fecha_salida) : "sigue ahí") },
            { clave: "grupo", encabezado: "Grupo", enTarjeta: "subtitulo", valorDe: (f) => f.grupos?.nombre, celda: (f) => f.grupos?.nombre ?? "—" },
            { clave: "potrero", encabezado: "Potrero", valorDe: (f) => f.potreros?.nombre, celda: (f) => f.potreros?.nombre ?? "—" },
            { clave: "cabezas", encabezado: "Cabezas", numerica: true, desde: "sm", celda: (f) => f.num_animales_entrada ?? "—" },
            { clave: "buniga", encabezado: "Buñiga", numerica: true, desde: "md", celda: (f) => f.calif_buniga ?? "—" },
            { clave: "residuo", encabezado: "Residuo", desde: "lg", apagada: true, celda: (f) => f.residuo ?? "—" },
            { clave: "obs", encabezado: "Obs", desde: "lg", apagada: true, celda: (f) => f.obs ?? "—" },
          ]}
        />
      </div>
    );
  }

  // ── Ventas por animal ──
  if (def.fuente === "venta_animales") {
    let q = supabase
      .from("venta_animales")
      .select(
        "venta_id, animal_id, ventas!inner(id, fecha, comprador), animales(arete_control, siniga, clase)"
      )
      .eq("rancho_id", rancho.id)
      .limit(2000);
    if (anio) {
      q = q.gte("ventas.fecha", `${anio}-01-01`).lte("ventas.fecha", `${anio}-12-31`);
    }
    const { data } = await q;
    type Fila = {
      venta_id: string;
      animal_id: string;
      ventas: { id: string; fecha: string; comprador: string | null };
      animales: { arete_control: string | null; siniga: string | null; clase: string } | null;
    };
    const filas = ((data ?? []) as unknown as Fila[]).sort((a, b) =>
      b.ventas.fecha.localeCompare(a.ventas.fecha)
    );

    // Precio aproximado: el renglón de su clase en esa venta, prorrateado.
    const ventaIds = [...new Set(filas.map((f) => f.venta_id))];
    const { data: renglones } = ventaIds.length
      ? await supabase
          .from("venta_renglones")
          .select("venta_id, clase, cabezas, precio_cabeza, total")
          .in("venta_id", ventaIds)
      : { data: [] };
    const precioDe = (ventaId: string, clase: string | undefined) => {
      const r = (renglones ?? []).find(
        (x) => x.venta_id === ventaId && x.clase === clase
      );
      if (!r) return null;
      return r.precio_cabeza ?? (r.cabezas > 0 ? Number(r.total) / r.cabezas : null);
    };

    return (
      <div>
        {encabezado}
        {filtroAnio}
        <TablaPro
          id={`registros-${slug}`}
          datos={filas}
          claveDe={(f) => `${f.venta_id}-${f.animal_id}`}
          hrefDe={(f) => `/ventas/${f.venta_id}`}
          vacio={vacio}
          exportarHref={`/registros/exportar?tipo=${slug}`}
          agrupables={["comprador", "clase"]}
          columnas={[
            { clave: "fecha", encabezado: "Fecha", enTarjeta: "titulo", fija: true, celda: (f) => formatoFecha(f.ventas.fecha) },
            { clave: "arete", encabezado: "Arete", enTarjeta: "subtitulo", fija: true, celda: (f) => `#${f.animales?.arete_control ?? "s/n"}` },
            { clave: "siniga", encabezado: "SINIIGA", desde: "md", apagada: true, celda: (f) => f.animales?.siniga ?? "—" },
            { clave: "clase", encabezado: "Clase", valorDe: (f) => f.animales?.clase, celda: (f) => f.animales?.clase ?? "—" },
            { clave: "comprador", encabezado: "Comprador", desde: "sm", valorDe: (f) => f.ventas.comprador, celda: (f) => f.ventas.comprador ?? "—" },
            {
              clave: "precio",
              encabezado: "Precio/cabeza (aprox)",
              numerica: true,
              desde: "sm",
              celda: (f) => {
                const p = precioDe(f.venta_id, f.animales?.clase);
                return p != null ? formatoMoneda(p) : "—";
              },
            },
          ]}
        />
        <p className="mt-4 text-xs text-muted-foreground">
          El precio por cabeza se aproxima con el renglón de la clase del
          animal en esa venta; el detalle exacto vive en la venta.
        </p>
      </div>
    );
  }

  // ── Compras ──
  if (def.fuente === "compras") {
    let q = supabase
      .from("compras")
      .select("*, divisiones(nombre), compra_renglones(cabezas, total)")
      .eq("rancho_id", rancho.id)
      .order("fecha", { ascending: false })
      .limit(500);
    if (anio) q = q.gte("fecha", `${anio}-01-01`).lte("fecha", `${anio}-12-31`);
    const { data } = await q;
    type Fila = {
      id: string;
      fecha: string;
      proveedor: string | null;
      obs: string | null;
      divisiones: { nombre: string } | null;
      compra_renglones: { cabezas: number; total: number }[];
    };
    const filas = (data ?? []) as unknown as Fila[];
    return (
      <div>
        {encabezado}
        {filtroAnio}
        <TablaPro
          id={`registros-${slug}`}
          datos={filas}
          claveDe={(f) => f.id}
          hrefDe={(f) => `/compras/${f.id}`}
          vacio={vacio}
          exportarHref={`/registros/exportar?tipo=${slug}`}
          agrupables={["proveedor"]}
          columnas={[
            { clave: "fecha", encabezado: "Fecha", enTarjeta: "titulo", fija: true, celda: (f) => formatoFecha(f.fecha) },
            { clave: "proveedor", encabezado: "Proveedor", enTarjeta: "subtitulo", valorDe: (f) => f.proveedor, celda: (f) => f.proveedor ?? "—" },
            { clave: "cabezas", encabezado: "Cabezas", numerica: true, celda: (f) => f.compra_renglones.reduce((s, r) => s + r.cabezas, 0) },
            { clave: "total", encabezado: "Total", numerica: true, celda: (f) => formatoMoneda(f.compra_renglones.reduce((s, r) => s + Number(r.total), 0)) },
            { clave: "division", encabezado: "División", desde: "sm", celda: (f) => f.divisiones?.nombre ?? "—" },
            { clave: "obs", encabezado: "Obs", desde: "lg", apagada: true, celda: (f) => f.obs ?? "—" },
          ]}
        />
      </div>
    );
  }

  // ── Fuente eventos: un renglón por animal ──
  const tiposBuscados = def.tiposEvento ?? [];
  let q = supabase
    .from("evento_animales")
    .select(
      "id, animal_id, valores, eventos!inner(id, tipo, fecha, dosis, resultado, obs, detalle, mvz, costo_total, productos(nombre, dias_retiro)), animales(arete_control, siniga)"
    )
    .eq("rancho_id", rancho.id)
    .limit(2000);
  if (slug !== "otros") {
    q = q.in("eventos.tipo", tiposBuscados);
  }
  if (anio) {
    q = q.gte("eventos.fecha", `${anio}-01-01`).lte("eventos.fecha", `${anio}-12-31`);
  }
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
      costo_total: number | null;
      productos: { nombre: string; dias_retiro: number | null } | null;
    };
    animales: { arete_control: string | null; siniga: string | null } | null;
  };
  let crudas = (data ?? []) as unknown as Cruda[];
  if (slug === "otros") {
    // La cubeta: "otro" más cualquier tipo que nadie declaró.
    crudas = crudas.filter(
      (c) =>
        c.eventos.tipo === "otro" || !TIPOS_EVENTO_CONOCIDOS.has(c.eventos.tipo)
    );
  }

  // Cuántos animales tocó cada evento (para el costo por cabeza)
  const porEvento = new Map<string, number>();
  for (const c of crudas) {
    porEvento.set(c.eventos.id, (porEvento.get(c.eventos.id) ?? 0) + 1);
  }

  let filas: FilaEvento[] = crudas
    .map((c) => ({
      id: c.id,
      fecha: c.eventos.fecha,
      tipo: c.eventos.tipo,
      animal_id: c.animal_id,
      arete: c.animales?.arete_control ?? null,
      siniga: c.animales?.siniga ?? null,
      valores: c.valores,
      dosis: c.eventos.dosis,
      resultado: c.eventos.resultado,
      obs: c.eventos.obs,
      detalle: c.eventos.detalle,
      mvz: c.eventos.mvz,
      producto: c.eventos.productos?.nombre ?? null,
      dias_retiro: c.eventos.productos?.dias_retiro ?? null,
      costo_total: c.eventos.costo_total,
      cabezasEvento: porEvento.get(c.eventos.id) ?? 1,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  // Nacimientos: quedarse con el renglón de la madre y resolver la cría.
  const areteCria = new Map<string, string | null>();
  if (slug === "nacimientos") {
    filas = filas.filter((f) => {
      const cria = f.detalle?.cria_id;
      return typeof cria !== "string" || cria !== f.animal_id;
    });
    const criaIds = [
      ...new Set(
        filas
          .map((f) => f.detalle?.cria_id)
          .filter((v): v is string => typeof v === "string")
      ),
    ];
    if (criaIds.length > 0) {
      const { data: crias } = await supabase
        .from("animales")
        .select("id, arete_control")
        .in("id", criaIds);
      for (const c of crias ?? []) areteCria.set(c.id, c.arete_control);
    }
  }

  const colAnimal: ColumnaPro<FilaEvento>[] = [
    {
      clave: "fecha",
      encabezado: "Fecha",
      enTarjeta: "titulo",
      fija: true,
      celda: (f) => formatoFecha(f.fecha),
    },
    {
      clave: "arete",
      encabezado: slug === "nacimientos" ? "Madre" : "Arete",
      enTarjeta: "subtitulo",
      fija: true,
      celda: (f) => `#${f.arete ?? "s/n"}`,
    },
    {
      clave: "siniga",
      encabezado: "SINIIGA",
      desde: "md",
      apagada: true,
      celda: (f) => (
        <span className="font-mono text-xs text-muted-foreground">
          {f.siniga ?? "—"}
        </span>
      ),
    },
  ];

  const porSlug: Record<string, ColumnaPro<FilaEvento>[]> = {
    pesajes: [
      { clave: "peso", encabezado: "Peso (kg)", numerica: true, celda: (f) => f.valores?.peso ?? "—" },
      { clave: "gdp", encabezado: "GDP (kg/día)", numerica: true, desde: "sm", celda: (f) => (f.valores?.gdp != null ? formatoNumero(f.valores.gdp, 2) : "—") },
      { clave: "evento", encabezado: "Evento", desde: "sm", valorDe: (f) => etiquetaEventoPesaje((f.detalle?.evento_pesaje as string) ?? null), celda: (f) => etiquetaEventoPesaje((f.detalle?.evento_pesaje as string) ?? null) },
    ],
    condicion: [
      { clave: "condicion", encabezado: "Condición (1-5)", numerica: true, celda: (f) => f.valores?.condicion ?? "—" },
    ],
    tratamientos: [
      { clave: "trabajo", encabezado: "Trabajo", valorDe: (f) => etiquetaTrabajo(f.tipo), celda: (f) => etiquetaTrabajo(f.tipo) },
      { clave: "producto", encabezado: "Producto", desde: "sm", valorDe: (f) => f.producto, celda: (f) => f.producto ?? "—" },
      { clave: "dosis", encabezado: "Dosis", desde: "md", celda: (f) => f.dosis ?? "—" },
      {
        clave: "retiro",
        encabezado: "Retiro",
        desde: "sm",
        celda: (f) => {
          if (f.dias_retiro == null) return "—";
          const hasta = new Date(`${f.fecha}T12:00:00`);
          hasta.setDate(hasta.getDate() + f.dias_retiro);
          const vivo = hasta >= new Date();
          return (
            <span className={vivo ? "font-medium text-alerta-fuerte" : undefined}>
              {f.dias_retiro} días · hasta {formatoFecha(hasta.toISOString().slice(0, 10))}
            </span>
          );
        },
      },
      { clave: "mvz", encabezado: "MVZ", desde: "lg", apagada: true, celda: (f) => f.mvz ?? "—" },
      {
        clave: "costo",
        encabezado: "Costo/cabeza",
        numerica: true,
        desde: "lg",
        apagada: true,
        celda: (f) =>
          f.costo_total != null
            ? formatoMoneda(Number(f.costo_total) / f.cabezasEvento)
            : "—",
      },
    ],
    alimentacion: [
      { clave: "producto", encabezado: "Producto", valorDe: (f) => f.producto, celda: (f) => f.producto ?? "—" },
      { clave: "dosis", encabezado: "Cantidad", desde: "sm", celda: (f) => f.dosis ?? "—" },
      { clave: "costo", encabezado: "Costo/cabeza", numerica: true, desde: "md", celda: (f) => (f.costo_total != null ? formatoMoneda(Number(f.costo_total) / f.cabezasEvento) : "—") },
    ],
    nacimientos: [
      {
        clave: "cria",
        encabezado: "Cría",
        celda: (f) => {
          const id = f.detalle?.cria_id;
          const arete = typeof id === "string" ? areteCria.get(id) : null;
          return typeof id === "string" ? (
            <Link href={`/ganado/${id}`} className="underline underline-offset-2">
              #{arete ?? "s/n"}
            </Link>
          ) : (
            "—"
          );
        },
      },
      { clave: "dificultad", encabezado: "Dificultad", desde: "sm", apagada: true, celda: (f) => (f.detalle?.dificultad as string) ?? "—" },
      { clave: "malparto", encabezado: "Malparto", desde: "sm", apagada: true, celda: (f) => (f.detalle?.malparto ? "sí" : "no") },
    ],
    destetes: [
      { clave: "peso", encabezado: "Peso al destete (kg)", numerica: true, celda: (f) => f.valores?.peso ?? "—" },
      { clave: "gdp", encabezado: "GDP (kg/día)", numerica: true, desde: "sm", celda: (f) => (f.valores?.gdp != null ? formatoNumero(f.valores.gdp, 2) : "—") },
    ],
    reproduccion: [
      { clave: "trabajo", encabezado: "Trabajo", desde: "sm", valorDe: (f) => etiquetaTrabajo(f.tipo), celda: (f) => etiquetaTrabajo(f.tipo) },
      {
        clave: "resultado",
        encabezado: "Resultado",
        valorDe: (f) => etiquetaReproductivo(normalizarReproductivo(f.valores?.resultado ?? f.resultado)),
        celda: (f) => etiquetaReproductivo(normalizarReproductivo(f.valores?.resultado ?? f.resultado)),
      },
      {
        clave: "paricion",
        encabezado: "Parición estimada",
        desde: "sm",
        celda: (f) => {
          const p = paricionEstimada(f.fecha, f.valores?.resultado ?? f.resultado);
          return p ? formatoFecha(p) : "—";
        },
      },
    ],
    servicios: [
      { clave: "trabajo", encabezado: "Trabajo", valorDe: (f) => etiquetaTrabajo(f.tipo), celda: (f) => etiquetaTrabajo(f.tipo) },
      { clave: "producto", encabezado: "Producto / semental", desde: "sm", celda: (f) => f.producto ?? (f.detalle?.semental as string) ?? "—" },
    ],
    identificacion: [
      { clave: "trabajo", encabezado: "Trabajo", valorDe: (f) => etiquetaTrabajo(f.tipo), celda: (f) => etiquetaTrabajo(f.tipo) },
    ],
    muertes: [
      { clave: "causa", encabezado: "Causa", valorDe: (f) => f.resultado ?? f.obs, celda: (f) => f.resultado ?? f.obs ?? "—" },
    ],
    otros: [
      { clave: "trabajo", encabezado: "Trabajo", valorDe: (f) => etiquetaTrabajo(f.tipo), celda: (f) => etiquetaTrabajo(f.tipo) },
      { clave: "resultado", encabezado: "Resultado", desde: "sm", celda: (f) => f.resultado ?? "—" },
    ],
  };

  const colObs: ColumnaPro<FilaEvento>[] = [
    {
      clave: "obs",
      encabezado: "Obs",
      desde: "lg",
      apagada: true,
      celda: (f) => f.valores?.obs ?? f.obs ?? "—",
    },
  ];

  return (
    <div>
      {encabezado}
      {filtroAnio}
      <TablaPro
        id={`registros-${slug}`}
        datos={filas}
        claveDe={(f) => f.id}
        hrefDe={(f) => (f.animal_id ? `/ganado/${f.animal_id}` : "/registros")}
        vacio={vacio}
        exportarHref={`/registros/exportar?tipo=${slug}`}
        agrupables={porSlug[slug]?.filter((c) => c.valorDe).map((c) => c.clave) ?? []}
        columnas={[...colAnimal, ...(porSlug[slug] ?? []), ...colObs]}
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Aquí aparece lo capturado animal por animal. Los trabajos a nivel de
        grupo sin lista de animales se consultan en Trabajos.
      </p>
    </div>
  );
}
