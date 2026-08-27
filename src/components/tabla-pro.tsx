import { cookies } from "next/headers";
import {
  TablaResponsiva,
  type Columna,
} from "@/components/tabla-responsiva";
import {
  COOKIE_TABLA,
  parsearPreferenciasTabla,
} from "@/lib/preferencias-tabla";
import { TablaProControles } from "@/components/tabla-pro-controles";

export type ColumnaPro<T> = Columna<T> & {
  /** Nombre de la columna para el selector (si `encabezado` no es texto). */
  etiqueta?: string;
  /** No se puede ocultar (arete, nombre del potrero…). */
  fija?: boolean;
  /** Oculta por default; la prende quien la quiera ver. */
  apagada?: boolean;
  /** Valor plano de la fila, para poder agrupar por esta columna. */
  valorDe?: (fila: T) => string | number | null | undefined;
};

/**
 * TablaResponsiva con controles estilo hoja de cálculo: elegir columnas,
 * agrupar y exportar. Las preferencias viven en una cookie por tabla
 * (ver preferencias-tabla.ts), así que la tabla sigue siendo un server
 * component y las funciones `celda` nunca cruzan al cliente.
 */
export async function TablaPro<T>({
  id,
  datos,
  columnas,
  claveDe,
  hrefDe,
  vacio,
  puntoDeCorte,
  agrupables = [],
  exportarHref,
  className,
}: {
  /** Identificador estable de la tabla; nombra la cookie `tp_<id>`. */
  id: string;
  datos: T[];
  columnas: ColumnaPro<T>[];
  claveDe: (fila: T) => string;
  hrefDe?: (fila: T) => string;
  vacio?: React.ReactNode;
  puntoDeCorte?: "sm" | "md";
  /** Claves de columnas por las que se puede agrupar (necesitan `valorDe`). */
  agrupables?: string[];
  /** Route de export de la sección; se le anexan los filtros vigentes. */
  exportarHref?: string;
  className?: string;
}) {
  const prefs = parsearPreferenciasTabla(
    (await cookies()).get(COOKIE_TABLA(id))?.value
  );

  const nombreDe = (c: ColumnaPro<T>) =>
    c.etiqueta ?? (typeof c.encabezado === "string" ? c.encabezado : c.clave);

  const visibles = columnas.filter((c) =>
    c.fija ? true : prefs.c ? prefs.c.includes(c.clave) : !c.apagada
  );

  const grupoValido =
    prefs.g && agrupables.includes(prefs.g)
      ? columnas.find((c) => c.clave === prefs.g && c.valorDe)
      : undefined;

  const controles = (
    <TablaProControles
      id={id}
      columnas={columnas.map((c) => ({
        clave: c.clave,
        etiqueta: nombreDe(c),
        fija: !!c.fija,
        visible: visibles.some((v) => v.clave === c.clave),
      }))}
      agrupables={agrupables
        .map((clave) => columnas.find((c) => c.clave === clave))
        .filter((c): c is ColumnaPro<T> => !!c?.valorDe)
        .map((c) => ({ clave: c.clave, etiqueta: nombreDe(c) }))}
      grupo={grupoValido?.clave ?? ""}
      exportarHref={exportarHref}
    />
  );

  if (datos.length === 0) {
    return (
      <div className={className}>
        {controles}
        {vacio ?? null}
      </div>
    );
  }

  if (!grupoValido) {
    return (
      <div className={className}>
        {controles}
        <TablaResponsiva
          datos={datos}
          columnas={visibles}
          claveDe={claveDe}
          hrefDe={hrefDe}
          vacio={vacio}
          puntoDeCorte={puntoDeCorte}
        />
      </div>
    );
  }

  // Agrupado: una tabla por grupo con su encabezado y conteo. Así el modo
  // tarjetas del teléfono queda agrupado igual, sin tocar TablaResponsiva.
  const valorDe = grupoValido.valorDe!;
  const grupos = new Map<string, T[]>();
  for (const fila of datos) {
    const v = valorDe(fila);
    const etiqueta = v == null || v === "" ? "—" : String(v);
    const lista = grupos.get(etiqueta);
    if (lista) lista.push(fila);
    else grupos.set(etiqueta, [fila]);
  }
  const ordenados = [...grupos.entries()].sort(([a], [b]) =>
    a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b, "es")
  );

  return (
    <div className={className}>
      {controles}
      <div className="space-y-6">
        {ordenados.map(([etiqueta, filas]) => (
          <section key={etiqueta}>
            <h3 className="mb-2 flex items-baseline gap-2 font-heading text-sm font-semibold">
              {etiqueta}
              <span className="text-xs font-normal text-muted-foreground">
                {filas.length}
              </span>
            </h3>
            <TablaResponsiva
              datos={filas}
              columnas={visibles}
              claveDe={claveDe}
              hrefDe={hrefDe}
              puntoDeCorte={puntoDeCorte}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
