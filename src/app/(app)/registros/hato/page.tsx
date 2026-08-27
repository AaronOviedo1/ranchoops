import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/aviso";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { TablaPro } from "@/components/tabla-pro";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { etiquetaClase, formatoNumero } from "@/lib/catalogos";
import { reconciliacionHato, type FilaHato } from "@/lib/analisis";

export const metadata = { title: "Reconciliación del hato — RanchOps" };

/**
 * El cuadre del inventario: con cuántas cabezas se empezó el año, cuántas
 * entraron, cuántas salieron y con cuántas se cierra. Si el cierre no cuadra
 * con lo que hay hoy, aquí se ve de cuánto es el hueco.
 */
export default async function HatoPage({
  searchParams,
}: PageProps<"/registros/hato">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const anioActual = new Date().getFullYear();
  const anio = /^\d{4}$/.test(String(sp.anio ?? "")) ? Number(sp.anio) : anioActual;

  const { filas, total } = await reconciliacionHato(supabase, rancho.id, anio);
  const esActual = anio === anioActual;
  const hueco = esActual && total.actual != null ? total.actual - total.cierre : null;
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - i);

  const datos: FilaHato[] = filas.length ? [...filas, total] : [];

  return (
    <div>
      <PageHeader
        titulo="Reconciliación del hato"
        descripcion={`Inventario ganadero ${anio}, por clase`}
      >
        <Button variant="outline" render={<Link href="/registros" />}>
          <ArrowLeft className="size-4" /> Registros
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          etiqueta={`Iniciales ${anio}`}
          valor={formatoNumero(total.inicial)}
          detalle="al 1 de enero"
          destacado
        />
        <StatTile
          etiqueta="Entradas"
          valor={formatoNumero(total.nacimientos + total.compradas + total.otrasEntradas)}
          detalle={`${total.nacimientos} nacimientos · ${total.compradas} compras`}
          tono="exito"
          destacado
        />
        <StatTile
          etiqueta="Salidas"
          valor={formatoNumero(total.vendidas + total.muertes + total.otrasSalidas)}
          detalle={`${total.vendidas} ventas · ${total.muertes} muertes`}
          tono={total.muertes > 0 ? "peligro" : "alerta"}
          destacado
        />
        <StatTile
          etiqueta="Cierre"
          valor={formatoNumero(total.cierre)}
          detalle={
            esActual && total.actual != null
              ? `${formatoNumero(total.actual)} activos hoy`
              : "al 31 de diciembre"
          }
          tono="marca"
          destacado
        />
      </div>

      {hueco != null && hueco !== 0 && (
        <Aviso tono="alerta" className="mt-4">
          El cierre calculado ({total.cierre}) no cuadra con los activos de hoy
          ({total.actual}): hay {Math.abs(hueco)}{" "}
          {Math.abs(hueco) === 1 ? "animal" : "animales"} {hueco > 0 ? "de más" : "de menos"}.
          Normalmente son animales sin fecha de entrada o de salida; revísalos
          en Ganado.
        </Aviso>
      )}

      <div className="mt-6 mb-4 flex flex-wrap gap-1.5">
        {anios.map((a) => (
          <Link key={a} href={a === anioActual ? "/registros/hato" : `/registros/hato?anio=${a}`}>
            <Badge variant={a === anio ? "default" : "outline"}>{a}</Badge>
          </Link>
        ))}
      </div>

      {datos.length === 0 ? (
        <EmptyState
          icono={Scale}
          titulo={`Sin movimientos en ${anio}`}
          descripcion="Cuando haya animales con fechas de entrada y salida, aquí se cuadra el inventario."
        />
      ) : (
        <TablaPro
          id="analisis-hato"
          datos={datos}
          claveDe={(f) => f.clase}
          exportarHref={`/registros/exportar?tipo=hato&anio=${anio}`}
          columnas={[
            {
              clave: "clase",
              encabezado: "Clase",
              enTarjeta: "titulo",
              fija: true,
              celda: (f) =>
                f.clase === "Total" ? (
                  <span className="font-semibold">Total</span>
                ) : (
                  etiquetaClase(f.clase)
                ),
            },
            { clave: "inicial", encabezado: "Iniciales", numerica: true, celda: (f) => f.inicial },
            {
              clave: "nacimientos",
              encabezado: "Nacimientos",
              numerica: true,
              desde: "sm",
              celda: (f) => f.nacimientos || "—",
            },
            {
              clave: "compradas",
              encabezado: "Compradas",
              numerica: true,
              desde: "sm",
              celda: (f) => f.compradas || "—",
            },
            {
              clave: "otras_entradas",
              encabezado: "Otras entradas",
              numerica: true,
              desde: "lg",
              celda: (f) => f.otrasEntradas || "—",
            },
            {
              clave: "vendidas",
              encabezado: "Vendidas",
              numerica: true,
              desde: "sm",
              celda: (f) => f.vendidas || "—",
            },
            {
              clave: "muertes",
              encabezado: "Muertes",
              numerica: true,
              desde: "sm",
              celda: (f) => f.muertes || "—",
            },
            {
              clave: "otras_salidas",
              encabezado: "Otras salidas",
              numerica: true,
              desde: "lg",
              celda: (f) => f.otrasSalidas || "—",
            },
            {
              clave: "cierre",
              encabezado: "Cierre",
              numerica: true,
              enTarjeta: "estado",
              celda: (f) => <span className="font-semibold">{f.cierre}</span>,
            },
            {
              clave: "actual",
              encabezado: "Activos hoy",
              numerica: true,
              desde: "md",
              apagada: !esActual,
              celda: (f) => (f.actual != null ? f.actual : "—"),
            },
          ]}
        />
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Cada animal se cuenta en la clase que tiene hoy (los cambios de clase
        por edad no se rastrean por año). Entra por su fecha en el campo o de
        nacimiento; sale por su fecha de salida. «Otras entradas» son animales
        que llegaron ya nacidos sin compra ligada; «otras salidas», desechos y
        transferencias.
      </p>
    </div>
  );
}
