"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLASES_ANIMAL, formatoMoneda } from "@/lib/catalogos";

type Renglon = {
  clase: string;
  cabezas: string;
  kilos_venta: string;
  precio_kg: string;
  precio_cabeza: string;
};

type AnimalMini = {
  id: string;
  arete_control: string | null;
  clase: string;
};

function totalRenglon(r: Renglon): number {
  const cabezas = Number(r.cabezas) || 0;
  const kilos = Number(r.kilos_venta) || 0;
  const precioKg = Number(r.precio_kg) || 0;
  const precioCabeza = Number(r.precio_cabeza) || 0;
  if (precioCabeza > 0) return cabezas * precioCabeza;
  return kilos * precioKg;
}

export function FormularioVenta({
  action,
  divisiones,
  animales,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  divisiones: { id: string; nombre: string }[];
  animales: AnimalMini[];
  error?: string | null;
}) {
  const [renglones, setRenglones] = useState<Renglon[]>([
    { clase: "becerros", cabezas: "", kilos_venta: "", precio_kg: "", precio_cabeza: "" },
  ]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [mostrarAnimales, setMostrarAnimales] = useState(false);
  const [filtro, setFiltro] = useState("");

  const total = renglones.reduce((s, r) => s + totalRenglon(r), 0);
  const hoy = new Date().toISOString().slice(0, 10);

  const visibles = useMemo(
    () =>
      animales.filter(
        (a) => !filtro || a.arete_control?.toLowerCase().includes(filtro.toLowerCase())
      ),
    [animales, filtro]
  );

  const setCampo = (i: number, campo: keyof Renglon, valor: string) => {
    setRenglones((prev) => prev.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)));
  };

  const renglonesJson = JSON.stringify(
    renglones.map((r) => ({
      clase: r.clase,
      cabezas: Number(r.cabezas) || 0,
      kilos_venta: Number(r.kilos_venta) || null,
      precio_kg: Number(r.precio_kg) || null,
      precio_cabeza: Number(r.precio_cabeza) || null,
      total: totalRenglon(r),
    }))
  );

  return (
    <form action={action} className="max-w-3xl space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <input type="hidden" name="renglones" value={renglonesJson} />
      {[...seleccion].map((id) => (
        <input key={id} type="hidden" name="animal_id" value={id} />
      ))}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="fecha-v">Fecha</Label>
          <Input id="fecha-v" name="fecha" type="date" defaultValue={hoy} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="comprador">Comprador</Label>
          <Input id="comprador" name="comprador" placeholder="Subasta, particular…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guia">GUIA</Label>
          <Input id="guia" name="guia" placeholder="A-0133245" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reemo">REEMO</Label>
          <Input id="reemo" name="reemo" placeholder="1336517" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>División</Label>
        <select
          name="division_id"
          className="border-input h-9 w-full max-w-xs rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">—</option>
          {divisiones.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Renglones (por clase)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRenglones((prev) => [
                ...prev,
                { clase: "becerros", cabezas: "", kilos_venta: "", precio_kg: "", precio_cabeza: "" },
              ])
            }
          >
            <Plus className="h-4 w-4" /> Renglón
          </Button>
        </div>

        <div className="space-y-2">
          {renglones.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-2 items-end gap-2 rounded-md border p-3 sm:grid-cols-6"
            >
              <div className="space-y-1">
                <Label className="text-xs">Clase</Label>
                <select
                  value={r.clase}
                  onChange={(e) => setCampo(i, "clase", e.target.value)}
                  className="border-input h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                >
                  {CLASES_ANIMAL.map((c) => (
                    <option key={c.valor} value={c.plural.toLowerCase()}>
                      {c.plural}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cabezas</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={r.cabezas}
                  onChange={(e) => setCampo(i, "cabezas", e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kilos</Label>
                <Input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={r.kilos_venta}
                  onChange={(e) => setCampo(i, "kilos_venta", e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">$/kg</Label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={r.precio_kg}
                  onChange={(e) => setCampo(i, "precio_kg", e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">$/cabeza</Label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={r.precio_cabeza}
                  onChange={(e) => setCampo(i, "precio_cabeza", e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium tabular-nums">
                  {formatoMoneda(totalRenglon(r))}
                </span>
                {renglones.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => setRenglones((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-right text-lg font-semibold tabular-nums">
          Total: {formatoMoneda(total)}
        </p>
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <button
          type="button"
          className="text-sm font-medium underline"
          onClick={() => setMostrarAnimales((v) => !v)}
        >
          {mostrarAnimales ? "Ocultar" : "Ligar animales individuales (opcional)"}
          {seleccion.size > 0 && ` · ${seleccion.size} seleccionados`}
        </button>
        {mostrarAnimales && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Los animales seleccionados se marcarán como vendidos y saldrán del
              inventario activo (su historial se conserva).
            </p>
            <Input
              placeholder="Filtrar por arete…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            <div className="max-h-56 divide-y overflow-y-auto rounded-md border">
              {visibles.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={seleccion.has(a.id)}
                    onCheckedChange={() =>
                      setSeleccion((prev) => {
                        const s = new Set(prev);
                        if (s.has(a.id)) s.delete(a.id);
                        else s.add(a.id);
                        return s;
                      })
                    }
                  />
                  <span className="font-medium">#{a.arete_control ?? "s/n"}</span>
                  <span className="capitalize text-muted-foreground">{a.clase}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="obs-v">Notas</Label>
        <Textarea
          id="obs-v"
          name="obs"
          rows={2}
          placeholder="Se cambió por pacas, salió un viaje a subasta…"
        />
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Registrar venta {total > 0 && `(${formatoMoneda(total)})`}
      </Button>
    </form>
  );
}
