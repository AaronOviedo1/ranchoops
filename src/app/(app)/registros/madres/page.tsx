import Link from "next/link";
import { ArrowLeft, Baby } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/estado-badge";
import { StatTile } from "@/components/stat-tile";
import { TablaPro } from "@/components/tabla-pro";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { etiquetaClase, etiquetaReproductivo, formatoFecha, formatoNumero } from "@/lib/catalogos";
import { edadTexto } from "@/lib/ciclo-vida";
import { rendimientoMadres } from "@/lib/analisis";

export const metadata = { title: "Rendimiento de las madres — RanchOps" };

/**
 * Cómo rinde cada vaca: cuántas crías, cuántas llegaron al destete, cada
 * cuánto pare. Lo que AgriWebb llama "rendimiento de la madre", con el
 * peso al destete que pidió José Carlos.
 */
export default async function MadresPage({
  searchParams,
}: PageProps<"/registros/madres">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const anioActual = new Date().getFullYear();
  const anio = /^\d{4}$/.test(String(sp.anio ?? "")) ? Number(sp.anio) : anioActual;
  const status = sp.status === "todos" ? "todos" : "activo";

  const filas = await rendimientoMadres(supabase, rancho.id, { anio, status });
  const conCrias = filas.filter((f) => f.crias > 0);

  const diagnosticadas = filas.filter((f) => f.gestante != null);
  const prenez = diagnosticadas.length
    ? (diagnosticadas.filter((f) => f.gestante).length / diagnosticadas.length) * 100
    : null;
  const totalCrias = filas.reduce((s, f) => s + f.crias, 0);
  const totalDestetadas = filas.reduce((s, f) => s + f.destetadas, 0);
  const eficiencia = totalCrias > 0 ? (totalDestetadas / totalCrias) * 100 : null;
  const intervalos = filas
    .map((f) => f.intervaloPartos)
    .filter((v): v is number => v != null);
  const intervaloPromedio = intervalos.length
    ? intervalos.reduce((s, v) => s + v, 0) / intervalos.length
    : null;
  const criasAnio = filas.reduce((s, f) => s + f.criasAnio, 0);

  const url = (cambios: Record<string, string>) => {
    const p = new URLSearchParams({ anio: String(anio), status, ...cambios });
    if (p.get("anio") === String(anioActual)) p.delete("anio");
    if (p.get("status") === "activo") p.delete("status");
    const q = p.toString();
    return `/registros/madres${q ? `?${q}` : ""}`;
  };
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - i);

  return (
    <div>
      <PageHeader
        titulo="Rendimiento de las madres"
        descripcion={`${filas.length} hembras · ${conCrias.length} con crías registradas`}
      >
        <Button variant="outline" render={<Link href="/registros" />}>
          <ArrowLeft className="size-4" /> Registros
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          etiqueta="Preñez"
          valor={prenez != null ? `${formatoNumero(prenez, 0)}%` : "—"}
          detalle={`${diagnosticadas.length} con diagnóstico`}
          tono="exito"
          destacado
        />
        <StatTile
          etiqueta="Eficiencia de destete"
          valor={eficiencia != null ? `${formatoNumero(eficiencia, 0)}%` : "—"}
          detalle={`${totalDestetadas} de ${totalCrias} crías`}
          tono="info"
          destacado
        />
        <StatTile
          etiqueta="Intervalo entre partos"
          valor={intervaloPromedio != null ? `${formatoNumero(intervaloPromedio, 0)} días` : "—"}
          detalle={intervalos.length ? `${intervalos.length} vacas con 2+ partos` : "se necesitan 2 partos"}
          destacado
        />
        <StatTile
          etiqueta={`Crías ${anio}`}
          valor={formatoNumero(criasAnio)}
          tono="marca"
          destacado
        />
      </div>

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-1.5">
        {anios.map((a) => (
          <Link key={a} href={url({ anio: String(a) })}>
            <Badge variant={a === anio ? "default" : "outline"}>{a}</Badge>
          </Link>
        ))}
        <span className="mx-2 border-l" />
        <Link href={url({ status: "activo" })}>
          <Badge variant={status === "activo" ? "default" : "outline"}>Activas</Badge>
        </Link>
        <Link href={url({ status: "todos" })}>
          <Badge variant={status === "todos" ? "default" : "outline"}>Todas</Badge>
        </Link>
      </div>

      {filas.length === 0 ? (
        <EmptyState
          icono={Baby}
          titulo="Sin hembras"
          descripcion="Cuando haya vacas y vaquillas con crías ligadas por madre, aquí se ve cómo rinden."
        />
      ) : (
        <TablaPro
          id="analisis-madres"
          datos={filas}
          claveDe={(f) => f.id}
          hrefDe={(f) => `/ganado/${f.id}`}
          agrupables={["clase", "gestacion"]}
          exportarHref={`/registros/exportar?tipo=madres&anio=${anio}&status=${status}`}
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
              clave: "edad",
              encabezado: "Edad",
              desde: "lg",
              apagada: true,
              celda: (f) => edadTexto(f.fecha_nacimiento),
            },
            {
              clave: "gestacion",
              encabezado: "Gestación",
              enTarjeta: "estado",
              valorDe: (f) => (f.gestante == null ? "Sin diagnóstico" : f.gestante ? "Cargada" : "Vacía"),
              celda: (f) =>
                f.gestante == null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <EstadoBadge tono={f.gestante ? "exito" : "alerta"}>
                    {etiquetaReproductivo(f.status_reproductivo)}
                  </EstadoBadge>
                ),
            },
            {
              clave: "servicios",
              encabezado: "Servicios (IA)",
              numerica: true,
              desde: "lg",
              apagada: true,
              celda: (f) => f.servicios || "—",
            },
            {
              clave: "crias",
              encabezado: "Crías",
              numerica: true,
              celda: (f) => f.crias || "—",
            },
            {
              clave: "crias_anio",
              encabezado: `Crías ${anio}`,
              numerica: true,
              desde: "md",
              celda: (f) => f.criasAnio || "—",
            },
            {
              clave: "destetadas",
              encabezado: "Destetadas",
              numerica: true,
              desde: "sm",
              celda: (f) => f.destetadas || "—",
            },
            {
              clave: "eficiencia",
              encabezado: "Eficiencia",
              numerica: true,
              desde: "sm",
              celda: (f) =>
                f.eficienciaDestete != null ? `${formatoNumero(f.eficienciaDestete, 0)}%` : "—",
            },
            {
              clave: "peso_destete",
              encabezado: "Peso destete prom.",
              numerica: true,
              desde: "md",
              celda: (f) =>
                f.pesoDestetePromedio != null ? `${formatoNumero(f.pesoDestetePromedio, 0)} kg` : "—",
            },
            {
              clave: "ultimo_parto",
              encabezado: "Último parto",
              desde: "md",
              celda: (f) => (f.ultimoParto ? formatoFecha(f.ultimoParto) : "—"),
            },
            {
              clave: "intervalo",
              encabezado: "Intervalo partos",
              numerica: true,
              desde: "lg",
              celda: (f) => (f.intervaloPartos != null ? `${f.intervaloPartos} días` : "—"),
            },
          ]}
        />
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Las crías se cuentan por la madre ligada en la ficha; «destetada» es la
        que tiene fecha o peso de destete. El intervalo entre partos es el
        promedio de días entre nacimientos consecutivos de sus crías.
      </p>
    </div>
  );
}
