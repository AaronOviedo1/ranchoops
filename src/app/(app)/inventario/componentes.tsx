import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Aviso } from "@/components/aviso";
import { TablaPro, type ColumnaPro } from "@/components/tabla-pro";
import { TablaResponsiva } from "@/components/tabla-responsiva";
import {
  etiquetaTipoProducto,
  formatoFecha,
  formatoMoneda,
  formatoNumero,
  type CategoriaInventario,
} from "@/lib/catalogos";
import { estadoCaducidad } from "@/lib/inventario";
import type { ExistenciaDetalle, MovimientoReciente } from "./datos";

const estaBajo = (p: ExistenciaDetalle) =>
  p.stock_minimo != null && p.existencia < p.stock_minimo;

/**
 * Las columnas de una pestaña. El alimento se mide en kilos, la medicina
 * tiene retiro y caducidad, y el semen solo se cuenta: cada cajón enseña lo
 * suyo. Sin `categoria` (la vista "Todo") quedan las columnas comunes.
 */
export function columnasInventario(
  categoria?: CategoriaInventario
): ColumnaPro<ExistenciaDetalle>[] {
  const campos = categoria?.campos;
  const variosTipos = !categoria || categoria.tipos.length > 1;

  const columnas: (ColumnaPro<ExistenciaDetalle> | false | undefined)[] = [
    {
      clave: "nombre",
      encabezado: "Producto",
      enTarjeta: "titulo",
      fija: true,
      celda: (p) => (
        <>
          {p.nombre}
          {estaBajo(p) && (
            <Badge variant="destructive" className="ml-2">
              bajo
            </Badge>
          )}
          {p.controlado && (
            <Badge variant="outline" className="ml-2">
              controlado
            </Badge>
          )}
        </>
      ),
    },
    variosTipos && {
      clave: "tipo",
      encabezado: "Tipo",
      enTarjeta: "subtitulo",
      valorDe: (p) => etiquetaTipoProducto(p.tipo),
      celda: (p) => etiquetaTipoProducto(p.tipo),
    },
    {
      clave: "existencia",
      encabezado: "Existencia",
      numerica: true,
      enTarjeta: "estado",
      celda: (p) => (
        <span className="font-heading font-semibold tabular-nums">
          {formatoNumero(p.existencia, 1)} {p.unidad}
        </span>
      ),
    },
    campos?.contenidoKg && {
      clave: "contenido_kg",
      encabezado: "Kg por unidad",
      numerica: true,
      desde: "md",
      celda: (p) => (p.contenido_kg != null ? formatoNumero(p.contenido_kg, 1) : "—"),
    },
    campos?.contenidoKg && {
      clave: "kg_totales",
      encabezado: "Kg totales",
      numerica: true,
      desde: "sm",
      celda: (p) =>
        p.contenido_kg != null ? formatoNumero(p.contenido_kg * p.existencia, 0) : "—",
    },
    campos?.caducidad && {
      clave: "caducidad",
      encabezado: "Caducidad",
      desde: "sm",
      celda: (p) => {
        const estado = estadoCaducidad(p.caducidad);
        return p.caducidad ? (
          <>
            {formatoFecha(p.caducidad)}
            {estado && (
              <Badge
                variant={estado === "vencido" ? "destructive" : "outline"}
                className="ml-2"
              >
                {estado === "vencido" ? "vencido" : "por vencer"}
              </Badge>
            )}
          </>
        ) : (
          "—"
        );
      },
    },
    campos?.diasRetiro && {
      clave: "dias_retiro",
      encabezado: "Retiro (días)",
      numerica: true,
      desde: "md",
      celda: (p) => p.dias_retiro ?? "—",
    },
    {
      clave: "minimo",
      encabezado: "Mínimo",
      numerica: true,
      desde: "lg",
      apagada: true,
      celda: (p) => (p.stock_minimo != null ? formatoNumero(p.stock_minimo, 1) : "—"),
    },
    {
      clave: "proveedor",
      encabezado: "Proveedor",
      desde: "lg",
      apagada: true,
      valorDe: (p) => p.proveedor,
      celda: (p) => p.proveedor ?? "—",
    },
    {
      clave: "costo",
      encabezado: "Costo/u",
      numerica: true,
      desde: "sm",
      celda: (p) => formatoMoneda(p.costo_unitario),
    },
    {
      clave: "valor",
      encabezado: "Valor",
      numerica: true,
      desde: "md",
      celda: (p) =>
        p.costo_unitario != null ? formatoMoneda(p.costo_unitario * p.existencia) : "—",
    },
  ];

  return columnas.filter((c): c is ColumnaPro<ExistenciaDetalle> => !!c);
}

