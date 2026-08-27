"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
import { SelectCampo } from "@/components/ui/select-campo";
import { CampoFecha } from "@/components/ui/campo-fecha";
import { CATEGORIAS_TAREA, PRIORIDADES_TAREA } from "@/lib/catalogos";
import type { Tarea } from "@/lib/tipos";

type Opcion = { valor: string; etiqueta: string };

/**
 * Alta y edición de una tarea. Un solo diálogo para las dos cosas: si llega
 * `tarea`, edita; si no, crea.
 */
export function DialogoTarea({
  action,
  tarea,
  miembros,
  potreros,
  grupos,
  abiertoInicial = false,
}: {
  action: (formData: FormData) => Promise<void>;
  tarea?: Tarea;
  miembros: Opcion[];
  potreros: Opcion[];
  grupos: Opcion[];
  /** Para llegar con ?nueva=1 y que el diálogo ya esté abierto. */
  abiertoInicial?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={
          tarea ? (
            <Button variant="ghost" size="sm">
              <Pencil className="size-4" /> Editar
            </Button>
          ) : (
            <Button>
              <Plus className="size-4" /> Nueva tarea
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tarea ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre-t">¿Qué hay que hacer?</Label>
            <Input
              id="nombre-t"
              name="nombre"
              required
              defaultValue={tarea?.nombre ?? ""}
              placeholder="Revisar la bomba de El Carrizo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <SelectCampo
                name="prioridad"
                defaultValue={tarea?.prioridad ?? "media"}
                opcionVacia={false}
                opciones={PRIORIDADES_TAREA.map((p) => ({
                  valor: p.valor,
                  etiqueta: p.etiqueta,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <SelectCampo
                name="categoria"
                defaultValue={tarea?.categoria ?? "General"}
                opcionVacia={false}
                opciones={CATEGORIAS_TAREA.map((c) => ({ valor: c, etiqueta: c }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inicio-t">Empieza</Label>
              <CampoFecha
                id="inicio-t"
                name="fecha_inicio"
                defaultValue={tarea?.fecha_inicio}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vence-t">Vence</Label>
              <CampoFecha
                id="vence-t"
                name="fecha_vence"
                defaultValue={tarea?.fecha_vence}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsable</Label>
            <SelectCampo
              name="responsable_id"
              defaultValue={tarea?.responsable_id}
              opcionVacia="Sin responsable"
              opciones={miembros}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Potrero</Label>
              <SelectCampo
                name="potrero_id"
                defaultValue={tarea?.potrero_id}
                opcionVacia="—"
                opciones={potreros}
              />
            </div>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <SelectCampo
                name="grupo_id"
                defaultValue={tarea?.grupo_id}
                opcionVacia="—"
                opciones={grupos}
              />
            </div>
          </div>
          {tarea && (
            <div className="space-y-2">
              <Label>Estado</Label>
              <SelectCampo
                name="estado"
                defaultValue={tarea.estado}
                opcionVacia={false}
                opciones={[
                  { valor: "pendiente", etiqueta: "Pendiente" },
                  { valor: "en_curso", etiqueta: "En curso" },
                  { valor: "hecha", etiqueta: "Hecha" },
                  { valor: "cancelada", etiqueta: "Cancelada" },
                ]}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="desc-t">Detalle</Label>
            <Textarea
              id="desc-t"
              name="descripcion"
              rows={2}
              defaultValue={tarea?.descripcion ?? ""}
            />
          </div>
          <Button type="submit" className="w-full">
            {tarea ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
