import Link from "next/link";
import { notFound } from "next/navigation";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoFecha, formatoNumero } from "@/lib/catalogos";
import { actualizarPotrero } from "../acciones";

export const metadata = { title: "Potrero — RanchOps" };

export default async function PotreroPage({
  params,
}: PageProps<"/potreros/[id]">) {
  const { id } = await params;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { data: potrero } = await supabase
    .from("potreros")
    .select("*")
    .eq("id", id)
    .eq("rancho_id", rancho.id)
    .single();
  if (!potrero) notFound();

  const { data: historial } = await supabase
    .from("grupo_movimientos")
    .select("*, grupos(nombre)")
    .eq("potrero_id", id)
    .order("fecha_entrada", { ascending: false })
    .limit(100);

  const ocupacion = (historial ?? []).find((h) => !h.fecha_salida);

  return (
    <div>
      <PageHeader
        titulo={potrero.nombre}
        descripcion={[
          potrero.superficie_has ? `${formatoNumero(potrero.superficie_has, 1)} has` : null,
          potrero.tipo_vegetacion,
          potrero.capacidad_estimada ? `capacidad ${potrero.capacidad_estimada} cabezas` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      >
        <Dialog>
          <DialogTrigger render={<Button variant="outline">Editar</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar potrero</DialogTitle>
            </DialogHeader>
            <form action={actualizarPotrero.bind(null, id)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" defaultValue={potrero.nombre} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="superficie_has">Superficie (has)</Label>
                  <Input
                    id="superficie_has"
                    name="superficie_has"
                    type="number"
                    step="0.1"
                    defaultValue={potrero.superficie_has ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacidad_estimada">Capacidad</Label>
                  <Input
                    id="capacidad_estimada"
                    name="capacidad_estimada"
                    type="number"
                    defaultValue={potrero.capacidad_estimada ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_vegetacion">Vegetación</Label>
                <Input
                  id="tipo_vegetacion"
                  name="tipo_vegetacion"
                  defaultValue={potrero.tipo_vegetacion ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea id="notas" name="notas" defaultValue={potrero.notas ?? ""} rows={2} />
              </div>
              <Button type="submit" className="w-full">
                Guardar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {ocupacion ? (
        <Badge className="mb-4">
          Ocupado por {(ocupacion.grupos as unknown as { nombre: string } | null)?.nombre} desde{" "}
          {formatoFecha(ocupacion.fecha_entrada)}
        </Badge>
      ) : (
        <Badge variant="secondary" className="mb-4">
          Descansando
        </Badge>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historial de ocupación (entradas y salidas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(historial ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este potrero aún no tiene movimientos. Mueve un grupo aquí desde{" "}
              <Link href="/grupos" className="underline">
                Grupos
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead className="hidden sm:table-cell"># Animales</TableHead>
                    <TableHead className="hidden md:table-cell">Buñiga</TableHead>
                    <TableHead className="hidden md:table-cell">Residuo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial!.map((h) => {
                    const dias = h.fecha_salida
                      ? Math.round(
                          (new Date(h.fecha_salida).getTime() -
                            new Date(h.fecha_entrada).getTime()) /
                            86400000
                        )
                      : null;
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">
                          {(h.grupos as unknown as { nombre: string } | null)?.nombre ?? "—"}
                        </TableCell>
                        <TableCell>{formatoFecha(h.fecha_entrada)}</TableCell>
                        <TableCell>
                          {h.fecha_salida ? formatoFecha(h.fecha_salida) : "En potrero"}
                        </TableCell>
                        <TableCell>{dias ?? "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {h.num_animales_entrada ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {h.calif_buniga ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{h.residuo ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
