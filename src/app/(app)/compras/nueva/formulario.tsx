"use client";

import { fechaHoy } from "@/lib/fechas";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLASES_ANIMAL, formatoMoneda } from "@/lib/catalogos";
import { Aviso } from "@/components/aviso";
import { SelectCampo } from "@/components/ui/select-campo";
import { CampoFecha } from "@/components/ui/campo-fecha";

type Renglon = {
  clase: string;
  cabezas: string;
  kilos: string;
  precio_kg: string;
  precio_cabeza: string;
};

function totalRenglon(r: Renglon): number {
  const cabezas = Number(r.cabezas) || 0;
  const kilos = Number(r.kilos) || 0;
  const precioKg = Number(r.precio_kg) || 0;
  const precioCabeza = Number(r.precio_cabeza) || 0;
  if (precioCabeza > 0) return cabezas * precioCabeza;
  return kilos * precioKg;
}

const RENGLON_VACIO: Renglon = {
  clase: "becerros",
  cabezas: "",
  kilos: "",
  precio_kg: "",
  precio_cabeza: "",
};

export function FormularioCompra({
  action,
  divisiones,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  divisiones: { id: string; nombre: string }[];
  error?: string | null;
}) {
  const [renglones, setRenglones] = useState<Renglon[]>([RENGLON_VACIO]);
  const [division, setDivision] = useState("");
  const total = renglones.reduce((s, r) => s + totalRenglon(r), 0);

  const setCampo = (i: number, campo: keyof Renglon, valor: string) => {
    setRenglones((prev) => prev.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)));
  };

  const renglonesJson = JSON.stringify(
    renglones.map((r) => ({
      clase: r.clase,
      cabezas: Number(r.cabezas) || 0,
      kilos: Number(r.kilos) || null,
      precio_kg: Number(r.precio_kg) || null,
      precio_cabeza: Number(r.precio_cabeza) || null,
      total: totalRenglon(r),
    }))
  );

  return (
    <form action={action} className="max-w-3xl space-y-6">
      {error && <Aviso tono="peligro">{error}</Aviso>}
      <input type="hidden" name="renglones" value={renglonesJson} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="fecha-c">Fecha</Label>
          <CampoFecha id="fecha-c" name="fecha" defaultValue={fechaHoy()} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proveedor-c">Proveedor</Label>
          <Input id="proveedor-c" name="proveedor" placeholder="Subasta, vecino…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guia-c">GUIA</Label>
          <Input id="guia-c" name="guia" placeholder="A-0133245" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reemo-c">REEMO</Label>
          <Input id="reemo-c" name="reemo" placeholder="1336517" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>División a la que entra</Label>
        <SelectCampo
          name="division_id"
          className="max-w-xs"
          value={division}
          onValueChange={setDivision}
          opciones={divisiones.map((d) => ({ valor: d.id, etiqueta: d.nombre }))}
        />
        <p className="text-xs text-muted-foreground">
          Los costos se cargan a la división, no al grupo.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Renglones (por clase)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRenglones((prev) => [...prev, RENGLON_VACIO])}
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
                <SelectCampo
                  value={r.clase}
                  onValueChange={(v) => setCampo(i, "clase", v)}
                  opcionVacia={false}
                  opciones={CLASES_ANIMAL.map((c) => ({
                    valor: c.plural.toLowerCase(),
                    etiqueta: c.plural,
                  }))}
                />
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
                  value={r.kilos}
                  onChange={(e) => setCampo(i, "kilos", e.target.value)}
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

      <label className="flex items-start gap-2 text-sm">
        <Checkbox name="crear_gasto" defaultChecked className="mt-0.5" />
        <span>
          Registrar el gasto en la división
          {!division && (
            <span className="block text-xs text-muted-foreground">
              Elige la división de arriba para que el gasto tenga a dónde cargarse.
            </span>
          )}
        </span>
      </label>

      <div className="space-y-2">
        <Label htmlFor="obs-c">Notas</Label>
        <Textarea
          id="obs-c"
          name="obs"
          rows={2}
          placeholder="Lote de repasto para Agua Blanca…"
        />
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Registrar compra {total > 0 && `(${formatoMoneda(total)})`}
      </Button>
    </form>
  );
}
