"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { TooltipRanch } from "@/components/graficas/tooltip-ranch";

export type PuntoPeso = {
  /** Fecha corta ya formateada para el eje. */
  fecha: string;
  /** Peso real (nacimiento, destete, básculas). */
  peso?: number;
  /** Tramo punteado del último pesaje a la meta. */
  proyeccion?: number;
};

/**
 * Curva de peso del animal: los pesajes reales en línea sólida y, si tiene
 * meta (peso y fecha objetivo), el tramo que le falta en punteado.
 */
export function GraficaPeso({
  datos,
  alturaClase = "h-56",
  className,
}: {
  datos: PuntoPeso[];
  alturaClase?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full", alturaClase, className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="fecha"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={44}
            domain={["auto", "auto"]}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-muted)", strokeWidth: 1 }}
            content={<TooltipRanch formato="numero" sufijo=" kg" />}
          />
          <Line
            type="monotone"
            dataKey="peso"
            name="Peso"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="proyeccion"
            name="Meta"
            stroke="var(--chart-2)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
