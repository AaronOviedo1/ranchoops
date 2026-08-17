import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { etiquetaTrabajo, formatoFecha, formatoMoneda } from "@/lib/catalogos";

export const metadata = { title: "Trabajos — RanchOps" };

export default async function TrabajosPage() {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { data: eventos } = await supabase
    .from("eventos")
    .select("*, grupos(nombre), productos(nombre), evento_animales(count)")
    .eq("rancho_id", rancho.id)
    .neq("tipo", "nota_bitacora")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader titulo="Trabajos de ganado" descripcion="Últimos 100 registros">
        <Button render={<Link href="/trabajos/nuevo" />}>
          <Plus className="h-4 w-4" /> Trabajar ganado
        </Button>
      </PageHeader>

      {(eventos ?? []).length === 0 ? (
        <EmptyState
          emoji="💉"
          titulo="Sin trabajos registrados"
          descripcion="Registra vacunaciones, palpaciones, pesajes y más; cada trabajo queda en el historial de los animales."
        >
          <Button render={<Link href="/trabajos/nuevo" />}>
            <Plus className="h-4 w-4" /> Trabajar ganado
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Trabajo</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Animales</TableHead>
                <TableHead className="hidden sm:table-cell">Producto</TableHead>
                <TableHead className="hidden md:table-cell">Costo</TableHead>
                <TableHead className="hidden lg:table-cell">Obs.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventos!.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{formatoFecha(e.fecha)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{etiquetaTrabajo(e.tipo)}</Badge>
                  </TableCell>
                  <TableCell>
                    {(e.grupos as { nombre: string } | null)?.nombre ?? "—"}
                  </TableCell>
                  <TableCell>
                    {(e.evento_animales as { count: number }[] | null)?.[0]?.count ?? 0}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {(e.productos as { nombre: string } | null)?.nombre ?? "—"}
                    {e.dosis && (
                      <span className="text-xs text-muted-foreground"> ({e.dosis})</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatoMoneda(e.costo_total)}
                  </TableCell>
                  <TableCell className="hidden max-w-64 truncate lg:table-cell">
                    {e.resultado ?? e.obs ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
