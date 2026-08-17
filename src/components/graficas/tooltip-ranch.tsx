"use client";

import { formatoMoneda, formatoNumero } from "@/lib/catalogos";

export type FormatoValor = "numero" | "moneda" | "decimal1";

export function formatear(valor: number, formato: FormatoValor, sufijo = "") {
  if (formato === "moneda") return formatoMoneda(valor);
  if (formato === "decimal1") return `${formatoNumero(valor, 1)}${sufijo}`;
  return `${formatoNumero(valor)}${sufijo}`;
}

type Entrada = {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
};

/** El tooltip de recharts ignora los tokens; este usa las superficies de la app. */
export function TooltipRanch({
  active,
  payload,
  label,
  formato = "numero",
  sufijo = "",
}: {
  active?: boolean;
  payload?: Entrada[];
  label?: string | number;
  formato?: FormatoValor;
  sufijo?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg ring-1 ring-border">
      {label != null && (
        <p className="mb-1 font-heading font-semibold">{label}</p>
      )}
      <ul className="space-y-0.5">
        {payload.map((e, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: e.color }}
            />
            <span className="text-muted-foreground">{e.name}</span>
            <span className="ml-auto font-medium tabular-nums">
              {formatear(Number(e.value ?? 0), formato, sufijo)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
