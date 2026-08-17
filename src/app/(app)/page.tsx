import Link from "next/link";
import {
  Baby,
  Beef,
  CloudRain,
  Fence,
  HandCoins,
  Plus,
  Receipt,
  Skull,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { BarraSemaforo } from "@/components/barra-semaforo";
import { GraficaSerieMes } from "@/components/graficas/grafica-serie-mes";
import { GraficaCategorias } from "@/components/graficas/grafica-categorias";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import {
  CLASES_ANIMAL,
  formatoFecha,
  formatoMoneda,
  formatoNumero,
} from "@/lib/catalogos";
import { estadoPotrero } from "@/lib/estados";
import type { PotreroEstado } from "@/lib/tipos";

export const metadata = { title: "Inicio — RanchOps" };

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/** "2026-03-14" -> 2 (índice de mes). Devuelve null si no parsea. */
function indiceMes(fecha: string | null | undefined): number | null {
  if (!fecha || fecha.length < 7) return null;
  const m = Number(fecha.slice(5, 7));
  return m >= 1 && m <= 12 ? m - 1 : null;
}

export default async function InicioPage() {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.toISOString().slice(0, 7);

  const [
    { data: activos },
    { data: potreros },
    { data: gastosMes },
    { data: gastosAnio },
    { data: ventasAnio },
    { data: lluviasAnio },
    { data: lluviasAnioPasado },
    { count: pluviometros },
    { data: eventosAnio },
    { data: bitacora },
  ] = await Promise.all([
    supabase.from("animales").select("clase").eq("rancho_id", rancho.id).eq("status", "activo"),
    supabase.from("v_potrero_estado").select("*").eq("rancho_id", rancho.id),
    supabase
      .from("gastos")
      .select("monto")
      .eq("rancho_id", rancho.id)
      .gte("fecha", `${mes}-01`)
      .lte("fecha", `${mes}-31`),
    supabase
      .from("gastos")
      .select("monto, fecha")
      .eq("rancho_id", rancho.id)
      .gte("fecha", `${anio}-01-01`),
    supabase
      .from("venta_renglones")
      .select("total, cabezas, ventas!inner(fecha)")
      .eq("rancho_id", rancho.id)
      .gte("ventas.fecha", `${anio}-01-01`),
    supabase
      .from("lluvias")
      .select("cantidad, pluviometro_id, fecha")
      .eq("rancho_id", rancho.id)
      .gte("fecha", `${anio}-01-01`),
    supabase
      .from("lluvias")
      .select("cantidad, pluviometro_id, fecha")
      .eq("rancho_id", rancho.id)
      .gte("fecha", `${anio - 1}-01-01`)
      .lte("fecha", `${anio - 1}-12-31`),
    supabase
      .from("pluviometros")
      .select("id", { count: "exact", head: true })
      .eq("rancho_id", rancho.id)
      .eq("activo", true),
    supabase
      .from("eventos")
      .select("tipo")
      .eq("rancho_id", rancho.id)
      .in("tipo", ["parto", "muerte"])
      .gte("fecha", `${anio}-01-01`),
    supabase
      .from("eventos")
      .select("fecha, tipo, obs, resultado")
      .eq("rancho_id", rancho.id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const porClase = new Map<string, number>();
  for (const a of activos ?? []) porClase.set(a.clase, (porClase.get(a.clase) ?? 0) + 1);
  const totalCabezas = (activos ?? []).length;

  const estados = (potreros ?? []) as PotreroEstado[];
  const meta = rancho.meta_dias_descanso;
  const conteoPotreros = { ocupado: 0, descansando: 0, listo: 0, sinDatos: 0 };
  for (const p of estados) {
    const { clave } = estadoPotrero(p.dias_descanso, meta, !!p.grupo_actual_id);
    conteoPotreros[clave]++;
  }
  const enDescanso = estados.filter((p) => !p.grupo_actual_id && p.dias_descanso != null);
  const promedioDescanso = enDescanso.length
    ? enDescanso.reduce((s, p) => s + (p.dias_descanso ?? 0), 0) / enDescanso.length
    : null;

  const totalGastosMes = (gastosMes ?? []).reduce((s, g) => s + Number(g.monto), 0);
  const totalGastosAnio = (gastosAnio ?? []).reduce((s, g) => s + Number(g.monto), 0);
  const totalVentas = (ventasAnio ?? []).reduce((s, v) => s + Number(v.total), 0);
  const cabezasVendidas = (ventasAnio ?? []).reduce((s, v) => s + v.cabezas, 0);
  const balance = totalVentas - totalGastosAnio;

  // --- Lluvia: promedio por pluviómetro, total y por mes ---
  type FilaLluvia = { cantidad: number; pluviometro_id: string; fecha: string };
  const divisor = (filas: FilaLluvia[]) =>
    pluviometros || new Set(filas.map((f) => f.pluviometro_id)).size || 1;

  const promedioLluvia = (filas: FilaLluvia[] | null) => {
    if (!filas || filas.length === 0) return null;
    return filas.reduce((s, f) => s + Number(f.cantidad), 0) / divisor(filas);
  };
  const lluviaPorMes = (filas: FilaLluvia[] | null) => {
    const acc = new Array(12).fill(0);
    if (!filas || filas.length === 0) return acc;
    const n = divisor(filas);
    for (const f of filas) {
      const i = indiceMes(f.fecha);
      if (i != null) acc[i] += Number(f.cantidad) / n;
    }
    return acc;
  };

  const filasActual = (lluviasAnio ?? []) as FilaLluvia[];
  const filasPasado = (lluviasAnioPasado ?? []) as FilaLluvia[];
  const lluviaActual = promedioLluvia(filasActual);
  const lluviaPasada = promedioLluvia(filasPasado);
  const unidadLluvia = rancho.unidad_lluvia === "mm" ? "mm" : '"';

  const mesesLluvia = lluviaPorMes(filasActual);
  const mesesLluviaPasada = lluviaPorMes(filasPasado);
  const datosLluvia = MESES.map((m, i) => ({
    mes: m,
    actual: Number(mesesLluvia[i].toFixed(2)),
    pasado: Number(mesesLluviaPasada[i].toFixed(2)),
  }));
  const hayLluvia = filasActual.length > 0 || filasPasado.length > 0;

  // --- Ventas y costos por mes ---
  const costosMes = new Array(12).fill(0);
  for (const g of gastosAnio ?? []) {
    const i = indiceMes(g.fecha);
    if (i != null) costosMes[i] += Number(g.monto);
  }
  const ventasMes = new Array(12).fill(0);
  for (const v of ventasAnio ?? []) {
    // PostgREST devuelve el join como objeto o como array según cardinalidad.
    const j = v.ventas as { fecha: string } | { fecha: string }[] | null;
    const fecha = Array.isArray(j) ? j[0]?.fecha : j?.fecha;
    const i = indiceMes(fecha);
    if (i != null) ventasMes[i] += Number(v.total);
  }
  const datosDinero = MESES.map((m, i) => ({
    mes: m,
    ventas: Math.round(ventasMes[i]),
    costos: Math.round(costosMes[i]),
  }));
  const hayDinero = totalVentas > 0 || totalGastosAnio > 0;

  const nacimientos = (eventosAnio ?? []).filter((e) => e.tipo === "parto").length;
  const muertes = (eventosAnio ?? []).filter((e) => e.tipo === "muerte").length;

  const datosClase = CLASES_ANIMAL.filter((c) => porClase.has(c.valor)).map((c) => ({
    etiqueta: c.plural,
    valor: porClase.get(c.valor) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        titulo={rancho.nombre}
        descripcion={hoy.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      >
        <Button render={<Link href="/trabajos/nuevo" />}>
          <Plus className="size-4" /> Capturar trabajo
        </Button>
      </PageHeader>

      {/* El pulso del rancho */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          etiqueta="Cabezas activas"
          valor={formatoNumero(totalCabezas)}
          detalle="en inventario"
          href="/ganado"
          icono={Beef}
          tono="marca"
          destacado
        />
        <StatTile
          etiqueta="Potreros listos"
          valor={`${conteoPotreros.listo}/${estados.length}`}
          detalle={`${conteoPotreros.ocupado} ocupados`}
          href="/potreros"
          icono={Fence}
          tono={conteoPotreros.listo > 0 ? "exito" : "alerta"}
          destacado
        />
        <StatTile
          etiqueta={`Lluvia ${anio}`}
          valor={
            lluviaActual != null
              ? `${formatoNumero(lluviaActual, 1)}${unidadLluvia}`
              : "—"
          }
          detalle={
            lluviaPasada != null
              ? `${formatoNumero(lluviaPasada, 1)}${unidadLluvia} en ${anio - 1}`
              : "promedio del rancho"
          }
          href="/lluvias"
          icono={CloudRain}
          tono="info"
          destacado
        />
        <StatTile
          etiqueta={`Balance ${anio}`}
          valor={formatoMoneda(balance)}
          detalle={`${formatoMoneda(totalVentas)} vendido`}
          href="/reportes"
          icono={TrendingUp}
          tono={balance >= 0 ? "exito" : "peligro"}
          destacado
        />
      </div>

      {/* Gráficas */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lluvia por mes</CardTitle>
          </CardHeader>
          <CardContent>
            {hayLluvia ? (
              <GraficaSerieMes
                datos={datosLluvia}
                sufijo={unidadLluvia}
                formato="decimal1"
                series={[
                  {
                    clave: "actual",
                    etiqueta: String(anio),
                    color: "var(--color-chart-4)",
                    tipo: "barra",
                  },
                  {
                    clave: "pasado",
                    etiqueta: String(anio - 1),
                    color: "var(--color-neutro)",
                    tipo: "linea",
                    punteada: true,
                  },
                ]}
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sin lecturas de lluvia todavía.{" "}
                <Link href="/lluvias" className="text-primary underline">
                  Registra la primera
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas y costos {anio}</CardTitle>
          </CardHeader>
          <CardContent>
            {hayDinero ? (
              <GraficaSerieMes
                datos={datosDinero}
                formato="moneda"
                series={[
                  {
                    clave: "ventas",
                    etiqueta: "Ventas",
                    color: "var(--color-chart-1)",
                  },
                  {
                    clave: "costos",
                    etiqueta: "Costos",
                    color: "var(--color-chart-3)",
                  },
                ]}
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sin movimientos de dinero este año.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalle */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Potreros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {estados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay potreros.{" "}
                <Link href="/potreros" className="text-primary underline">
                  Crea el primero
                </Link>
                .
              </p>
            ) : (
              <>
                <BarraSemaforo
                  segmentos={[
                    { clave: "ocupado", etiqueta: "Ocupados", valor: conteoPotreros.ocupado, tono: "peligro" },
                    { clave: "descansando", etiqueta: "Descansando", valor: conteoPotreros.descansando, tono: "alerta" },
                    { clave: "listo", etiqueta: "Listos", valor: conteoPotreros.listo, tono: "exito" },
                    { clave: "sinDatos", etiqueta: "Sin historial", valor: conteoPotreros.sinDatos, tono: "neutro" },
                  ]}
                />
                <div className="border-t pt-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">
                      Descanso promedio
                    </span>
                    <span className="font-heading font-semibold tabular-nums">
                      {promedioDescanso != null
                        ? `${formatoNumero(promedioDescanso)} d`
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, ((promedioDescanso ?? 0) / meta) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    meta: {meta} días
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventario por clase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalCabezas === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay animales.{" "}
                <Link href="/ganado/nuevo" className="text-primary underline">
                  Registra el primero
                </Link>
                .
              </p>
            ) : (
              <>
                <GraficaCategorias datos={datosClase} alturaClase="h-52" />
                {/* Los enlaces por clase viven aquí: la gráfica no navega. */}
                <div className="flex flex-wrap gap-1.5 border-t pt-3">
                  {CLASES_ANIMAL.filter((c) => porClase.has(c.valor)).map((c) => (
                    <Link
                      key={c.valor}
                      href={`/ganado?clase=${c.valor}`}
                      className="rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-accent"
                    >
                      {c.plural}{" "}
                      <span className="tabular-nums text-muted-foreground">
                        {porClase.get(c.valor)}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(bitacora ?? []).length === 0 ? (
              <p className="text-muted-foreground">
                Sin actividad todavía. Empieza con la{" "}
                <Link href="/bitacora" className="text-primary underline">
                  bitácora
                </Link>{" "}
                o un{" "}
                <Link href="/trabajos/nuevo" className="text-primary underline">
                  trabajo
                </Link>
                .
              </p>
            ) : (
              bitacora!.map((e, i) => (
                <div
                  key={i}
                  className="flex gap-3 border-b pb-2 last:border-0 last:pb-0"
                >
                  <span className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatoFecha(e.fecha)}
                  </span>
                  <span className="min-w-0 truncate">
                    {e.obs ?? e.resultado ?? e.tipo.replaceAll("_", " ")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secundarios */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          etiqueta={`Nacimientos ${anio}`}
          valor={formatoNumero(nacimientos)}
          href="/trabajos"
          icono={Baby}
          tono="exito"
        />
        <StatTile
          etiqueta={`Mortalidades ${anio}`}
          valor={formatoNumero(muertes)}
          href="/trabajos"
          icono={Skull}
          tono={muertes > 0 ? "peligro" : "neutro"}
        />
        <StatTile
          etiqueta="Costos del mes"
          valor={formatoMoneda(totalGastosMes)}
          detalle={`${formatoMoneda(totalGastosAnio)} en ${anio}`}
          href="/costos"
          icono={Receipt}
        />
        <StatTile
          etiqueta="Cabezas vendidas"
          valor={formatoNumero(cabezasVendidas)}
          detalle={
            cabezasVendidas > 0
              ? `${formatoMoneda(totalVentas / cabezasVendidas)} por cabeza`
              : `en ${anio}`
          }
          href="/ventas"
          icono={HandCoins}
        />
      </div>
    </div>
  );
}
