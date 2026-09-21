"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoFecha } from "@/components/ui/campo-fecha";
import { Aviso } from "@/components/aviso";
import { TIPOS_TRABAJO, formatoNumero, trabajo } from "@/lib/catalogos";
import type { PasoPlantilla } from "@/lib/tipos";
import {
  SelectorProducto,
  SelectorTrabajos,
  type ProductoTrabajo,
} from "../componentes-trabajo";
import type { EstadoJornada, TrabajoBase } from "./estado";

export type PlantillaManga = { id: string; nombre: string; pasos: PasoPlantilla[] };

// Tratamientos y curaciones piden foto del animal: no son "para todos", se
// agregan en la tarjeta del que lo necesita.
const SOLO_POR_ANIMAL = TIPOS_TRABAJO.filter((t) => t.requiereFoto).map((t) => t.valor);

/**
 * Antes de abrir la trampa: qué se le va a hacer a todos y con qué. Después,
 * en cada animal, esto sale ya marcado y se le quita o se le cambia a quien
 * no le toque.
 */
export function PrepararJornada({
  estado,
  productos,
  plantillas,
  onCambio,
  onEmpezar,
}: {
  estado: EstadoJornada;
  productos: ProductoTrabajo[];
  plantillas: PlantillaManga[];
  onCambio: (cambios: Partial<EstadoJornada>) => void;
  onEmpezar: () => void;
}) {
  const alternar = (tipo: string) =>
    onCambio({
      base: estado.base.some((b) => b.tipo === tipo)
        ? estado.base.filter((b) => b.tipo !== tipo)
        : [...estado.base, { tipo, producto_id: null, cantidad_por_animal: null, dosis: null }],
    });

  const editar = (tipo: string, cambios: Partial<TrabajoBase>) =>
    onCambio({ base: estado.base.map((b) => (b.tipo === tipo ? { ...b, ...cambios } : b)) });

  const aplicarPlantilla = (p: PlantillaManga) =>
    onCambio({
      base: p.pasos
        .filter((paso) => !SOLO_POR_ANIMAL.includes(paso.tipo))
        .map((paso) => ({
          tipo: paso.tipo,
          producto_id: paso.producto_id,
          cantidad_por_animal: paso.cantidad_por_animal ?? null,
          dosis: paso.dosis,
        })),
    });

  const conProducto = estado.base.filter((b) => trabajo(b.tipo)?.usaProducto);
  // También cuenta el controlado que se le puso a un solo animal.
  const usados = [
    ...estado.base.map((b) => b.producto_id),
    ...estado.capturados.flatMap((c) => c.trabajos.map((t) => t.producto_id)),
  ];
  const hayControlado = productos.some((p) => p.controlado && usados.includes(p.id));
  const faltaReceta = hayControlado && !(estado.mvz.trim() && estado.receta_folio.trim());

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="fecha-manga">Fecha</Label>
          <CampoFecha
            id="fecha-manga"
            value={estado.fecha}
            onValueChange={(fecha) => onCambio({ fecha })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="responsable-manga">Responsable</Label>
          <Input
            id="responsable-manga"
            value={estado.responsable}
            placeholder="Vaquero, MVZ…"
            onChange={(e) => onCambio({ responsable: e.target.value })}
          />
        </div>
      </div>

      {plantillas.length > 0 && (
        <div>
          <h2 className="mb-2 font-medium">Repetir una jornada guardada</h2>
          <div className="flex flex-wrap gap-1.5">
            {plantillas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => aplicarPlantilla(p)}
                className="rounded-full border px-3 py-1 text-sm hover:bg-accent"
              >
                {p.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-1 font-medium">¿Qué se les va a hacer hoy?</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Esto le sale ya marcado a cada animal que pase. Al que no le toque se
          lo quitas ahí mismo, y al que necesite algo más (una curación, otra
          vacuna) se lo agregas solo a él.
        </p>
        <SelectorTrabajos
          activos={estado.base.map((b) => b.tipo)}
          onAlternar={alternar}
          excluir={SOLO_POR_ANIMAL}
        />
      </div>

      {conProducto.map((b) => {
        const producto = productos.find((p) => p.id === b.producto_id);
        const sinExistencia = producto?.existencia != null && producto.existencia <= 0;
        return (
          <fieldset key={b.tipo} className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">{trabajo(b.tipo)?.etiqueta}</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Producto (descuenta inventario)</Label>
                <SelectorProducto
                  tipoTrabajo={b.tipo}
                  productos={productos}
                  value={b.producto_id}
                  onValueChange={(producto_id) => editar(b.tipo, { producto_id })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Cantidad por animal{producto ? ` (${producto.unidad})` : ""}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={b.cantidad_por_animal ?? ""}
                  onChange={(e) =>
                    editar(b.tipo, {
                      cantidad_por_animal: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Dosis por animal</Label>
                <Input
                  placeholder="5 ml IM"
                  value={b.dosis ?? ""}
                  onChange={(e) => editar(b.tipo, { dosis: e.target.value || null })}
                />
              </div>
            </div>
            {sinExistencia && (
              <Aviso tono="alerta">
                Según el inventario quedan {formatoNumero(producto.existencia ?? 0, 1)}{" "}
                {producto.unidad} de {producto.nombre}. Se puede trabajar igual; falta
                registrar la entrada.
              </Aviso>
            )}
          </fieldset>
        );
      })}

      {/* Controlados: sin MVZ y folio no se guarda. Se captura una vez por jornada. */}
      {hayControlado && (
        <div className="grid grid-cols-2 gap-3 rounded-md bg-alerta-suave p-2.5">
          <p className="col-span-2 text-xs text-alerta-fuerte">
            Hay un producto controlado: el uso tiene que quedar comprobable.
          </p>
          <div className="space-y-2">
            <Label>MVZ responsable</Label>
            <Input value={estado.mvz} onChange={(e) => onCambio({ mvz: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Folio de receta</Label>
            <Input
              value={estado.receta_folio}
              onChange={(e) => onCambio({ receta_folio: e.target.value })}
            />
          </div>
        </div>
      )}

      <Button className="w-full" size="lg" disabled={faltaReceta} onClick={onEmpezar}>
        {estado.capturados.length > 0 ? "Seguir pasando animales" : "Abrir la trampa"}
      </Button>
      {estado.base.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Sin trabajos para todos: a cada animal le pondrás lo suyo.
        </p>
      )}
    </div>
  );
}
