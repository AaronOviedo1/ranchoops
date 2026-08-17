import { cn } from "@/lib/utils";
import type { Tono } from "@/lib/estados";

const RELLENO: Record<Tono, string> = {
  exito: "bg-exito",
  alerta: "bg-alerta",
  peligro: "bg-peligro",
  neutro: "bg-neutro",
  info: "bg-info",
  marca: "bg-marca",
};

export type SegmentoSemaforo = {
  clave: string;
  etiqueta: string;
  valor: number;
  tono: Tono;
};

/** Barra apilada al 100%. CSS puro: no carga recharts. */
export function BarraSemaforo({
  segmentos,
  leyenda = true,
  altura = "md",
  className,
}: {
  segmentos: SegmentoSemaforo[];
  leyenda?: boolean;
  altura?: "sm" | "md";
  className?: string;
}) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  const conValor = segmentos.filter((s) => s.valor > 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "flex w-full overflow-hidden rounded-full bg-muted",
          altura === "sm" ? "h-2" : "h-3"
        )}
      >
        {total > 0 &&
          conValor.map((s) => (
            <div
              key={s.clave}
              className={RELLENO[s.tono]}
              style={{ width: `${(s.valor / total) * 100}%` }}
              title={`${s.etiqueta}: ${s.valor}`}
            />
          ))}
      </div>
      {leyenda && (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {segmentos.map((s) => (
            <li key={s.clave} className="flex items-center gap-1.5">
              <span
                className={cn("size-2 shrink-0 rounded-full", RELLENO[s.tono])}
              />
              <span className="truncate text-muted-foreground">
                {s.etiqueta}
              </span>
              <span className="ml-auto font-medium tabular-nums">{s.valor}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
