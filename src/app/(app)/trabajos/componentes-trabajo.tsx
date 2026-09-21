"use client";

import { Check } from "lucide-react";
import { SelectCampo } from "@/components/ui/select-campo";
import {
  TIPOS_TRABAJO,
  formatoNumero,
  ordenarProductosPara,
} from "@/lib/catalogos";
import { cn } from "@/lib/utils";

// Lo que comparten el wizard en lote y la manga animal por animal.

export type ProductoTrabajo = {
  id: string;
  nombre: string;
  unidad: string;
  tipo: string;
  controlado: boolean;
  /** Lo que queda en bodega; si viene, se enseña junto al nombre. */
  existencia?: number | null;
};

/** Parto y muerte tienen su propio flujo en la ficha del animal. */
const FUERA_DEL_SELECTOR = ["parto", "muerte", "otro"];

/** La cuadrícula de "¿qué se le va a hacer al ganado?", con varios a la vez. */
export function SelectorTrabajos({
  activos,
  onAlternar,
  excluir = [],
}: {
  activos: string[];
  onAlternar: (tipo: string) => void;
  excluir?: string[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {TIPOS_TRABAJO.filter(
        (t) => !FUERA_DEL_SELECTOR.includes(t.valor) && !excluir.includes(t.valor)
      ).map((t) => {
        const activa = activos.includes(t.valor);
        return (
          <button
            key={t.valor}
            type="button"
            onClick={() => onAlternar(t.valor)}
            className={cn(
              "flex items-start gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-colors hover:bg-accent",
              activa && "border-primary bg-accent"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                activa && "border-primary bg-primary text-primary-foreground"
              )}
            >
              {activa && <Check className="size-3" />}
            </span>
            {t.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/**
 * El producto de un trabajo. En una vacunación salen primero las vacunas, y
 * cada renglón dice cuánto queda para no planear con lo que no hay.
 */
export function SelectorProducto({
  tipoTrabajo,
  productos,
  value,
  onValueChange,
  size,
}: {
  tipoTrabajo: string;
  productos: ProductoTrabajo[];
  value: string | null | undefined;
  onValueChange: (productoId: string | null) => void;
  size?: "sm" | "default";
}) {
  return (
    <SelectCampo
      size={size}
      value={value ?? ""}
      onValueChange={(v) => onValueChange(v || null)}
      opcionVacia="Sin producto"
      placeholder="Sin producto"
      opciones={ordenarProductosPara(tipoTrabajo, productos).map((p) => ({
        valor: p.id,
        etiqueta: [
          `${p.nombre} (${p.unidad})`,
          p.existencia != null ? `quedan ${formatoNumero(p.existencia, 1)}` : null,
          p.controlado ? "controlado" : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }))}
    />
  );
}
