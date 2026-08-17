import Link from "next/link";
import { Map as MapIcon, Plus } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoFecha, formatoNumero } from "@/lib/catalogos";
import type { PotreroEstado } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { crearPotrero } from "./acciones";

export const metadata = { title: "Potreros — RanchOps" };

function claseDescanso(dias: number | null, meta: number, ocupado: boolean) {
  if (ocupado) return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
  if (dias == null) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  if (dias >= meta) return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
  return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
}

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
        <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      {lista.length === 0 ? (
        <EmptyState
          emoji="🌾"
          titulo="Sin potreros"
          descripcion="Crea tus potreros aquí o dibújalos directamente en el mapa."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Potrero</TableHead>
                <TableHead>Has</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">Grupo</TableHead>
                <TableHead className="hidden md:table-cell">Desde / última salida</TableHead>
                <TableHead>Días</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => {
                const ocupado = !!p.grupo_actual_id;
                return (
                  <TableRow key={p.potrero_id} className="relative">
                    <TableCell className="font-medium">
                      <Link
                        href={`/potreros/${p.potrero_id}`}
                        className="after:absolute after:inset-0"
                      >
                        {p.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>{formatoNumero(p.superficie_has, 1)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          claseDescanso(p.dias_descanso, meta, ocupado)
                        )}
                      >
                        {ocupado
                          ? "Ocupado"
                          : p.dias_descanso == null
                            ? "Sin historial"
                            : (p.dias_descanso >= meta ? "Listo" : "Descansando")}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {ocupado ? nombreGrupo.get(p.grupo_actual_id!) ?? "—" : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {ocupado
                        ? formatoFecha(p.ocupado_desde)
                        : formatoFecha(p.ultima_salida)}
                    </TableCell>
                    <TableCell>
                      {ocupado ? (
                        <Badge variant="outline">{p.dias_ocupado} ocupado</Badge>
                      ) : p.dias_descanso != null ? (
                        <Badge variant="outline">{p.dias_descanso} descanso</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
