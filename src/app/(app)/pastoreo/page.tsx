import { Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { TablaPro } from "@/components/tabla-pro";
import { GraficaSerieMes } from "@/components/graficas/grafica-serie-mes";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoNumero } from "@/lib/catalogos";
import { uaTotal } from "@/lib/dse";
import type { PastoreoMes, PotreroCarga, PotreroEstado } from "@/lib/tipos";
import { FiltroSelect } from "../ganado/filtros";

export const metadata = { title: "Pastoreo — RanchOps" };

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * Carga animal contra lluvia, al estilo de los reportes de pastoreo de las
 * plataformas grandes pero hablado a la mexicana: UA, cabezas-día y
 * hectáreas por UA. Nada de esto mueve ganado: nomás enseña.
 */
export default async function PastoreoPage({
  searchParams,
}: PageProps<"/pastoreo">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const texto = (s: unknown) => (typeof s === "string" ? s.trim() : "");
  const potreroFiltro = texto(sp.potrero);
  const anioActual = new Date().getFullYear();
  const anio = /^\d{4}$/.test(texto(sp.anio)) ? Number(texto(sp.anio)) : anioActual;

  let qMensual = supabase
    .from("v_pastoreo_mensual")
    .select("*")
    .eq("rancho_id", rancho.id)
    .gte("mes", `${anio}-01-01`)
    .lte("mes", `${anio}-12-31`);
  if (potreroFiltro) qMensual = qMensual.eq("potrero_id", potreroFiltro);

  let qMovs = supabase
    .from("grupo_movimientos")
    .select("potrero_id, fecha_entrada, calif_buniga")
    .eq("rancho_id", rancho.id)
    .gte("fecha_entrada", `${anio}-01-01`)
    .lte("fecha_entrada", `${anio}-12-31`);
  if (potreroFiltro) qMovs = qMovs.eq("potrero_id", potreroFiltro);

  const [
    { data: mensual },
    { data: estados },
    { data: cargas },
    { data: potreros },
    { data: lluvias },
    { count: pluviometros },
    { data: animales },
    { data: movsAnio },
  ] = await Promise.all([
    qMensual,
    supabase.from("v_potrero_estado").select("*").eq("rancho_id", rancho.id).order("nombre"),
    supabase.from("v_potrero_carga").select("*").eq("rancho_id", rancho.id),
    supabase
      .from("potreros")
      .select("id, nombre, capacidad_estimada")
      .eq("rancho_id", rancho.id)
      .eq("activo", true),
    supabase
      .from("lluvias")
      .select("fecha, cantidad, pluviometro_id")
      .eq("rancho_id", rancho.id)
      .gte("fecha", `${anio}-01-01`)
      .lte("fecha", `${anio}-12-31`),
    supabase
      .from("pluviometros")
      .select("id", { count: "exact", head: true })
      .eq("rancho_id", rancho.id)
      .eq("activo", true),
    supabase
      .from("animales")
      .select("grupo_id, especie, clase, categoria_dse")
      .eq("rancho_id", rancho.id)
      .eq("status", "activo"),
    qMovs,
  ]);

  const listaEstados = ((estados ?? []) as PotreroEstado[]).filter(
    (p) => !potreroFiltro || p.potrero_id === potreroFiltro
  );
  const carga = new Map(
    ((cargas ?? []) as PotreroCarga[]).map((c) => [c.potrero_id, c])
  );
  const capacidad = new Map((potreros ?? []).map((p) => [p.id, p.capacidad_estimada]));

  // Factor UA promedio por grupo (con lo que el grupo trae hoy). Cuando el
  // grupo ya no existe o está vacío, se usa el promedio del rancho.
  const porGrupo = new Map<string, { ua: number; n: number }>();
  for (const a of animales ?? []) {
    if (!a.grupo_id) continue;
    const acc = porGrupo.get(a.grupo_id) ?? { ua: 0, n: 0 };
    acc.ua += uaTotal([a]);
    acc.n += 1;
    porGrupo.set(a.grupo_id, acc);
  }
  const uaRancho = uaTotal(animales ?? []);
  const factorRancho = (animales ?? []).length > 0 ? uaRancho / (animales ?? []).length : 1;
  const factorDe = (grupoId: string) => {
    const g = porGrupo.get(grupoId);
    return g && g.n > 0 ? g.ua / g.n : factorRancho;
  };

  // --- Serie mensual: UA-día (por ha si hay superficie) contra lluvia ---
  const filasMes = (mensual ?? []) as PastoreoMes[];
  const uaDiaMes = new Array(12).fill(0);
  const cabezasDiaMes = new Array(12).fill(0);
  for (const f of filasMes) {
    const i = Number(f.mes.slice(5, 7)) - 1;
    if (i < 0 || i > 11) continue;
    cabezasDiaMes[i] += Number(f.cabezas_dia);
    uaDiaMes[i] += Number(f.cabezas_dia) * factorDe(f.grupo_id);
  }

  const hasFiltradas = listaEstados.reduce((s, p) => s + (p.superficie_has ?? 0), 0);

  type FilaLluvia = { cantidad: number; pluviometro_id: string; fecha: string };
  const filasLluvia = (lluvias ?? []) as FilaLluvia[];
  const nPluv = pluviometros || new Set(filasLluvia.map((f) => f.pluviometro_id)).size || 1;
  const lluviaMes = new Array(12).fill(0);
  for (const f of filasLluvia) {
    const i = Number(f.fecha.slice(5, 7)) - 1;
    if (i >= 0 && i <= 11) lluviaMes[i] += Number(f.cantidad) / nPluv;
  }
  const unidadLluvia = rancho.unidad_lluvia === "mm" ? "mm" : '"';
  const lluviaAnio = lluviaMes.reduce((s, v) => s + v, 0);
  const lluviaMm = rancho.unidad_lluvia === "mm" ? lluviaAnio : lluviaAnio * 25.4;

  const datos = MESES.map((m, i) => ({
    mes: m,
    carga: Number((hasFiltradas > 0 ? uaDiaMes[i] / hasFiltradas : uaDiaMes[i]).toFixed(2)),
    lluvia: Number(lluviaMes[i].toFixed(2)),
  }));
  const hayDatos = filasMes.length > 0 || filasLluvia.length > 0;

  // --- KPIs del año ---
  const uaDiaAnio = uaDiaMes.reduce((s, v) => s + v, 0);
  const uaDiaPorHa = hasFiltradas > 0 ? uaDiaAnio / hasFiltradas : null;
  const porCienMm =
    uaDiaPorHa != null && lluviaMm > 0 ? uaDiaPorHa / (lluviaMm / 100) : null;

  const uaActual = potreroFiltro
    ? Number(carga.get(potreroFiltro)?.ua ?? 0)
    : [...carga.values()].reduce((s, c) => s + Number(c.ua), 0);
  const hasPorUA = uaActual > 0 && hasFiltradas > 0 ? hasFiltradas / uaActual : null;

  // Referencia: la capacidad estimada capturada por potrero, ocupada el año entero.
  const capacidadFiltrada = listaEstados.reduce(
    (s, p) => s + (capacidad.get(p.potrero_id) ?? 0),
    0
  );
  const referenciaDiaHa =
    capacidadFiltrada > 0 && hasFiltradas > 0
      ? (capacidadFiltrada * factorRancho * 365) / hasFiltradas
      : null;

  // --- Tabla por potrero ---
  const porPotrero = new Map<
    string,
    { dias: number; cabezasDia: number; uaDia: number }
  >();
  for (const f of filasMes) {
    const acc = porPotrero.get(f.potrero_id) ?? { dias: 0, cabezasDia: 0, uaDia: 0 };
    acc.dias += Number(f.dias_ocupado);
    acc.cabezasDia += Number(f.cabezas_dia);
    acc.uaDia += Number(f.cabezas_dia) * factorDe(f.grupo_id);
    porPotrero.set(f.potrero_id, acc);
  }
  const veces = new Map<string, { n: number; buniga: number[] }>();
  for (const m of movsAnio ?? []) {
    const acc = veces.get(m.potrero_id) ?? { n: 0, buniga: [] };
    acc.n += 1;
    if (m.calif_buniga != null) acc.buniga.push(Number(m.calif_buniga));
    veces.set(m.potrero_id, acc);
  }

  const opciones = ((estados ?? []) as PotreroEstado[]).map((p) => ({
    valor: p.potrero_id,
    etiqueta: p.nombre,
  }));
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - i);
  const meta = rancho.meta_dias_descanso;

  return (
    <div>
      <PageHeader
        titulo="Pastoreo"
        descripcion={`Carga animal contra lluvia y descanso · ${anio}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FiltroSelect
          parametro="potrero"
          valor={potreroFiltro}
          placeholder="Todos los potreros"
          opciones={opciones}
        />
        <FiltroSelect
          parametro="anio"
          valor={anio === anioActual ? "" : String(anio)}
          placeholder={String(anioActual)}
          opciones={anios.map((a) => ({ valor: String(a), etiqueta: String(a) }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          etiqueta="Carga actual"
          valor={uaActual > 0 ? `${formatoNumero(uaActual, 1)} UA` : "—"}
          detalle={
            hasPorUA != null ? `${formatoNumero(hasPorUA, 1)} ha por UA` : undefined
          }
          icono={Sprout}
          tono="marca"
          destacado
        />
        <StatTile
          etiqueta={`Lluvia ${anio}`}
          valor={
            filasLluvia.length > 0
              ? `${formatoNumero(lluviaAnio, 1)}${unidadLluvia}`
              : "—"
          }
          detalle="promedio de pluviómetros"
          href="/lluvias"
          tono="info"
          destacado
        />
        <StatTile
          etiqueta="Carga del año"
          valor={uaDiaPorHa != null ? formatoNumero(uaDiaPorHa, 1) : "—"}
          detalle={
            porCienMm != null
              ? `UA-día/ha · ${formatoNumero(porCienMm, 1)} por 100 mm`
              : "UA-día por hectárea"
          }
          destacado
        />
        <StatTile
          etiqueta="Referencia"
          valor={referenciaDiaHa != null ? formatoNumero(referenciaDiaHa, 1) : "—"}
          detalle="UA-día/ha si se ocupara la capacidad todo el año"
          tono={
            referenciaDiaHa != null && uaDiaPorHa != null
              ? uaDiaPorHa > referenciaDiaHa
                ? "peligro"
                : "exito"
              : "neutro"
          }
          destacado
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Carga mensual contra lluvia</CardTitle>
        </CardHeader>
        <CardContent>
          {hayDatos ? (
            <GraficaSerieMes
              datos={datos}
              series={[
                {
                  clave: "carga",
                  etiqueta: hasFiltradas > 0 ? "UA-día/ha" : "UA-día",
                  color: "var(--chart-1)",
                },
                {
                  clave: "lluvia",
                  etiqueta: `Lluvia (${unidadLluvia})`,
                  color: "var(--chart-2)",
                  tipo: "linea",
                  punteada: true,
                },
              ]}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin movimientos de pastoreo ni lluvias capturadas en {anio}.
            </p>
          )}
        </CardContent>
      </Card>

      <h2 className="mt-8 mb-3 font-heading text-lg font-semibold">
        Potreros en {anio}
      </h2>
      {listaEstados.length === 0 ? (
        <EmptyState
          icono={Sprout}
          titulo="Sin potreros"
          descripcion="Da de alta tus potreros para ver su carga."
        />
      ) : (
        <TablaPro
          id="pastoreo"
          datos={listaEstados}
          claveDe={(p) => p.potrero_id}
          hrefDe={(p) => `/potreros/${p.potrero_id}`}
          exportarHref="/pastoreo/exportar"
          columnas={[
            {
              clave: "nombre",
              encabezado: "Potrero",
              enTarjeta: "titulo",
              fija: true,
              celda: (p) => p.nombre,
            },
            {
              clave: "has",
              encabezado: "Has",
              numerica: true,
              celda: (p) => formatoNumero(p.superficie_has, 1),
            },
            {
              clave: "veces",
              encabezado: "Veces pastoreado",
              numerica: true,
              desde: "sm",
              celda: (p) => veces.get(p.potrero_id)?.n ?? 0,
            },
            {
              clave: "dias",
              encabezado: "Días ocupado",
              numerica: true,
              desde: "sm",
              celda: (p) => porPotrero.get(p.potrero_id)?.dias ?? 0,
            },
            {
              clave: "descanso",
              encabezado: "Descanso actual",
              numerica: true,
              celda: (p) =>
                p.grupo_actual_id
                  ? "ocupado"
                  : p.dias_descanso != null
                    ? `${p.dias_descanso} / ${meta}`
                    : "—",
            },
            {
              clave: "cabezas_dia",
              encabezado: "Cabezas-día",
              numerica: true,
              desde: "md",
              celda: (p) =>
                formatoNumero(porPotrero.get(p.potrero_id)?.cabezasDia ?? 0),
            },
            {
              clave: "ua_dia",
              encabezado: "UA-día",
              numerica: true,
              desde: "md",
              apagada: true,
              celda: (p) =>
                formatoNumero(porPotrero.get(p.potrero_id)?.uaDia ?? 0),
            },
            {
              clave: "buniga",
              encabezado: "Buñiga prom.",
              numerica: true,
              desde: "lg",
              celda: (p) => {
                const b = veces.get(p.potrero_id)?.buniga ?? [];
                return b.length
                  ? formatoNumero(b.reduce((s, v) => s + v, 0) / b.length, 1)
                  : "—";
              },
            },
          ]}
        />
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Las UA salen de la categoría de cada animal (Configuración → catálogo
        UA); los caballos no suman UA todavía. Las cabezas-día usan el conteo
        de entrada de cada movimiento: si un movimiento no lo trae, ese tramo
        no suma.
      </p>
    </div>
  );
}
