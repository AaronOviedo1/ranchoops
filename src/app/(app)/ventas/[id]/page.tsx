import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { formatoFecha, formatoMoneda, formatoNumero } from "@/lib/catalogos";
import { eliminarVenta } from "../acciones";

export const metadata = { title: "Venta — RanchOps" };

export default async function VentaPage({ params }: PageProps<"/ventas/[id]">) {
  const { id } = await params;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { data: venta } = await supabase
    .from("ventas")
    .select("*, divisiones(nombre), venta_renglones(*), venta_animales(animal_id, animales(id, arete_control))")
    .eq("id", id)
    .eq("rancho_id", rancho.id)
    .single();
  if (!venta) notFound();

  const renglones = venta.venta_renglones ?? [];
  const total = renglones.reduce(
    (s: number, r: { total: number }) => s + Number(r.total),
    0
  );
  const animales = (venta.venta_animales ?? []) as {
    animal_id: string;
    animales: { id: string; arete_control: string | null } | null;
  }[];

  return (
    <div>
      <PageHeader
        titulo={`Venta ${formatoFecha(venta.fecha)}`}
        descripcion={venta.comprador ?? undefined}
      >
        <form action={eliminarVenta.bind(null, id)}>
          <Button type="submit" variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        </form>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        {venta.guia && <Badge variant="outline">GUIA {venta.guia}</Badge>}
        {venta.reemo && <Badge variant="outline">REEMO {venta.reemo}</Badge>}
        {(venta.divisiones as unknown as { nombre: string } | null)?.nombre && (
          <Badge variant="secondary">
            {(venta.divisiones as unknown as { nombre: string }).nombre}
          </Badge>
        )}
      </div>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clase</TableHead>
                  <TableHead className="text-right">Cabezas</TableHead>
                  <TableHead className="text-right">Kilos</TableHead>
                  <TableHead className="text-right">Promedio</TableHead>
                  <TableHead className="text-right">$/kg</TableHead>
                  <TableHead className="text-right">$/cabeza</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renglones.map(
                  (r: {
                    id: string;
                    clase: string;
                    cabezas: number;
                    kilos_venta: number | null;
                    precio_kg: number | null;
                    precio_cabeza: number | null;
                    total: number;
                  }) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium capitalize">{r.clase}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.cabezas}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatoNumero(r.kilos_venta)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.kilos_venta && r.cabezas
                          ? formatoNumero(Number(r.kilos_venta) / r.cabezas, 1)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.precio_kg ? formatoNumero(Number(r.precio_kg), 2) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.precio_cabeza ? formatoMoneda(Number(r.precio_cabeza)) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatoMoneda(Number(r.total))}
                      </TableCell>
                    </TableRow>
                  )
                )}
                <TableRow className="bg-muted/40">
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {renglones.reduce((s: number, r: { cabezas: number }) => s + r.cabezas, 0)}
                  </TableCell>
                  <TableCell colSpan={4} />
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatoMoneda(total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {animales.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">
              Animales vendidos ({animales.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {animales.map(
              (a) =>
                a.animales && (
                  <Link
                    key={a.animal_id}
                    href={`/ganado/${a.animales.id}`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    #{a.animales.arete_control ?? "s/n"}
                  </Link>
                )
            )}
          </CardContent>
        </Card>
      )}

      {venta.obs && <p className="text-sm text-muted-foreground">Notas: {venta.obs}</p>}
    </div>
  );
}
