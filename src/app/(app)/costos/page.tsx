import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
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
import { EmptyState, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { CATEGORIAS_GASTO, formatoFecha, formatoMoneda } from "@/lib/catalogos";
import { crearGasto, eliminarGasto } from "./acciones";

export const metadata = { title: "Costos — RanchOps" };

export default async function CostosPage({ searchParams }: PageProps<"/costos">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const mesActual = new Date().toISOString().slice(0, 7);
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesActual;
  const anio = mes.slice(0, 4);

  const [{ data: gastosMes }, { data: gastosAnio }, { data: divisiones }, { data: grupos }, { count: cabezas }] =
    await Promise.all([
      supabase
        .from("gastos")
        .select("*, divisiones(nombre), grupos(nombre)")
        .eq("rancho_id", rancho.id)
        .gte("fecha", `${mes}-01`)
        .lte("fecha", `${mes}-31`)
        .order("fecha", { ascending: false }),
      supabase
        .from("gastos")
        .select("monto")
        .eq("rancho_id", rancho.id)
        .gte("fecha", `${anio}-01-01`)
        .lte("fecha", `${anio}-12-31`),
      supabase.from("divisiones").select("*").eq("rancho_id", rancho.id).eq("activo", true),
      supabase.from("grupos").select("id, nombre").eq("rancho_id", rancho.id).eq("activo", true),
      supabase
        .from("animales")
        .select("id", { count: "exact", head: true })
        .eq("rancho_id", rancho.id)
        .eq("status", "activo"),
    ]);

  const totalMes = (gastosMes ?? []).reduce((s, g) => s + Number(g.monto), 0);
  const totalAnio = (gastosAnio ?? []).reduce((s, g) => s + Number(g.monto), 0);
  const porCategoria = new Map<string, number>();
  for (const g of gastosMes ?? []) {
    porCategoria.set(g.categoria, (porCategoria.get(g.categoria) ?? 0) + Number(g.monto));
  }

  const mesAnterior = new Date(`${mes}-15`);
  mesAnterior.setMonth(mesAnterior.getMonth() - 1);
  const mesSiguiente = new Date(`${mes}-15`);
  mesSiguiente.setMonth(mesSiguiente.getMonth() + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 7);

  const nombreMes = new Date(`${mes}-15`).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader titulo="Costos" descripcion={`Gastos de ${nombreMes}`}>
        <Dialog>
          <DialogTrigger
            render={
              <Button>
                <Plus className="h-4 w-4" /> Nuevo gasto
              </Button>
            }
          />
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar gasto</DialogTitle>
            </DialogHeader>
            <form action={crearGasto} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha-g">Fecha</Label>
                  <Input
                    id="fecha-g"
                    name="fecha"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto (MXN)</Label>
                  <Input id="monto" name="monto" type="number" step="0.01" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto</Label>
                <Input id="concepto" name="concepto" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <select
                    name="categoria"
                    className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  >
                    {CATEGORIAS_GASTO.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proveedor-g">Proveedor</Label>
                  <Input id="proveedor-g" name="proveedor" />
                </div>
                <div className="space-y-2">
                  <Label>División</Label>
                  <select
                    name="division_id"
                    className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  >
                    <option value="">—</option>
                    {(divisiones ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Grupo</Label>
                  <select
                    name="grupo_id"
                    className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  >
                    <option value="">—</option>
                    {(grupos ?? []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comprobante">Comprobante (foto o PDF, opcional)</Label>
                <Input id="comprobante" name="comprobante" type="file" accept="image/*,.pdf" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obs-g">Observaciones</Label>
                <Textarea id="obs-g" name="obs" rows={2} />
              </div>
              <Button type="submit" className="w-full">
                Guardar gasto
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total del mes</p>
            <p className="text-lg font-semibold tabular-nums">{formatoMoneda(totalMes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Acumulado {anio}</p>
            <p className="text-lg font-semibold tabular-nums">{formatoMoneda(totalAnio)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Costo/cabeza (mes)</p>
            <p className="text-lg font-semibold tabular-nums">
              {cabezas ? formatoMoneda(totalMes / cabezas) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Cabezas activas</p>
            <p className="text-lg font-semibold tabular-nums">{cabezas ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href={`/costos?mes=${fmt(mesAnterior)}`} className="rounded-md border px-3 py-1 hover:bg-accent">
          ← {fmt(mesAnterior)}
        </Link>
        <span className="font-medium capitalize">{nombreMes}</span>
        {mes < mesActual && (
          <Link href={`/costos?mes=${fmt(mesSiguiente)}`} className="rounded-md border px-3 py-1 hover:bg-accent">
            {fmt(mesSiguiente)} →
          </Link>
        )}
      </div>

      {porCategoria.size > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {[...porCategoria.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([cat, monto]) => (
              <span key={cat} className="rounded-full border px-3 py-1 text-xs">
                {cat}: <span className="font-medium">{formatoMoneda(monto)}</span>
              </span>
            ))}
        </div>
      )}

      {(gastosMes ?? []).length === 0 ? (
        <EmptyState emoji="🧾" titulo={`Sin gastos en ${nombreMes}`} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                <TableHead className="hidden lg:table-cell">División</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastosMes!.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="whitespace-nowrap">{formatoFecha(g.fecha)}</TableCell>
                  <TableCell className="max-w-56 truncate font-medium">{g.concepto}</TableCell>
                  <TableCell className="hidden sm:table-cell">{g.categoria}</TableCell>
                  <TableCell className="hidden md:table-cell">{g.proveedor ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {(g.divisiones as unknown as { nombre: string } | null)?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatoMoneda(Number(g.monto))}
                  </TableCell>
                  <TableCell>
                    <form action={eliminarGasto.bind(null, g.id)}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
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
