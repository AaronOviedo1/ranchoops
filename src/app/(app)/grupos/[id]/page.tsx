import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoFecha } from "@/lib/catalogos";
import { asignarAnimales, moverAPotrero, quitarAnimal } from "../acciones";
import { DialogoAgregarAnimales, DialogoMoverPotrero } from "./componentes";

export const metadata = { title: "Grupo — RanchOps" };

export default async function GrupoPage({ params }: PageProps<"/grupos/[id]">) {
  const { id } = await params;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { data: grupo } = await supabase
    .from("grupos")
    .select("*, divisiones(nombre), potreros:potrero_actual_id(id, nombre)")
    .eq("id", id)
    .eq("rancho_id", rancho.id)
    .single();
  if (!grupo) notFound();

  const [{ data: miembros }, { data: candidatos }, { data: potreros }, { data: historial }] =
    await Promise.all([
      supabase
        .from("animales")
        .select("id, arete_control, siniga, clase, sexo, status_reproductivo")
        .eq("grupo_id", id)
        .eq("status", "activo")
        .order("arete_control"),
      supabase
        .from("animales")
        .select("id, arete_control, siniga, clase, grupo_id, grupos(nombre)")
        .eq("rancho_id", rancho.id)
        .eq("status", "activo")
        .or(`grupo_id.is.null,grupo_id.neq.${id}`)
        .order("arete_control"),
      supabase
        .from("potreros")
        .select("id, nombre")
        .eq("rancho_id", rancho.id)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("grupo_movimientos")
        .select("*, potreros(nombre)")
        .eq("grupo_id", id)
        .order("fecha_entrada", { ascending: false })
        .limit(50),
    ]);

  const potreroActual = grupo.potreros as unknown as {
    id: string;
    nombre: string;
  } | null;

  return (
    <div>
      <PageHeader
        titulo={grupo.nombre}
        descripcion={`${(miembros ?? []).length} animales · ${
          potreroActual ? `Potrero: ${potreroActual.nombre}` : "Sin potrero"
        }`}
      >
        <div className="flex flex-wrap gap-2">
          <DialogoAgregarAnimales
            action={asignarAnimales.bind(null, id)}
            candidatos={(candidatos ?? []).map((c) => ({
              id: c.id,
              arete_control: c.arete_control,
              siniga: c.siniga,
              clase: c.clase,
              grupo_nombre:
                (c.grupos as unknown as { nombre: string } | null)?.nombre ?? null,
            }))}
          />
          <DialogoMoverPotrero
            action={moverAPotrero.bind(null, id)}
            potreros={potreros ?? []}
            potreroActual={potreroActual?.id ?? null}
            numAnimales={(miembros ?? []).length}
          />
          <Button
            variant="secondary"
            size="sm"
            render={<Link href={`/trabajos/nuevo?grupo=${id}`} />}
          >
            Trabajar grupo
          </Button>
        </div>
      </PageHeader>

      {(grupo.divisiones as { nombre: string } | null)?.nombre && (
        <Badge variant="outline" className="mb-4">
          {(grupo.divisiones as { nombre: string }).nombre}
        </Badge>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Animales</CardTitle>
            </CardHeader>
            <CardContent>
              {(miembros ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este grupo no tiene animales. Usa “Agregar animales”.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arete</TableHead>
                        <TableHead>Clase</TableHead>
                        <TableHead>Status rep.</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {miembros!.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <Link href={`/ganado/${m.id}`} className="font-medium underline">
                              #{m.arete_control ?? "s/n"}
                            </Link>
                          </TableCell>
                          <TableCell className="capitalize">{m.clase}</TableCell>
                          <TableCell>{m.status_reproductivo ?? "—"}</TableCell>
                          <TableCell>
                            <form action={quitarAnimal.bind(null, id, m.id)}>
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                title="Quitar del grupo"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </form>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de potreros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(historial ?? []).length === 0 ? (
              <p className="text-muted-foreground">Sin movimientos todavía.</p>
            ) : (
              historial!.map((h) => {
                const dias = h.fecha_salida
                  ? Math.round(
                      (new Date(h.fecha_salida).getTime() -
                        new Date(h.fecha_entrada).getTime()) /
                        86400000
                    )
                  : null;
                return (
                  <div key={h.id} className="rounded-md border p-2.5">
                    <p className="font-medium">
                      {(h.potreros as { nombre: string } | null)?.nombre}
                      {!h.fecha_salida && (
                        <Badge variant="secondary" className="ml-2">
                          actual
                        </Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {formatoFecha(h.fecha_entrada)} →{" "}
                      {h.fecha_salida ? formatoFecha(h.fecha_salida) : "hoy"}
                      {dias != null && ` · ${dias} días`}
                    </p>
                    {(h.calif_buniga || h.residuo) && (
                      <p className="text-xs text-muted-foreground">
                        {h.calif_buniga && `Buñiga: ${h.calif_buniga}`}
                        {h.calif_buniga && h.residuo && " · "}
                        {h.residuo && `Residuo: ${h.residuo}`}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
