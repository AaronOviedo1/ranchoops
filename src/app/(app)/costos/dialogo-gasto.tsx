"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, ScanText } from "lucide-react";
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
import { Aviso } from "@/components/aviso";
import { CATEGORIAS_GASTO } from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";
import { leerTicket } from "./leer-ticket";
import { CampoFecha } from "@/components/ui/campo-fecha";

type Opcion = { id: string; nombre: string };

export function DialogoGasto({
  action,
  divisiones,
  grupos,
  hayLector,
}: {
  action: (formData: FormData) => Promise<void>;
  divisiones: Opcion[];
  grupos: Opcion[];
  /** Está configurada la lectura de tickets. */
  hayLector: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "exito" | "peligro"; texto: string } | null>(
    null
  );
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_GASTO[0]);
  const [hayArchivo, setHayArchivo] = useState(false);

  /** Llena el formulario con lo que dice el ticket. Nada se guarda todavía. */
  const leer = async () => {
    if (!form.current) return;
    setLeyendo(true);
    setAviso(null);

    const resultado = await leerTicket(new FormData(form.current));
    setLeyendo(false);

    if (!resultado.ok) {
      setAviso({ tono: "peligro", texto: resultado.error });
      return;
    }

    const d = resultado.datos;
    const campos = form.current.elements as HTMLFormControlsCollection;
    const poner = (nombre: string, valor: string | number | null) => {
      const el = campos.namedItem(nombre) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el && valor != null && valor !== "") el.value = String(valor);
    };

    poner("concepto", d.concepto);
    poner("proveedor", d.proveedor);
    poner("fecha", d.fecha);
    poner("monto", d.total);
    if (d.categoria) setCategoria(d.categoria);

    const notas = [
      d.iva != null ? `IVA: $${d.iva}` : null,
      d.descuento != null ? `Descuento: $${d.descuento}` : null,
      d.detalle,
    ]
      .filter(Boolean)
      .join("\n");
    poner("obs", notas);

    setAviso({
      tono: "exito",
      texto: "Listo: revisa los datos antes de guardar.",
    });
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4" /> Nuevo gasto
          </Button>
        }
      />
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
        </DialogHeader>
        <form ref={form} action={action} className="space-y-4">
          <div className="space-y-2 rounded-lg border p-3">
            <Label htmlFor="comprobante">Comprobante (foto o PDF, opcional)</Label>
            <Input
              id="comprobante"
              name="comprobante"
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              onChange={(e) => setHayArchivo(!!e.target.files?.length)}
            />
            {hayLector && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!hayArchivo || leyendo}
                  onClick={leer}
                >
                  {leyendo ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Leyendo el ticket…
                    </>
                  ) : (
                    <>
                      <ScanText className="size-4" /> Llenar con el ticket
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Saca el concepto, el monto, el IVA y el proveedor. Siempre revisa
                  antes de guardar.
                </p>
              </>
            )}
          </div>

          {aviso && <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-g">Fecha</Label>
              <CampoFecha
                id="fecha-g"
                name="fecha"
                defaultValue={fechaHoy()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto">Monto (MXN)</Label>
              <Input id="monto" name="monto" type="number" step="0.01" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto</Label>
            <Input id="concepto" name="concepto" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <SelectCampo
                name="categoria"
                opcionVacia={false}
                value={categoria}
                onValueChange={setCategoria}
                opciones={CATEGORIAS_GASTO.map((c) => ({ valor: c, etiqueta: c }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proveedor-g">Proveedor</Label>
              <Input id="proveedor-g" name="proveedor" />
            </div>
            <div className="space-y-2">
              <Label>División</Label>
              <SelectCampo
                name="division_id"
                opciones={divisiones.map((d) => ({ valor: d.id, etiqueta: d.nombre }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <SelectCampo
                name="grupo_id"
                opciones={grupos.map((g) => ({ valor: g.id, etiqueta: g.nombre }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs-g">Observaciones</Label>
            <Textarea id="obs-g" name="obs" rows={2} />
          </div>

          <Button type="submit" className="w-full">
            Guardar gasto
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