/** La tabla de una pestaña: con columnas a elegir, agrupar y exportar. */
export function TablaCategoria({
  categoria,
  existencias,
  vacio,
  className,
}: {
  categoria: CategoriaInventario;
  existencias: ExistenciaDetalle[];
  vacio?: React.ReactNode;
  className?: string;
}) {
  return (
    <TablaPro
      id={`inv_${categoria.slug}`}
      className={className}
      datos={existencias}
      claveDe={(p) => p.producto_id}
      columnas={columnasInventario(categoria)}
      agrupables={["tipo", "proveedor"]}
      exportarHref={`/inventario/exportar?categoria=${categoria.slug}`}
      vacio={vacio}
    />
  );
}

/** La tabla compacta de cada sección de "Todo": sin controles, que ahí serían ruido. */
export function TablaResumen({ existencias }: { existencias: ExistenciaDetalle[] }) {
  const columnas = columnasInventario().filter((c) => !c.apagada);
  return (
    <TablaResponsiva
      datos={existencias}
      claveDe={(p) => p.producto_id}
      columnas={columnas}
    />
  );
}

export function AvisoStockBajo({ existencias }: { existencias: ExistenciaDetalle[] }) {
  const bajos = existencias.filter(estaBajo);
  const vencidos = existencias.filter((p) => estadoCaducidad(p.caducidad) === "vencido");
  if (bajos.length === 0 && vencidos.length === 0) return null;
  return (
    <Aviso tono="alerta" icono={AlertTriangle} className="mb-4">
      {bajos.length > 0 && (
        <p>
          <span className="font-medium">Inventario bajo:</span>{" "}
          {bajos
            .map(
              (a) =>
                `${a.nombre} (${formatoNumero(a.existencia, 1)} de ${formatoNumero(a.stock_minimo, 1)})`
            )
            .join(", ")}
        </p>
      )}
      {vencidos.length > 0 && (
        <p>
          <span className="font-medium">Con producto vencido:</span>{" "}
          {vencidos.map((a) => a.nombre).join(", ")}
        </p>
      )}
    </Aviso>
  );
}

export function PanelMovimientos({ movimientos }: { movimientos: MovimientoReciente[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Movimientos recientes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {movimientos.length === 0 ? (
          <p className="text-muted-foreground">Sin movimientos.</p>
        ) : (
          movimientos.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 border-b pb-2 last:border-0"
            >
              <div>
                <p className="font-medium">{m.producto}</p>
                <p className="text-xs text-muted-foreground">
                  {formatoFecha(m.fecha)}
                  {m.obs ? ` · ${m.obs}` : ""}
                </p>
              </div>
              <span
                className={
                  m.tipo === "entrada"
                    ? "font-medium text-exito-fuerte"
                    : m.tipo === "salida"
                      ? "font-medium text-peligro-fuerte"
                      : "font-medium"
                }
              >
                {m.tipo === "entrada" ? "+" : m.tipo === "salida" ? "−" : "±"}
                {formatoNumero(m.cantidad, 1)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/** Lo que vale lo que hay en la bodega (de lo que tiene costo capturado). */
export function valorDe(existencias: ExistenciaDetalle[]): number {
  return existencias.reduce(
    (s, p) => s + (p.costo_unitario != null ? p.costo_unitario * p.existencia : 0),
    0
  );
}
