import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
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
import { requireAdmin } from "@/lib/auth";
import { formatoFecha, formatoMoneda, formatoNumero } from "@/lib/catalogos";
import type { CompraRenglon } from "@/lib/tipos";
import { eliminarCompra } from "../acciones";

export const metadata = { title: "Compra — RanchOps" };

export default async function CompraPage({ params }: PageProps<"/compras/[id]">) {
  const { id } = await params;
  const { rancho } = await requireAdmin();
  const supabase = await createClient();

  const [{ data: compra }, { data: ligados }] = await Promise.all([
    supabase
      .from("compras")
      .select("*, divisiones(nombre), compra_renglones(*)")
      .eq("id", id)
      .eq("rancho_id", rancho.id)
      .single(),
    supabase
      .from("compra_animales")
      .select("animal_id, animales(id, arete_control, clase, status)")
      .eq("compra_id", id),
  ]);

  if (!compra) notFound();

  const renglones = (compra.compra_renglones ?? []) as CompraRenglon[];
  const total = renglones.reduce((s, r) => s + Number(r.total), 0);
  const cabezas = renglones.reduce((s, r) => s + r.cabezas, 0);
  const division = (compra.divisiones as unknown as { nombre: string } | null)?.nombre;
  type Ligado = {
    animal_id: string;
    animales: { id: string; arete_control: string | null; clase: string; status: string } | null;
  };
  const animales = ((ligados ?? []) as unknown as Ligado[]).filter((l) => l.animales);
  const eliminar = eliminarCompra.bind(null, compra.id);

  return (
    <div>
      <PageHeader
        titulo={`Compra · ${formatoFecha(compra.fecha)}`}
        descripcion={`${cabezas} cabezas · ${formatoMoneda(total)}${compra.proveedor ? ` · ${compra.proveedor}` : ""}`}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            render={
              <Link
                href={`/ganado/nuevo?compra=${compra.id}${compra.proveedor ? `&procedencia=${encodeURIComponent(compra.proveedor)}` : ""}&fecha_en_campo=${compra.fecha}`}
              />
            }
          >
            <Plus className="h-4 w-4" /> Dar de alta los animales
          </Button>
          <form action={eliminar}>
            <Button variant="outline" type="submit">
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </form>
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Fecha", formatoFecha(compra.fecha)],
              ["Proveedor", compra.proveedor],
              ["GUIA", compra.guia],
              ["REEMO", compra.reemo],
              ["División", division],
              ["Notas", compra.obs],
            ].map(
              ([etiqueta, valor]) =>
                valor && (
                  <div key={etiqueta as string} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{etiqueta}</span>
                    <span className="text-right font-medium">{valor}</span>
                  </div>
                )
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Renglones</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clase</TableHead>
                    <TableHead className="text-right">Cabezas</TableHead>
                    <TableHead className="text-right">Kilos</TableHead>
                    <TableHead className="text-right">$/kg</TableHead>
                    <TableHead className="text-right">$/cabeza</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renglones.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="capitalize">{r.clase}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.cabezas}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.kilos != null ? formatoNumero(r.kilos) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.precio_kg != null ? formatoMoneda(r.precio_kg) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.precio_cabeza != null ? formatoMoneda(r.precio_cabeza) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatoMoneda(Number(r.total))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-2 text-right text-lg font-semibold tabular-nums">
                Total: {formatoMoneda(total)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Animales dados de alta ({animales.length} de {cabezas})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {animales.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no se da de alta ningún animal de esta compra. El
                  botón de arriba abre el alta ya precargada con la
                  procedencia.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {animales.map((l) => (
                    <Link
                      key={l.animal_id}
                      href={`/ganado/${l.animales!.id}`}
                      className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      #{l.animales!.arete_control ?? "s/n"} ·{" "}
                      <span className="capitalize">{l.animales!.clase}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
