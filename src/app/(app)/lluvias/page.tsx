import Link from "next/link";
import { CloudRain, Plus } from "lucide-react";
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
import { EmptyState, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoNumero } from "@/lib/catalogos";
import { crearPluviometro, registrarLluvia } from "./acciones";

export const metadata = { title: "Lluvias — RanchOps" };

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function LluviasPage({
  searchParams,
}: PageProps<"/lluvias">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const anioActual = new Date().getFullYear();
  const anio = typeof sp.anio === "string" ? Number(sp.anio) : anioActual;

  const [{ data: pluviometros }, { data: lluvias }, { data: anios }] =
    await Promise.all([
      supabase
        .from("pluviometros")
        .select("*")
        .eq("rancho_id", rancho.id)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("lluvias")
        .select("pluviometro_id, fecha, cantidad")
        .eq("rancho_id", rancho.id)
        .gte("fecha", `${anio}-01-01`)
        .lte("fecha", `${anio}-12-31`),
      supabase
        .from("lluvias")
        .select("fecha")
        .eq("rancho_id", rancho.id)
        .order("fecha", { ascending: true })
        .limit(1),
    ]);

  const unidad = rancho.unidad_lluvia === "mm" ? "mm" : "pulgadas";
  const primerAnio = anios?.[0] ? Number(anios[0].fecha.slice(0, 4)) : anioActual;
  const listaAnios = Array.from(
    { length: anioActual - primerAnio + 1 },
    (_, i) => anioActual - i
  );

  // matriz pluviómetro × mes
  const acumulado = new Map<string, number[]>();
  for (const p of pluviometros ?? []) acumulado.set(p.id, Array(12).fill(0));
  for (const l of lluvias ?? []) {
    const mes = Number(l.fecha.slice(5, 7)) - 1;
    const fila = acumulado.get(l.pluviometro_id);
    if (fila) fila[mes] += Number(l.cantidad);
  }

  const totalPorPluviometro = (id: string) =>
    (acumulado.get(id) ?? []).reduce((a, b) => a + b, 0);
  const filas = pluviometros ?? [];
  const promedioMes = Array(12)
    .fill(0)
    .map((_, m) =>
      filas.length
        ? filas.reduce((s, p) => s + (acumulado.get(p.id)?.[m] ?? 0), 0) / filas.length
        : 0
    );
  const promedioTotal = promedioMes.reduce((a, b) => a + b, 0);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        titulo="Lluvias"
        descripcion={`Lecturas por pluviómetro en ${unidad} · promedio del rancho ${anio}: ${formatoNumero(promedioTotal, 1)} ${rancho.unidad_lluvia === "mm" ? "mm" : '"'}`}
      >
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline">
                <Plus className="h-4 w-4" /> Pluviómetro
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo pluviómetro</DialogTitle>
            </DialogHeader>
            <form action={crearPluviometro} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre-p">Nombre</Label>
                <Input id="nombre-p" name="nombre" placeholder="Santa Anita N" required />
              </div>
              <p className="text-xs text-muted-foreground">
                Su ubicación se marca después desde el Mapa.
              </p>
              <Button type="submit" className="w-full">
                Crear
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {(pluviometros ?? []).length === 0 ? (
        <EmptyState
          icono={CloudRain}
          titulo="Sin pluviómetros"
          descripcion="Crea tus pluviómetros (usualmente uno por zona del rancho) para empezar a registrar lluvias."
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registrar lluvia</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={registrarLluvia} className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="fecha-ll">Fecha de la lluvia</Label>
                    <Input id="fecha-ll" name="fecha" type="date" defaultValue={hoy} required />
                  </div>
                  <Input
                    name="obs"
                    placeholder="Observaciones (opcional)"
                    className="max-w-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filas.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <Label htmlFor={`lectura_${p.id}`} className="text-xs">
                        {p.nombre}
                      </Label>
                      <Input
                        id={`lectura_${p.id}`}
                        name={`lectura_${p.id}`}
                        type="number"
                        step="0.1"
                        min="0"
                        inputMode="decimal"
                        placeholder="0.0"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Deja vacíos los pluviómetros donde no llovió o que no se leyeron.
                </p>
                <Button type="submit">Guardar lecturas</Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {listaAnios.map((a) => (
                <Link
                  key={a}
                  href={`/lluvias?anio=${a}`}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    a === anio ? "border-primary bg-primary/8 font-medium text-primary" : ""
                  }`}
                >
                  {a}
                </Link>
              ))}
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pluviómetro</TableHead>
                    {MESES.map((m) => (
                      <TableHead key={m} className="text-right">
                        {m}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      {(acumulado.get(p.id) ?? []).map((v, i) => (
                        <TableCell key={i} className="text-right tabular-nums">
                          {v ? formatoNumero(v, 1) : "·"}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatoNumero(totalPorPluviometro(p.id), 1)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40">
                    <TableCell className="font-semibold">Promedio</TableCell>
                    {promedioMes.map((v, i) => (
                      <TableCell key={i} className="text-right font-medium tabular-nums">
                        {v ? formatoNumero(v, 1) : "·"}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatoNumero(promedioTotal, 1)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
