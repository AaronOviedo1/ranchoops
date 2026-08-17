"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  TooltipRanch,
  formatear,
  type FormatoValor,
} from "@/components/graficas/tooltip-ranch";

export type SerieMes = {
  clave: string;
  etiqueta: string;
  color: string;
  tipo?: "barra" | "linea";
  punteada?: boolean;
};

/**
 * Serie mensual (12 puntos). Los colores llegan como "var(--chart-N)":
 * recharts los escribe en el atributo SVG y el navegador resuelve el token.
 */
export function GraficaSerieMes({
  datos,
  series,
  formato = "numero",
  sufijo = "",
  alturaClase = "h-56",
  className,
}: {
  datos: Record<string, number | string>[];
  series: SerieMes[];
  formato?: FormatoValor;
  sufijo?: string;
  alturaClase?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full", alturaClase, className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={datos}
          margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="mes"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={56}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: number) =>
              formato === "moneda"
                ? `${Math.round(v / 1000)}k`
                : formatear(v, formato, "")
            }
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
            content={<TooltipRanch formato={formato} sufijo={sufijo} />}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11 }}
          />
          {series.map((s) =>
            s.tipo === "linea" ? (
              <Line
                key={s.clave}
                type="monotone"
                dataKey={s.clave}
                name={s.etiqueta}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.punteada ? "4 3" : undefined}
                dot={false}
              />
            ) : (
              <Bar
                key={s.clave}
                dataKey={s.clave}
                name={s.etiqueta}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
