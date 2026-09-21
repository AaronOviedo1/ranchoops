"use client";

import { fechaHoy } from "@/lib/fechas";
import { useState } from "react";
import { Baby, Link2, Paperclip, Skull } from "lucide-react";
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
import { ComboCampo, opcionAnimal } from "@/components/ui/combo-campo";
import { CampoFecha } from "@/components/ui/campo-fecha";
import { TIPOS_DOCUMENTO } from "@/lib/catalogos";
import type { AnimalMini } from "@/components/animal-form";

export function DialogoParto({
  action,
  padreSugerido,
  sementales = [],
}: {
  action: (formData: FormData) => Promise<void>;
  padreSugerido?: string | null;
  /** Toros activos del rancho: el padre se liga en vez de escribirse. */
  sementales?: AnimalMini[];
}) {
  const [malparto, setMalparto] = useState(false);
  const hoy = fechaHoy();

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
              <CampoFecha id="fecha" name="fecha" defaultValue={hoy} required />
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
                <Label>Padre del rancho</Label>
                <ComboCampo
                  name="padre_id"
                  placeholder="Toro del rancho…"
                  opciones={sementales.map(opcionAnimal)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="padre_texto">…o semental de fuera</Label>
                <Input
                  id="padre_texto"
                  name="padre_texto"
                  defaultValue={padreSugerido ?? ""}
                  placeholder="Pajilla: Elemental"
                />
                <Input
                  name="padre_registro"
                  placeholder="Número de registro"
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
  const hoy = fechaHoy();
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
            <CampoFecha id="fecha-m" name="fecha" defaultValue={hoy} required />
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

/**
 * Enlaza con esta vaca (o con este toro) una cría que ya está en el inventario.
 *
 * Las crías que nacen con el parto se ligan solas; esto es para las que se
 * dieron de alta por su cuenta o llegaron del Excel y quedaron huérfanas en la
 * app aunque en el rancho todos sepan de quién son.
 */
export function DialogoLigarCria({
  action,
  candidatos,
  esMacho,
}: {
  action: (formData: FormData) => Promise<void>;
  candidatos: AnimalMini[];
  esMacho: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Link2 className="h-4 w-4" /> Ligar {esMacho ? "hijo" : "cría"}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ligar {esMacho ? "un hijo" : "una cría"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label>Busca por arete o SINIIGA</Label>
            <ComboCampo
              name="cria_id"
              required
              autoEnfocar
              placeholder="Arete de la cría…"
              opciones={candidatos.map(opcionAnimal)}
              vacio="Ningún animal sin ese padre registrado."
            />
            <p className="text-xs text-muted-foreground">
              {esMacho
                ? "Solo salen los animales que todavía no tienen padre registrado."
                : "Solo salen los animales que todavía no tienen madre registrada. Si hay un parto tuyo de esas fechas sin cría, se le liga también."}
            </p>
          </div>
          <Button type="submit" className="w-full">
            Ligar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sube un papel del animal.
 *
 * Input de archivo pelón y no `CampoFoto`: las pruebas de genómica llegan en
 * PDF y ese componente solo acepta imágenes.
 */
export function DialogoDocumento({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Paperclip className="h-4 w-4" /> Subir documento
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <SelectCampo
                name="tipo"
                opcionVacia={false}
                defaultValue="genomica"
                opciones={TIPOS_DOCUMENTO}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha-doc">Fecha</Label>
              <CampoFecha id="fecha-doc" name="fecha" defaultValue={fechaHoy()} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="titulo-doc">Título</Label>
            <Input
              id="titulo-doc"
              name="titulo"
              placeholder="Genómica Zoetis, laboratorio…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="archivo">Archivo (foto o PDF)</Label>
            <Input
              id="archivo"
              name="archivo"
              type="file"
              accept="image/*,application/pdf"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nota-doc">Nota</Label>
            <Textarea id="nota-doc" name="nota" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Guardar documento
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
