import Link from "next/link";
import { Fence, Map as MapIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { TablaResponsiva } from "@/components/tabla-responsiva";
import { EmptyState, PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/estado-badge";
import { Aviso } from "@/components/aviso";
import { estadoPotrero } from "@/lib/estados";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoFecha, formatoNumero } from "@/lib/catalogos";
import type { PotreroEstado } from "@/lib/tipos";
import { crearPotrero } from "./acciones";

export const metadata = { title: "Potreros — RanchOps" };

export default async function PotrerosPage({
  searchParams,
}: PageProps<"/potreros">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: estados }, { data: grupos }] = await Promise.all([
    supabase
      .from("v_potrero_estado")
      .select("*")
      .eq("rancho_id", rancho.id)
      .order("nombre"),
    supabase
      .from("grupos")
      .select("id, nombre")
      .eq("rancho_id", rancho.id),
  ]);

  const nombreGrupo = new Map((grupos ?? []).map((g) => [g.id, g.nombre]));
  const lista = (estados ?? []) as PotreroEstado[];
  const meta = rancho.meta_dias_descanso;
  const ocupados = lista.filter((p) => p.grupo_actual_id);
  const listos = lista.filter((p) => !p.grupo_actual_id && (p.dias_descanso ?? 0) >= meta);
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div>
      <PageHeader
        titulo="Potreros"
        descripcion={`${lista.length} potreros · ${ocupados.length} ocupados · ${listos.length} listos (≥${meta} días de descanso)`}
      >
        <Button variant="outline" render={<Link href="/mapa" />}>
          <MapIcon className="h-4 w-4" /> Ver mapa
        </Button>
        <Dialog>
          <DialogTrigger
            render={
              <Button>
                <Plus className="h-4 w-4" /> Nuevo potrero
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo potrero</DialogTitle>
            </DialogHeader>
            <form action={crearPotrero} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" placeholder="El Carricito" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="superficie_has">Superficie (has)</Label>
                  <Input id="superficie_has" name="superficie_has" type="number" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacidad_estimada">Capacidad (cabezas)</Label>
                  <Input id="capacidad_estimada" name="capacidad_estimada" type="number" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_vegetacion">Tipo de vegetación</Label>
                <Input id="tipo_vegetacion" name="tipo_vegetacion" placeholder="Buffel, nativo…" />
              </div>
              <p className="text-xs text-muted-foreground">
                El polígono se dibuja después desde el Mapa; la superficie se
                calcula sola al dibujarlo.
              </p>
              <Button type="submit" className="w-full">
                Crear potrero
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {error && (
        <Aviso tono="peligro" className="mb-4">{error}</Aviso>
      )}

      {lista.length === 0 ? (
        <EmptyState
          icono={Fence}
          titulo="Sin potreros"
          descripcion="Crea tus potreros aquí o dibújalos directamente en el mapa."
        />
      ) : (
        <TablaResponsiva
          datos={lista}
          claveDe={(p) => p.potrero_id}
          hrefDe={(p) => `/potreros/${p.potrero_id}`}
          columnas={[
            {
              clave: "nombre",
              encabezado: "Potrero",
              enTarjeta: "titulo",
              celda: (p) => p.nombre,
            },
            {
              clave: "estado",
              encabezado: "Estado",
              enTarjeta: "estado",
              celda: (p) => {
                const e = estadoPotrero(p.dias_descanso, meta, !!p.grupo_actual_id);
                return <EstadoBadge tono={e.tono}>{e.etiqueta}</EstadoBadge>;
              },
            },
            {
              clave: "has",
              encabezado: "Has",
              numerica: true,
              celda: (p) => formatoNumero(p.superficie_has, 1),
            },
            {
              clave: "grupo",
              encabezado: "Grupo",
              desde: "sm",
              celda: (p) =>
                p.grupo_actual_id
                  ? (nombreGrupo.get(p.grupo_actual_id) ?? "—")
                  : "—",
            },
            {
              clave: "fecha",
              encabezado: "Desde / última salida",
              desde: "md",
              celda: (p) =>
                p.grupo_actual_id
                  ? formatoFecha(p.ocupado_desde)
                  : formatoFecha(p.ultima_salida),
            },
            {
              clave: "dias",
              encabezado: "Días",
              celda: (p) =>
                p.grupo_actual_id ? (
                  <Badge variant="outline">{p.dias_ocupado} ocupado</Badge>
                ) : p.dias_descanso != null ? (
                  <Badge variant="outline">{p.dias_descanso} descanso</Badge>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
