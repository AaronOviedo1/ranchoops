"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { RESIDUOS } from "@/lib/catalogos";
import { SelectCampo } from "@/components/ui/select-campo";

type AnimalMini = {
  id: string;
  arete_control: string | null;
  siniga: string | null;
  clase: string;
  grupo_nombre?: string | null;
};

export function DialogoAgregarAnimales({
  action,
  candidatos,
}: {
  action: (formData: FormData) => Promise<void>;
  candidatos: AnimalMini[];
}) {
  const [filtro, setFiltro] = useState("");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const visibles = useMemo(() => {
    const f = filtro.toLowerCase();
    return candidatos.filter(
      (c) =>
        !f ||
        c.arete_control?.toLowerCase().includes(f) ||
        c.siniga?.toLowerCase().includes(f)
    );
  }, [candidatos, filtro]);

  const alternar = (id: string) => {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" /> Agregar animales
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar animales al grupo</DialogTitle>
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
          <ScrollArea className="h-64 rounded-md border">
            <div className="divide-y">
              {visibles.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={seleccion.has(c.id)}
                    onCheckedChange={() => alternar(c.id)}
                  />
                  <span className="font-medium">#{c.arete_control ?? "s/n"}</span>
                  <span className="capitalize text-muted-foreground">{c.clase}</span>
                  {c.grupo_nombre && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      en {c.grupo_nombre}
                    </span>
                  )}
                </label>
              ))}
              {visibles.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Sin resultados.</p>
              )}
            </div>
          </ScrollArea>
          {[...seleccion].map((id) => (
            <input key={id} type="hidden" name="animal_id" value={id} />
          ))}
          <Button type="submit" className="w-full" disabled={seleccion.size === 0}>
            Agregar {seleccion.size > 0 ? `(${seleccion.size})` : ""}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DialogoMoverPotrero({
  action,
  potreros,
  potreroActual,
  numAnimales,
}: {
  action: (formData: FormData) => Promise<void>;
  potreros: { id: string; nombre: string }[];
  potreroActual: string | null;
  numAnimales: number;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm">
            <ArrowRightLeft className="h-4 w-4" /> Mover de potrero
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover grupo de potrero</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-mov">Fecha</Label>
              <Input id="fecha-mov" name="fecha" type="date" defaultValue={hoy} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="num_animales"># animales</Label>
              <Input
                id="num_animales"
                name="num_animales"
                type="number"
                defaultValue={numAnimales || ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Potrero destino</Label>
            <SelectCampo
              name="potrero_id"
              opcionVacia="Sin potrero (solo salida)"
              placeholder="Sin potrero (solo salida)"
              opciones={potreros.map((p) => ({
                valor: p.id,
                etiqueta: `${p.nombre}${p.id === potreroActual ? " (actual)" : ""}`,
                deshabilitada: p.id === potreroActual,
              }))}
            />
          </div>
          {potreroActual && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Calif. buñiga (1–4)</Label>
                <Input name="calif_buniga" type="number" step="0.5" min={1} max={4} />
              </div>
              <div className="space-y-2">
                <Label>Residuo</Label>
                <SelectCampo
                  name="residuo"
                  opciones={RESIDUOS.map((r) => ({ valor: r, etiqueta: r }))}
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="obs-mov">Observaciones</Label>
            <Textarea id="obs-mov" name="obs" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Registrar movimiento
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
