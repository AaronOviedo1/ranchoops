"use client";

import { Pencil, Trash2 } from "lucide-react";
import { etiquetaTrabajo, formatoNumero } from "@/lib/catalogos";
import { cn } from "@/lib/utils";
import type { Capturado, Destino } from "./estado";
import type { AnimalManga } from "./tarjeta-animal";

/** Los que ya pasaron, con lo que se le hizo a cada uno. */
export function ListaCapturados({
  capturados,
  animales,
  grupos,
  onEditar,
  onMarcar,
  onQuitar,
}: {
  capturados: Capturado[];
  animales: Map<string, AnimalManga>;
  grupos: { id: string; nombre: string }[];
  onEditar: (animalId: string) => void;
  onMarcar: (animalId: string, destino: Destino) => void;
  onQuitar: (animalId: string) => void;
}) {
  const conPeso = capturados.filter((c) => c.peso != null);
  const aVenta = capturados.filter((c) => c.destino === "venta").length;
  const separados = capturados.filter((c) => c.separarA).length;
  const totalKilos = conPeso.reduce((s, c) => s + (c.peso ?? 0), 0);

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-3 py-2">
        <h2 className="font-medium">{capturados.length} en la jornada</h2>
        <p className="text-sm text-muted-foreground">
          {[
            conPeso.length > 0 &&
              `${formatoNumero(totalKilos, 0)} kg · promedio ${formatoNumero(totalKilos / conPeso.length, 1)} kg`,
            aVenta > 0 && `${aVenta} a venta`,
            separados > 0 && `${separados} ${separados === 1 ? "separado" : "separados"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <ul className="max-h-96 divide-y overflow-y-auto">
        {/* El último que pasó va arriba: es el que se quiere revisar. */}
        {[...capturados].reverse().map((c) => {
          const animal = animales.get(c.animalId);
          const grupo = grupos.find((g) => g.id === c.separarA);
          return (
            <li key={c.animalId} className="space-y-1 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 font-medium">
                  #{animal?.arete_control ?? "s/n"}
                </span>
                {c.peso != null && (
                  <span className="shrink-0 text-muted-foreground">
                    {formatoNumero(c.peso, 1)} kg
                  </span>
                )}
                {(["venta", "desecho"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onMarcar(c.animalId, c.destino === d ? null : d)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs",
                      c.destino === d && "border-primary bg-accent font-medium"
                    )}
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label={`Corregir ${animal?.arete_control ?? ""}`}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  onClick={() => onEditar(c.animalId)}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Quitar ${animal?.arete_control ?? ""}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onQuitar(c.animalId)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="pl-[4.5rem] text-xs text-muted-foreground">
                {[
                  c.trabajos.map((t) => etiquetaTrabajo(t.tipo)).join(" + ") || "sin trabajos",
                  grupo && `→ ${grupo.nombre}`,
                  c.obs,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
