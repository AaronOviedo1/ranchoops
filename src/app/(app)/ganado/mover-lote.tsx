"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
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
import { etiquetaClase } from "@/lib/catalogos";

type AnimalMini = {
  id: string;
  arete_control: string | null;
  siniga: string | null;
  clase: string;
  grupo_nombre?: string | null;
};

/**
 * Mueve varios animales de una sola vez.
 *
 * Antes había que entrar animal por animal a su ficha. Arranca con todos los
 * que están en pantalla ya marcados, porque lo normal es filtrar primero
 * ("las vaquillas del grupo A") y mover el resultado completo.
 */
export function DialogoMoverLote({
  action,
  animales,
  grupos,
  divisiones,
}: {
  action: (formData: FormData) => Promise<void>;
  animales: AnimalMini[];
  grupos: { id: string; nombre: string }[];
  divisiones: { id: string; nombre: string }[];
}) {
  const [filtro, setFiltro] = useState("");
  const [seleccion, setSeleccion] = useState<Set<string>>(
    () => new Set(animales.map((a) => a.id))
  );
  const [destino, setDestino] = useState<"grupo" | "division">("grupo");

  const visibles = useMemo(() => {
    const f = filtro.toLowerCase();
    return animales.filter(
      (a) =>
        !f ||
        a.arete_control?.toLowerCase().includes(f) ||
        a.siniga?.toLowerCase().includes(f)
    );
  }, [animales, filtro]);

  const alternar = (id: string) =>
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline">
            <ArrowRightLeft className="h-4 w-4" /> Mover en lote
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mover {seleccion.size} animales</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-3">
          <Input
            placeholder="Filtrar por arete o SINIIGA…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{seleccion.size} seleccionados</span>
            <button
              type="button"
              className="underline"
              onClick={() =>
                setSeleccion(
                  seleccion.size === visibles.length
                    ? new Set()
                    : new Set(visibles.map((v) => v.id))
                )
              }
            >
              {seleccion.size === visibles.length ? "Quitar todos" : "Seleccionar visibles"}
            </button>
          </div>

          <ScrollArea className="h-56 rounded-md border">
            <div className="divide-y">
              {visibles.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={seleccion.has(a.id)}
                    onCheckedChange={() => alternar(a.id)}
                  />
                  <span className="font-medium">#{a.arete_control ?? "s/n"}</span>
                  <span className="text-muted-foreground">{etiquetaClase(a.clase)}</span>
                  {a.grupo_nombre && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      en {a.grupo_nombre}
                    </span>
                  )}
                </label>
              ))}
              {visibles.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Sin resultados.</p>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-1.5">
            {(["grupo", "division"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDestino(d)}
                className={
                  "rounded-full border px-3 py-1 text-sm " +
                  (destino === d ? "border-primary bg-accent font-medium" : "")
                }
              >
                {d === "grupo" ? "A otro grupo" : "A otra división"}
              </button>
            ))}
          </div>
          <input type="hidden" name="destino" value={destino} />

          {destino === "grupo" ? (
            <div className="space-y-2">
              <Label>Grupo destino</Label>
              <SelectCampo
                name="grupo_id"
                opcionVacia="Sin grupo"
                opciones={grupos.map((g) => ({ valor: g.id, etiqueta: g.nombre }))}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>División destino</Label>
              <SelectCampo
                name="division_id"
                opcionVacia="Sin división"
                opciones={divisiones.map((d) => ({ valor: d.id, etiqueta: d.nombre }))}
              />
              <p className="text-xs text-muted-foreground">
                Los costos se cargan a la división, no al grupo.
              </p>
            </div>
          )}

          {[...seleccion].map((id) => (
            <input key={id} type="hidden" name="animal_id" value={id} />
          ))}

          <Button type="submit" className="w-full" disabled={seleccion.size === 0}>
            Mover {seleccion.size} {seleccion.size === 1 ? "animal" : "animales"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
