"use client";

import { useMemo, useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectCampo } from "@/components/ui/select-campo";
import { etiquetaClase, etiquetaReproductivo } from "@/lib/catalogos";

type AnimalMini = { id: string; clase: string; status_reproductivo: string | null };

/**
 * Arma un grupo con los animales que están en cierto estado.
 *
 * "Ya que checo preñeces, ahí voy a hacer grupos: las cargadas por un lado,
 * las vacías por otro, y las vacías horras al grupo de venta."
 */
export function DialogoGrupoPorEstado({
  action,
  animales,
  divisiones,
}: {
  action: (formData: FormData) => Promise<void>;
  animales: AnimalMini[];
  divisiones: { id: string; nombre: string }[];
}) {
  const [estados, setEstados] = useState<Set<string>>(new Set());
  const [clases, setClases] = useState<Set<string>>(new Set());

  // Solo los estados y clases que este rancho realmente tiene capturados.
  const estadosPresentes = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const a of animales) {
      if (a.status_reproductivo) {
        cuenta.set(a.status_reproductivo, (cuenta.get(a.status_reproductivo) ?? 0) + 1);
      }
    }
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
  }, [animales]);

  const clasesPresentes = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const a of animales) cuenta.set(a.clase, (cuenta.get(a.clase) ?? 0) + 1);
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
  }, [animales]);

  const alternar = (set: Set<string>, aplicar: (s: Set<string>) => void, v: string) => {
    const s = new Set(set);
    if (s.has(v)) s.delete(v);
    else s.add(v);
    aplicar(s);
  };

  // Cuántos caerían en el grupo con los criterios de ahorita.
  const alcance = useMemo(() => {
    if (estados.size === 0 && clases.size === 0) return 0;
    return animales.filter(
      (a) =>
        (estados.size === 0 || (a.status_reproductivo && estados.has(a.status_reproductivo))) &&
        (clases.size === 0 || clases.has(a.clase))
    ).length;
  }, [animales, estados, clases]);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Wand2 className="h-4 w-4" /> Grupo por estado
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grupo por estado</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre-estado">Nombre</Label>
            <Input
              id="nombre-estado"
              name="nombre"
              placeholder="Cargadas, Vacías para venta…"
              required
            />
          </div>

          {estadosPresentes.length > 0 && (
            <div className="space-y-2">
              <Label>Estado reproductivo</Label>
              <ScrollArea className="max-h-40 rounded-md border">
                <div className="divide-y">
                  {estadosPresentes.map(([valor, n]) => (
                    <label
                      key={valor}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Checkbox
                        checked={estados.has(valor)}
                        onCheckedChange={() => alternar(estados, setEstados, valor)}
                      />
                      {etiquetaReproductivo(valor)}
                      <span className="ml-auto text-xs text-muted-foreground">{n}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="space-y-2">
            <Label>Clase (opcional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {clasesPresentes.map(([valor, n]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => alternar(clases, setClases, valor)}
                  className={
                    "rounded-full border px-2.5 py-0.5 text-sm " +
                    (clases.has(valor) ? "border-primary bg-accent font-medium" : "")
                  }
                >
                  {etiquetaClase(valor)}
                  <span className="ml-1 text-xs text-muted-foreground">{n}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>División</Label>
            <SelectCampo
              name="division_id"
              opciones={divisiones.map((d) => ({ valor: d.id, etiqueta: d.nombre }))}
            />
            <p className="text-xs text-muted-foreground">
              Los costos se cargan a la división, no al grupo.
            </p>
          </div>

          {[...estados].map((e) => (
            <input key={e} type="hidden" name="estado" value={e} />
          ))}
          {[...clases].map((c) => (
            <input key={c} type="hidden" name="clase" value={c} />
          ))}

          <Button type="submit" className="w-full" disabled={alcance === 0}>
            {alcance === 0
              ? "Elige un criterio"
              : `Crear con ${alcance} ${alcance === 1 ? "animal" : "animales"}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
