import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { crearGrupo } from "./acciones";
import { Aviso } from "@/components/aviso";
import { SelectCampo } from "@/components/ui/select-campo";

export const metadata = { title: "Grupos — RanchOps" };

export default async function GruposPage({ searchParams }: PageProps<"/grupos">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: grupos }, { data: divisiones }, { data: conteos }] =
    await Promise.all([
      supabase
        .from("grupos")
        .select("*, divisiones(nombre), potreros:potrero_actual_id(nombre)")
        .eq("rancho_id", rancho.id)
        .eq("activo", true)
        .order("nombre"),
      supabase.from("divisiones").select("*").eq("rancho_id", rancho.id).eq("activo", true),
      supabase
        .from("animales")
        .select("grupo_id")
        .eq("rancho_id", rancho.id)
        .eq("status", "activo")
        .not("grupo_id", "is", null),
    ]);

  const porGrupo = new Map<string, number>();
  for (const c of conteos ?? []) {
    porGrupo.set(c.grupo_id!, (porGrupo.get(c.grupo_id!) ?? 0) + 1);
  }

  const error = typeof sp.error === "string" ? sp.error : null;

  const dialogoNuevo = (
    <Dialog>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4" /> Nuevo grupo
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo grupo</DialogTitle>
        </DialogHeader>
        <form action={crearGrupo} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" placeholder="Vacas paridas" required />
          </div>
          <div className="space-y-2">
            <Label>División</Label>
            <SelectCampo
              name="division_id"
              opciones={(divisiones ?? []).map((d) => ({
                valor: d.id,
                etiqueta: d.nombre,
              }))}
            />
          </div>
          <Button type="submit" className="w-full">
            Crear grupo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div>
      <PageHeader titulo="Grupos" descripcion="Lotes de manejo del ganado">
        {dialogoNuevo}
      </PageHeader>

      {error && (
        <Aviso tono="peligro" className="mb-4">{error}</Aviso>
      )}

      {(grupos ?? []).length === 0 ? (
        <EmptyState
          icono={Boxes}
          titulo="Sin grupos"
          descripcion='Crea tu primer grupo, por ejemplo "Vacas paridas" o "Vaquillas 2026".'
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {grupos!.map((g) => (
            <Link key={g.id} href={`/grupos/${g.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    {g.nombre}
                    <Badge variant="secondary">
                      {porGrupo.get(g.id) ?? 0} animales
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    Potrero:{" "}
                    <span className="font-medium text-foreground">
                      {(g.potreros as { nombre: string } | null)?.nombre ?? "Sin potrero"}
                    </span>
                  </p>
                  {(g.divisiones as { nombre: string } | null)?.nombre && (
                    <p>División: {(g.divisiones as { nombre: string }).nombre}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
