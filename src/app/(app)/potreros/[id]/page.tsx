import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveRestore } from "lucide-react";
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
import { Aviso } from "@/components/aviso";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoFecha, formatoNumero } from "@/lib/catalogos";
import type { Potrero } from "@/lib/tipos";
import { actualizarPotrero, eliminarPotrero, reactivarPotrero } from "../acciones";
import { DialogoEliminarPotrero, DialogoPotrero } from "../componentes";

export const metadata = { title: "Potrero — RanchOps" };

export default async function PotreroPage({
  params,
  searchParams,
}: PageProps<"/potreros/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { data: fila } = await supabase
    .from("potreros")
    .select("*")
    .eq("id", id)
    .eq("rancho_id", rancho.id)
    .single();
  if (!fila) notFound();
  const potrero = fila as Potrero;

  const [{ data: historial }, { count: gastos }, { count: tareas }] = await Promise.all([
    supabase
      .from("grupo_movimientos")
      .select("*, grupos(nombre)")
      .eq("potrero_id", id)
      .order("fecha_entrada", { ascending: false })
      .limit(100),
    supabase
      .from("gastos")
      .select("id", { count: "exact", head: true })
      .eq("potrero_id", id)
      .eq("rancho_id", rancho.id),
    supabase
      .from("tareas")
      .select("id", { count: "exact", head: true })
      .eq("potrero_id", id)
      .eq("rancho_id", rancho.id),
  ]);

  const ocupacion = (historial ?? []).find((h) => !h.fecha_salida);
  // Con cualquiera de estas colgando, el potrero se archiva en vez de borrarse.
  const conHistorial =
    (historial ?? []).length > 0 || (gastos ?? 0) > 0 || (tareas ?? 0) > 0;
  const error = typeof sp.error === "string" ? sp.error : null;

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
        <DialogoPotrero
          action={actualizarPotrero.bind(null, id)}
          potrero={potrero}
          volverA={`/potreros/${id}`}
        />
        {potrero.activo && (
          <DialogoEliminarPotrero
            action={eliminarPotrero.bind(null, id)}
            nombre={potrero.nombre}
            conHistorial={conHistorial}
          />
        )}
      </PageHeader>

      {error && <Aviso tono="peligro" className="mb-4">{error}</Aviso>}

      {!potrero.activo && (
        <Aviso tono="alerta" className="mb-4" titulo="Potrero archivado">
          <p className="mb-2">
            Este potrero ya no sale en la lista, en el mapa ni en las
            exportaciones. Su historial de ocupación sigue contando para la
            carga de los meses en que se usó.
          </p>
          <form action={reactivarPotrero.bind(null, id)}>
            <Button type="submit" variant="outline" size="sm">
              <ArchiveRestore className="size-4" /> Reactivar potrero
            </Button>
          </form>
        </Aviso>
      )}

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
