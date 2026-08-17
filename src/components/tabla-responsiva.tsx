import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Columna<T> = {
  clave: string;
  encabezado: React.ReactNode;
  celda: (fila: T) => React.ReactNode;
  /** Breakpoint desde el que la columna aparece en la vista de tabla. */
  desde?: "siempre" | "sm" | "md" | "lg";
  numerica?: boolean;
  /** Rol de la columna en la tarjeta de móvil. */
  enTarjeta?: "titulo" | "subtitulo" | "estado" | "campo" | "oculto";
};

const VISIBILIDAD = {
  siempre: "",
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
} as const;

/**
 * Tabla en escritorio, tarjetas en móvil.
 *
 * Todas las pantallas que la usan son server components, así que las
 * funciones `celda` se ejecutan en el servidor y nunca cruzan la frontera
 * cliente.
 */
export function TablaResponsiva<T>({
  datos,
  columnas,
  claveDe,
  hrefDe,
  vacio,
  puntoDeCorte = "md",
  className,
}: {
  datos: T[];
  columnas: Columna<T>[];
  claveDe: (fila: T) => string;
  hrefDe?: (fila: T) => string;
  vacio?: React.ReactNode;
  puntoDeCorte?: "sm" | "md";
  className?: string;
}) {
  if (datos.length === 0) return <>{vacio ?? null}</>;

  const tabla = puntoDeCorte === "sm" ? "hidden sm:block" : "hidden md:block";
  const tarjetas = puntoDeCorte === "sm" ? "sm:hidden" : "md:hidden";

  const titulo = columnas.find((c) => c.enTarjeta === "titulo") ?? columnas[0];
  const subtitulo = columnas.find((c) => c.enTarjeta === "subtitulo");
  const estado = columnas.find((c) => c.enTarjeta === "estado");
  const campos = columnas.filter(
    (c) =>
      c.enTarjeta === "campo" ||
      (c.enTarjeta === undefined && c !== titulo && c !== subtitulo && c !== estado)
  );

  return (
    <div className={className}>
      <div className={cn("overflow-x-auto rounded-xl border border-border", tabla)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columnas.map((c) => (
                <TableHead
                  key={c.clave}
                  className={cn(
                    VISIBILIDAD[c.desde ?? "siempre"],
                    c.numerica && "text-right"
                  )}
                >
                  {c.encabezado}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {datos.map((fila) => (
              <TableRow key={claveDe(fila)} className="relative">
                {columnas.map((c, i) => (
                  <TableCell
                    key={c.clave}
                    className={cn(
                      VISIBILIDAD[c.desde ?? "siempre"],
                      c.numerica && "text-right tabular-nums",
                      i === 0 && "font-medium"
                    )}
                  >
                    {i === 0 && hrefDe ? (
                      <Link
                        href={hrefDe(fila)}
                        className="after:absolute after:inset-0"
                      >
                        {c.celda(fila)}
                      </Link>
                    ) : (
                      c.celda(fila)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className={cn("space-y-2", tarjetas)}>
        {datos.map((fila) => {
          const cuerpo = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-heading font-semibold">
                    {titulo.celda(fila)}
                  </p>
                  {subtitulo && (
                    <p className="truncate text-xs text-muted-foreground">
                      {subtitulo.celda(fila)}
                    </p>
                  )}
                </div>
                {estado && <div className="shrink-0">{estado.celda(fila)}</div>}
              </div>
              {campos.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {campos.map((c) => (
                    <div key={c.clave} className="min-w-0">
                      <dt className="truncate text-muted-foreground">
                        {c.encabezado}
                      </dt>
                      <dd
                        className={cn(
                          "truncate font-medium",
                          c.numerica && "tabular-nums"
                        )}
                      >
                        {c.celda(fila)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          );

          return (
            <li key={claveDe(fila)}>
              {hrefDe ? (
                <Link
                  href={hrefDe(fila)}
                  className="block rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/50"
                >
                  {cuerpo}
                </Link>
              ) : (
                <div className="rounded-xl border border-border bg-card p-3">
                  {cuerpo}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
