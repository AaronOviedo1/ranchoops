import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatoFecha, formatoMoneda, formatoNumero } from "@/lib/catalogos";

export const metadata = { title: "Ventas — RanchOps" };

export default async function VentasPage({ searchParams }: PageProps<"/ventas">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const anioActual = new Date().getFullYear();
  const anio = typeof sp.anio === "string" ? Number(sp.anio) : anioActual;

  const { data: ventas } = await supabase
    .from("ventas")
    .select("*, venta_renglones(cabezas, kilos_venta, total)")
    .eq("rancho_id", rancho.id)
    .gte("fecha", `${anio}-01-01`)
    .lte("fecha", `${anio}-12-31`)
    .order("fecha", { ascending: false });

  const lista = (ventas ?? []).map((v) => {
    const renglones = (v.venta_renglones ?? []) as {
      cabezas: number;
      kilos_venta: number | null;
      total: number;
    }[];
    return {
      ...v,
      cabezas: renglones.reduce((s, r) => s + r.cabezas, 0),
      kilos: renglones.reduce((s, r) => s + Number(r.kilos_venta ?? 0), 0),
      total: renglones.reduce((s, r) => s + Number(r.total), 0),
    };
  });

  const totalAnio = lista.reduce((s, v) => s + v.total, 0);
  const cabezasAnio = lista.reduce((s, v) => s + v.cabezas, 0);

  const anios = Array.from({ length: 5 }, (_, i) => anioActual - i);

  return (
    <div>
      <PageHeader titulo="Ventas" descripcion={`${cabezasAnio} cabezas vendidas en ${anio}`}>
        <Button render={<Link href="/ventas/nueva" />}>
          <Plus className="h-4 w-4" /> Nueva venta
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {anios.map((a) => (
          <Link
            key={a}
            href={`/ventas?anio=${a}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              a === anio ? "border-primary bg-accent font-medium" : ""
            }`}
          >
            {a}
          </Link>
        ))}
        <Card className="ml-auto">
          <CardContent className="px-4 py-2">
            <span className="text-xs text-muted-foreground">Total {anio}: </span>
            <span className="font-semibold tabular-nums">{formatoMoneda(totalAnio)}</span>
          </CardContent>
        </Card>
      </div>

      {lista.length === 0 ? (
        <EmptyState emoji="💰" titulo={`Sin ventas en ${anio}`}>
          <Button render={<Link href="/ventas/nueva" />}>
            <Plus className="h-4 w-4" /> Nueva venta
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead className="text-right">Cabezas</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Kilos</TableHead>
                <TableHead className="hidden md:table-cell">GUIA / REEMO</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((v) => (
                <TableRow key={v.id} className="relative">
                  <TableCell className="whitespace-nowrap">
                    <Link href={`/ventas/${v.id}`} className="after:absolute after:inset-0">
                      {formatoFecha(v.fecha)}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{v.comprador ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.cabezas}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {formatoNumero(v.kilos)}
                  </TableCell>
                  <TableCell className="hidden text-xs md:table-cell">
                    {[v.guia, v.reemo].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatoMoneda(v.total)}
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
