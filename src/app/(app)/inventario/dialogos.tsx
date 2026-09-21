"use client";

import { useState } from "react";
import { PackagePlus, Plus } from "lucide-react";
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
import { SelectCampo } from "@/components/ui/select-campo";
import { CampoFecha } from "@/components/ui/campo-fecha";
import {
  TIPOS_PRODUCTO,
  categoriaDeTipo,
  type CategoriaInventario,
} from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";
import { crearProducto, registrarEntrada } from "./acciones";

/**
 * Alta de producto. Desde una pestaña solo ofrece los tipos de esa pestaña y
 * los campos que ahí tienen sentido: al semen no se le piden kilos ni retiro.
 */
export function DialogoProducto({ categoria }: { categoria?: CategoriaInventario }) {
  const tipos = categoria
    ? TIPOS_PRODUCTO.filter((t) => categoria.tipos.includes(t.valor))
    : TIPOS_PRODUCTO;
  const [tipo, setTipo] = useState(tipos[0].valor);
  const actual = categoria ?? categoriaDeTipo(tipo);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Plus className="h-4 w-4" /> Producto
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Nuevo producto{categoria ? ` · ${categoria.etiqueta}` : ""}
          </DialogTitle>
        </DialogHeader>
        <form action={crearProducto} className="space-y-4">
          {categoria && <input type="hidden" name="categoria" value={categoria.slug} />}
          <div className="space-y-2">
            <Label htmlFor="nombre-pr">Nombre</Label>
            <Input id="nombre-pr" name="nombre" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {tipos.length > 1 ? (
              <div className="space-y-2">
                <Label>Tipo</Label>
                <SelectCampo
                  name="tipo"
                  opcionVacia={false}
                  value={tipo}
                  onValueChange={(v) => v && setTipo(v)}
                  opciones={tipos.map((tp) => ({ valor: tp.valor, etiqueta: tp.etiqueta }))}
                />
              </div>
            ) : (
              <input type="hidden" name="tipo" value={tipo} />
            )}
            <div className="space-y-2">
              <Label htmlFor="unidad">Unidad</Label>
              <Input
                // La unidad sugerida cambia con la pestaña (saco, frasco, pajilla…).
                key={actual.slug}
                id="unidad"
                name="unidad"
                defaultValue={actual.unidadSugerida}
                placeholder="saco, tina, frasco…"
              />
            </div>
            {actual.campos.contenidoKg && (
              <div className="space-y-2">
                <Label htmlFor="contenido_kg">Kg por unidad</Label>
                <Input id="contenido_kg" name="contenido_kg" type="number" step="0.1" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="costo_unitario-p">Costo por unidad</Label>
              <Input id="costo_unitario-p" name="costo_unitario" type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_minimo">Inventario mínimo</Label>
              <Input id="stock_minimo" name="stock_minimo" type="number" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proveedor-p">Proveedor</Label>
              <Input id="proveedor-p" name="proveedor" />
            </div>
            {actual.campos.diasRetiro && (
              <div className="space-y-2">
                <Label htmlFor="dias_retiro">Días de retiro</Label>
                <Input
                  id="dias_retiro"
                  name="dias_retiro"
                  type="number"
                  step="1"
                  placeholder="p. ej. 21"
                />
                <p className="text-xs text-muted-foreground">
                  Días que la carne no se vende después de aplicarlo. La
                  ficha del animal avisa mientras corre el plazo.
                </p>
              </div>
            )}
          </div>
          {actual.campos.controlado && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox name="controlado" className="mt-0.5" />
              <span>
                Es controlado (xilacina, ketamina…)
                <span className="block text-xs text-muted-foreground">
                  Al usarlo se pedirá el MVZ responsable y el folio de receta.
                </span>
              </span>
            </label>
          )}
          <Button type="submit" className="w-full">
            Crear producto
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DialogoEntrada({
  productos,
  categoria,
}: {
  productos: { producto_id: string; nombre: string; unidad: string }[];
  categoria?: CategoriaInventario;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button>
            <PackagePlus className="h-4 w-4" /> Entrada
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar entrada (compra)</DialogTitle>
        </DialogHeader>
        <form action={registrarEntrada} className="space-y-4">
          {categoria && <input type="hidden" name="categoria" value={categoria.slug} />}
          <div className="space-y-2">
            <Label>Producto</Label>
            <SelectCampo
              name="producto_id"
              required
              placeholder="Elegir…"
              opcionVacia="Elegir…"
              opciones={productos.map((p) => ({
                valor: p.producto_id,
                etiqueta: `${p.nombre} (${p.unidad})`,
              }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad-e">Cantidad</Label>
              <Input id="cantidad-e" name="cantidad" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costo_unitario-e">Costo por unidad</Label>
              <Input id="costo_unitario-e" name="costo_unitario" type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha-e">Fecha</Label>
              <CampoFecha id="fecha-e" name="fecha" defaultValue={fechaHoy()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proveedor-e">Proveedor</Label>
              <Input id="proveedor-e" name="proveedor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lote-e">Número de lote</Label>
              <Input id="lote-e" name="lote" placeholder="del empaque" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caducidad-e">Caducidad</Label>
              <Input id="caducidad-e" name="caducidad" type="date" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="crear_gasto" defaultChecked />
            Registrar también como gasto en Costos
          </label>
          <Button type="submit" className="w-full">
            Guardar entrada
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
