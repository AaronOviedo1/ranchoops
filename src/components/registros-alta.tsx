"use client";

import { useState } from "react";
import { Plus, Ruler, Scale, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoFecha } from "@/components/ui/campo-fecha";
import { SelectCampo } from "@/components/ui/select-campo";
import { AyudaInfo } from "@/components/ayuda-info";
import { EVENTOS_PESAJE, TIPOS_ARETE } from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";
import type { Potrero } from "@/lib/tipos";

/**
 * Lo que se le registra al animal el día que se da de alta.
 *
 * Cada bloque es opcional y trae su propia fecha: el arete se le puso el
 * martes, se pesó el jueves y se movió el viernes. Al guardar, cada bloque
 * abierto genera su evento con la fecha que trae, no con la de captura.
 */

type Bloque = "arete" | "movimiento" | "peso" | "condicion";

const BLOQUES: { id: Bloque; etiqueta: string; icono: typeof Tag }[] = [
  { id: "arete", etiqueta: "Arete", icono: Tag },
  { id: "movimiento", etiqueta: "Movimiento", icono: Plus },
  { id: "peso", etiqueta: "Peso", icono: Scale },
  { id: "condicion", etiqueta: "Condición corporal", icono: Ruler },
];

function Bloque({
  titulo,
  onQuitar,
  children,
}: {
  titulo: string;
  onQuitar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">{titulo}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Quitar ${titulo}`}
          onClick={onQuitar}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="grid gap-4 p-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function RegistrosAlta({ potreros }: { potreros: Potrero[] }) {
  const [abiertos, setAbiertos] = useState<Bloque[]>([]);
  const hoy = fechaHoy();

  const abrir = (b: Bloque) => setAbiertos((a) => [...a, b]);
  const cerrar = (b: Bloque) => setAbiertos((a) => a.filter((x) => x !== b));
  const disponibles = BLOQUES.filter((b) => !abiertos.includes(b.id));

  return (
    <div className="space-y-3">
      {disponibles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {disponibles.map((b) => (
            <Button
              key={b.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => abrir(b.id)}
            >
              <Plus className="size-4" /> {b.etiqueta}
            </Button>
          ))}
        </div>
      )}

      {abiertos.includes("arete") && (
        <Bloque titulo="Arete" onQuitar={() => cerrar("arete")}>
          <div className="space-y-2">
            <Label htmlFor="fecha_identificacion">Fecha de identificación</Label>
            <CampoFecha id="fecha_identificacion" name="fecha_identificacion" defaultValue={hoy} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo_arete">Tipo de arete</Label>
            <SelectCampo
              id="tipo_arete"
              name="tipo_arete"
              required
              placeholder="Haz una selección"
              opciones={TIPOS_ARETE.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
            />
          </div>
        </Bloque>
      )}

      {abiertos.includes("movimiento") && (
        <Bloque titulo="Movimiento" onQuitar={() => cerrar("movimiento")}>
          <div className="space-y-2">
            <Label htmlFor="fecha_movimiento">Fecha de entrada</Label>
            <CampoFecha id="fecha_movimiento" name="fecha_movimiento" defaultValue={hoy} required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="potrero_movimiento">Potrero</Label>
              <AyudaInfo titulo="Movimiento de un animal">
                Queda anotado a qué potrero entró y cuándo. El potrero en el que
                pastorea todos los días es el de su grupo: si lo cambias aquí no
                se mueve el grupo entero, solo se registra el movimiento de este
                animal.
              </AyudaInfo>
            </div>
            <SelectCampo
              id="potrero_movimiento"
              name="potrero_movimiento"
              placeholder="Sin potrero"
              opciones={potreros.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
            />
          </div>
        </Bloque>
      )}

      {abiertos.includes("peso") && (
        <Bloque titulo="Peso" onQuitar={() => cerrar("peso")}>
          <div className="space-y-2">
            <Label htmlFor="fecha_pesaje">Fecha de pesaje</Label>
            <CampoFecha id="fecha_pesaje" name="fecha_pesaje" defaultValue={hoy} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="peso">Peso (kg)</Label>
            <Input
              id="peso"
              name="peso"
              type="number"
              step="0.1"
              min={0}
              inputMode="decimal"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evento_pesaje">Evento de pesaje</Label>
            <SelectCampo
              id="evento_pesaje"
              name="evento_pesaje"
              defaultValue="control"
              opciones={EVENTOS_PESAJE.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta }))}
            />
          </div>
        </Bloque>
      )}

      {abiertos.includes("condicion") && (
        <Bloque titulo="Condición corporal" onQuitar={() => cerrar("condicion")}>
          <div className="space-y-2">
            <Label htmlFor="fecha_condicion">Fecha de condición corporal</Label>
            <CampoFecha id="fecha_condicion" name="fecha_condicion" defaultValue={hoy} required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="condicion">Puntaje</Label>
              <AyudaInfo titulo="Condición corporal">
                De 1 a 5: 1 es un animal en los huesos y 5 uno pasado de grasa.
                La vaca de cría anda bien entre 2.5 y 3.5; abajo de 2 le cuesta
                volver a cargar.
              </AyudaInfo>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="condicion"
                name="condicion"
                type="number"
                step="0.5"
                min={1}
                max={5}
                inputMode="decimal"
                required
              />
              <span className="shrink-0 text-sm text-muted-foreground">1 a 5</span>
            </div>
          </div>
        </Bloque>
      )}
    </div>
  );
}
