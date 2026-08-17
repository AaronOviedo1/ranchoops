"use client";

import { useState } from "react";
import { Baby, Skull } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { SelectCampo } from "@/components/ui/select-campo";

export function DialogoParto({
  action,
  padreSugerido,
}: {
  action: (formData: FormData) => Promise<void>;
  padreSugerido?: string | null;
}) {
  const [malparto, setMalparto] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Baby className="h-4 w-4" /> Registrar parto
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar parto</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" name="fecha" type="date" defaultValue={hoy} required />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                id="malparto"
                name="malparto"
                checked={malparto}
                onCheckedChange={(v) => setMalparto(v === true)}
              />
              <Label htmlFor="malparto">Malparto</Label>
            </div>
          </div>
          {!malparto && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sexo de la cría</Label>
                <SelectCampo
                  name="sexo_cria"
                  required
                  opcionVacia={false}
                  defaultValue="H"
                  opciones={[
                    { valor: "H", etiqueta: "Hembra" },
                    { valor: "M", etiqueta: "Macho" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arete_cria">Arete de la cría</Label>
                <Input id="arete_cria" name="arete_cria" inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peso_cria">Peso al nacer (kg)</Label>
                <Input id="peso_cria" name="peso_cria" type="number" step="0.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="padre_texto">Padre / semental</Label>
                <Input
                  id="padre_texto"
                  name="padre_texto"
                  defaultValue={padreSugerido ?? ""}
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="dificultad">Dificultad de parto</Label>
            <SelectCampo
              name="dificultad"
              opcionVacia="Sin dificultad"
              placeholder="Sin dificultad"
              opciones={[
                { valor: "asistido", etiqueta: "Asistido" },
                { valor: "dificil", etiqueta: "Difícil" },
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs">Observaciones</Label>
            <Textarea id="obs" name="obs" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Guardar parto
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DialogoMuerte({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-destructive">
            <Skull className="h-4 w-4" /> Registrar muerte
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar muerte</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fecha-m">Fecha</Label>
            <Input id="fecha-m" name="fecha" type="date" defaultValue={hoy} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="causa">Causa</Label>
            <Input id="causa" name="causa" placeholder="Malparto, accidente…" />
          </div>
          <p className="text-sm text-muted-foreground">
            El animal saldrá del inventario activo pero conservará todo su
            historial.
          </p>
          <Button type="submit" variant="destructive" className="w-full">
            Confirmar muerte
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
