"use client";

import type { ReactElement } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Potrero } from "@/lib/tipos";

/**
 * El mismo formulario para crear y para editar un potrero.
 *
 * Vive en un diálogo porque se abre desde tres lugares (el encabezado de la
 * lista, cada renglón de la tabla y la ficha) y en ninguno tiene sentido
 * cambiar de pantalla para corregir un nombre o una superficie.
 */
export function DialogoPotrero({
  action,
  potrero,
  volverA,
  trigger,
}: {
  action: (formData: FormData) => void;
  potrero?: Potrero;
  /** A dónde regresar al guardar; vacío deja el destino que decida la acción. */
  volverA?: string;
  trigger?: ReactElement;
}) {
  const editando = !!potrero;

  return (
    <Dialog>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant={editando ? "outline" : "default"}>
              {editando ? (
                <>
                  <Pencil className="h-4 w-4" /> Editar
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Nuevo potrero
                </>
              )}
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar potrero" : "Nuevo potrero"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {volverA && <input type="hidden" name="volver_a" value={volverA} />}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="El Carricito"
              defaultValue={potrero?.nombre ?? ""}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="superficie_has">Superficie (has)</Label>
              <Input
                id="superficie_has"
                name="superficie_has"
                type="number"
                step="0.1"
                inputMode="decimal"
                defaultValue={potrero?.superficie_has ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacidad_estimada">Capacidad (cabezas)</Label>
              <Input
                id="capacidad_estimada"
                name="capacidad_estimada"
                type="number"
                inputMode="numeric"
                defaultValue={potrero?.capacidad_estimada ?? ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo_vegetacion">Tipo de vegetación</Label>
            <Input
              id="tipo_vegetacion"
              name="tipo_vegetacion"
              placeholder="Buffel, nativo…"
              defaultValue={potrero?.tipo_vegetacion ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              name="notas"
              rows={2}
              defaultValue={potrero?.notas ?? ""}
            />
          </div>
          {!editando && (
            <p className="text-xs text-muted-foreground">
              El polígono se dibuja después desde el Mapa; la superficie se
              calcula sola al dibujarlo.
            </p>
          )}
          <Button type="submit" className="w-full">
            {editando ? "Guardar" : "Crear potrero"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Eliminar un potrero, diciendo antes qué se lleva por delante.
 *
 * Si nunca se usó se borra de veras; si ya tuvo grupos, gastos o tareas se
 * archiva, porque su historial de ocupación es de donde sale la carga animal.
 */
export function DialogoEliminarPotrero({
  action,
  nombre,
  conHistorial,
  trigger,
}: {
  action: () => void;
  nombre: string;
  conHistorial: boolean;
  trigger?: ReactElement;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar {nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {conHistorial ? (
            <p className="text-muted-foreground">
              Por este potrero ya pasaron grupos, así que se <strong>archiva</strong>{" "}
              en vez de borrarse: desaparece de la lista, del mapa y de las
              exportaciones, pero su historial de ocupación se queda para el
              cálculo de la carga. Si hay un grupo adentro, se le marca la salida
              hoy. Lo puedes volver a activar desde “Ver archivados”.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Este potrero no tiene historial de pastoreo ni gastos ni tareas, así
              que se <strong>borra por completo</strong>. Si tiene trazo en el
              mapa, también se va.
            </p>
          )}
          <form action={action}>
            <Button type="submit" variant="destructive" className="w-full">
              Sí, eliminar el potrero
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
