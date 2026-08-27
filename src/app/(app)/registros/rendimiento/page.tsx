import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { TablaPro, type ColumnaPro } from "@/components/tabla-pro";
import { createClient } from "@/lib/supabase/server";
import { requireMembresia } from "@/lib/auth";
import { etiquetaClase, formatoFecha, formatoMoneda, formatoNumero } from "@/lib/catalogos";
import { formatoGdp } from "@/lib/pesos";
import { rendimientoAnimales, type FilaRendimiento } from "@/lib/analisis";

export const metadata = { title: "Rendimiento por animal — RanchOps" };

/**
 * Qué tanto rinde cada animal: días en el campo, cuánto ha ganado, a qué
 * paso, cuánto ha costado y —si ya se vendió— cuánto dejó. El dinero solo
 * lo ve quien administra.
 */
export default async function RendimientoPage({
  searchParams,
}: PageProps<"/registros/rendimiento">) {
  const sp = await searchParams;
  const { rancho, rol } = await requireMembresia();
  const supabase = await createClient();

  const status =
    sp.status === "vendido" ? "vendido" : sp.status === "todos" ? "todos" : "activo";
  const conDinero = rol === "admin";

  const filas = await rendimientoAnimales(supabase, rancho.id, { status, conDinero });

  const conGdp = filas.filter((f) => f.gdpGeneral != null);
  const gdpPromedio = conGdp.length
    ? conGdp.reduce((s, f) => s + f.gdpGeneral!, 0) / conGdp.length
    : null;
  const diasPromedio = (() => {
    const d = filas.map((f) => f.diasEnCampo).filter((v): v is number => v != null);
    return d.length ? d.reduce((s, v) => s + v, 0) / d.length : null;
  })();
  const costosTotales = filas.reduce((s, f) => s + f.costos, 0);
  const vendidos = filas.filter((f) => f.resultado != null);
  const resultadoTotal = vendidos.reduce((s, f) => s + f.resultado!, 0);

  const url = (s: string) =>
    s === "activo" ? "/registros/rendimiento" : `/registros/rendimiento?status=${s}`;

  const colDinero: ColumnaPro<FilaRendimiento>[] = conDinero
    ? [
        {
          clave: "costos",
          encabezado: "Costos",
          numerica: true,
          desde: "lg",
          celda: (f) => (f.costos > 0 ? formatoMoneda(f.costos) : "—"),
        },
        {
          clave: "compra",
          encabezado: "Compra",
          numerica: true,
          desde: "lg",
          apagada: true,
          celda: (f) => (f.compra?.precio != null ? formatoMoneda(f.compra.precio) : "—"),
        },
        {
          clave: "venta",
          encabezado: "Venta",
          numerica: true,
          desde: "lg",
          apagada: status === "activo",
          celda: (f) => (f.venta?.precio != null ? formatoMoneda(f.venta.precio) : "—"),
        },
        {
          clave: "resultado",
          encabezado: "Resultado",
          numerica: true,
          desde: "md",
          apagada: status === "activo",
          celda: (f) =>
            f.resultado != null ? (
              <span className={f.resultado >= 0 ? "text-exito-fuerte" : "text-peligro-fuerte"}>
                {formatoMoneda(f.resultado)}
              </span>
            ) : (
              "—"
            ),
        },
      ]
    : [];

  return (
    <div>
      <PageHeader
        titulo="Rendimiento por animal"
        descripcion={`${filas.length} ${filas.length === 1 ? "animal" : "animales"}`}
      >
        <Button variant="outline" render={<Link href="/registros" />}>
          <ArrowLeft className="size-4" /> Registros
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          etiqueta="GDP promedio"
          valor={gdpPromedio != null ? formatoGdp(gdpPromedio) : "—"}
          detalle={`${conGdp.length} con 2+ pesajes`}
          tono="marca"
          destacado
        />
        <StatTile
          etiqueta="Días en el campo"
          valor={diasPromedio != null ? formatoNumero(diasPromedio, 0) : "—"}
          detalle="promedio"
          destacado
        />
        {conDinero && (
          <>
            <StatTile
              etiqueta="Costos directos"
              valor={formatoMoneda(costosTotales)}
              detalle="trabajos con costo, prorrateados"
              destacado
            />
            <StatTile
              etiqueta="Resultado vendidos"
              valor={vendidos.length ? formatoMoneda(resultadoTotal) : "—"}
              detalle={`${vendidos.length} con venta ligada`}
              tono={vendidos.length ? (resultadoTotal >= 0 ? "exito" : "peligro") : "neutro"}
              destacado
            />
          </>
        )}
      </div>

      <div className="mt-6 mb-4 flex flex-wrap gap-1.5">
        {[
          ["activo", "En el campo"],
          ["vendido", "Vendidos"],
          ["todos", "Todos"],
        ].map(([v, etiqueta]) => (
          <Link key={v} href={url(v)}>
            <Badge variant={status === v ? "default" : "outline"}>{etiqueta}</Badge>
          </Link>
        ))}
      </div>

      {filas.length === 0 ? (
        <EmptyState
          icono={TrendingUp}
          titulo="Sin animales"
          descripcion="Con pesajes capturados aquí se ve cómo rinde cada uno."
        />
      ) : (
        <TablaPro
          id="analisis-rendimiento"
          datos={filas}
          claveDe={(f) => f.id}
          hrefDe={(f) => `/ganado/${f.id}`}
          agrupables={["clase", "procedencia"]}
          exportarHref={`/registros/exportar?tipo=rendimiento&status=${status}`}
          columnas={[
            {
              clave: "arete",
              encabezado: "Arete",
              enTarjeta: "titulo",
              fija: true,
              celda: (f) => `#${f.arete ?? "s/n"}`,
            },
            {
              clave: "clase",
              encabezado: "Clase",
              enTarjeta: "subtitulo",
              valorDe: (f) => etiquetaClase(f.clase),
              celda: (f) => etiquetaClase(f.clase),
            },
            {
              clave: "status",
              encabezado: "Status",
              desde: "sm",
              apagada: status !== "todos",
              celda: (f) => f.status,
            },
            {
              clave: "procedencia",
              encabezado: "Procedencia",
              desde: "lg",
              apagada: true,
              valorDe: (f) => f.procedencia,
              celda: (f) => f.procedencia ?? "—",
            },
            {
              clave: "en_campo",
              encabezado: "En el campo desde",
              desde: "md",
              celda: (f) => formatoFecha(f.enCampoDesde),
            },
            {
              clave: "dias",
              encabezado: "Días",
              numerica: true,
              celda: (f) => f.diasEnCampo ?? "—",
            },
            {
              clave: "primer_peso",
              encabezado: "Primer peso",
              numerica: true,
              desde: "lg",
              apagada: true,
              celda: (f) => (f.primerPeso ? `${formatoNumero(f.primerPeso.peso, 0)} kg` : "—"),
            },
            {
              clave: "ultimo_peso",
              encabezado: "Último peso",
              numerica: true,
              celda: (f) =>
                f.ultimoPeso ? (
                  <span>
                    {formatoNumero(f.ultimoPeso.peso, 0)} kg
                    <span className="block text-xs font-normal text-muted-foreground">
                      {formatoFecha(f.ultimoPeso.fecha)}
                    </span>
                  </span>
                ) : (
                  "—"
                ),
            },
            {
              clave: "ganancia",
              encabezado: "Ganancia",
              numerica: true,
              desde: "md",
              celda: (f) =>
                f.gananciaTotal != null ? `${f.gananciaTotal > 0 ? "+" : ""}${formatoNumero(f.gananciaTotal, 0)} kg` : "—",
            },
            {
              clave: "gdp",
              encabezado: "GDP general",
              numerica: true,
              desde: "sm",
              celda: (f) => (f.gdpGeneral != null ? formatoGdp(f.gdpGeneral) : "—"),
            },
            {
              clave: "gdp_reciente",
              encabezado: "GDP reciente",
              numerica: true,
              desde: "lg",
              apagada: true,
              celda: (f) => (f.gdpReciente != null ? formatoGdp(f.gdpReciente) : "—"),
            },
            {
              clave: "estimado",
              encabezado: "Peso estimado hoy",
              numerica: true,
              desde: "md",
              celda: (f) =>
                f.pesoEstimado != null ? `${formatoNumero(f.pesoEstimado, 0)} kg` : "—",
            },
            ...colDinero,
          ]}
        />
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        La GDP general va del primer peso conocido (el de nacimiento si lo
        tiene) al último; el peso estimado proyecta ese paso hasta hoy. Los
        costos son los trabajos con costo repartidos entre los animales que
        tocaron; el precio de venta o compra se aproxima con el renglón de su
        clase.
      </p>
    </div>
  );
}
