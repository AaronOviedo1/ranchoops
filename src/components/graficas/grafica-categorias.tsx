"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
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

export type Categoria = {
  etiqueta: string;
  valor: number;
  color?: string;
};

/** Barras horizontales ordenadas: comparar categorías de un vistazo. */
export function GraficaCategorias({
  datos,
  formato = "numero",
  alturaClase = "h-64",
  className,
}: {
  datos: Categoria[];
  formato?: FormatoValor;
  alturaClase?: string;
  className?: string;
}) {
  const ordenados = [...datos].sort((a, b) => b.valor - a.valor);

  return (
    <div className={cn("w-full", alturaClase, className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={ordenados}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="etiqueta"
            axisLine={false}
            tickLine={false}
            width={82}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
            content={<TooltipRanch formato={formato} />}
          />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {ordenados.map((d, i) => (
              <Cell key={i} fill={d.color ?? "var(--color-chart-1)"} />
            ))}
            <LabelList
              dataKey="valor"
              position="right"
              className="fill-foreground"
              fontSize={11}
              formatter={(v: unknown) => formatear(Number(v ?? 0), formato)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
