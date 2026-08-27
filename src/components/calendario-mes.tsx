import Link from "next/link";
import { cn } from "@/lib/utils";
import { aISO, alMediodia, fechaHoy } from "@/lib/fechas";

export type ElementoAgenda = {
  fecha: string; // YYYY-MM-DD
  capa: string;
  etiqueta: string;
  href?: string;
};

export type CapaAgenda = {
  clave: string;
  etiqueta: string;
  /** Token CSS del punto, p. ej. "var(--chart-1)". */
  color: string;
};

const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

/**
 * Calendario de mes, armado en el servidor: 42 celdas y puntos de colores.
 * Sin librerías: un mes son seis semanas de CSS grid. Los eventos del rancho
 * no tienen hora, así que el calendario es de días, no de horas.
 */
export function CalendarioMes({
  mes,
  elementos,
  capas,
  hrefDia,
  diaActivo,
}: {
  /** "YYYY-MM" del mes a pintar. */
  mes: string;
  elementos: ElementoAgenda[];
  capas: CapaAgenda[];
  /** Arma el href del día (para abrir su panel). */
  hrefDia: (fecha: string) => string;
  diaActivo?: string | null;
}) {
  const color = new Map(capas.map((c) => [c.clave, c.color]));
  const porDia = new Map<string, ElementoAgenda[]>();
  for (const e of elementos) {
    const lista = porDia.get(e.fecha);
    if (lista) lista.push(e);
    else porDia.set(e.fecha, [e]);
  }

  const primero = alMediodia(`${mes}-01`);
  // Lunes de la primera semana visible.
  const inicio = new Date(primero);
  inicio.setDate(primero.getDate() - ((primero.getDay() + 6) % 7));
  const hoy = fechaHoy();

  const celdas = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const fecha = aISO(d);
    return {
      fecha,
      dia: d.getDate(),
      delMes: fecha.slice(0, 7) === mes,
      esHoy: fecha === hoy,
      elementos: porDia.get(fecha) ?? [],
    };
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
        {DIAS.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {celdas.map((c) => (
          <Link
            key={c.fecha}
            href={hrefDia(c.fecha)}
            className={cn(
              "min-h-16 border-b border-r p-1 align-top transition-colors hover:bg-accent/50 sm:min-h-24 sm:p-1.5 [&:nth-child(7n)]:border-r-0",
              !c.delMes && "bg-muted/30 text-muted-foreground",
              c.fecha === diaActivo && "bg-accent"
            )}
          >
            <span
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full text-xs",
                c.esHoy && "bg-primary font-semibold text-primary-foreground"
              )}
            >
              {c.dia}
            </span>
            {/* En pantalla chica solo puntos; en grande hasta 3 renglones. */}
            <div className="mt-0.5 flex flex-wrap gap-0.5 sm:hidden">
              {c.elementos.slice(0, 6).map((e, i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full"
                  style={{ background: color.get(e.capa) ?? "var(--color-muted-foreground)" }}
                />
              ))}
            </div>
            <ul className="mt-0.5 hidden space-y-0.5 sm:block">
              {c.elementos.slice(0, 3).map((e, i) => (
                <li key={i} className="flex items-center gap-1 text-xs leading-tight">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: color.get(e.capa) ?? "var(--color-muted-foreground)" }}
                  />
                  <span className="min-w-0 truncate">{e.etiqueta}</span>
                </li>
              ))}
              {c.elementos.length > 3 && (
                <li className="text-xs text-muted-foreground">
                  +{c.elementos.length - 3} más
                </li>
              )}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
