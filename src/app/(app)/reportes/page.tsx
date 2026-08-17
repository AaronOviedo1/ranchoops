import Link from "next/link";
import { Download } from "lucide-react";
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
import {
  CLASES_ANIMAL,
  etiquetaTrabajo,
  formatoMoneda,
  formatoNumero,
} from "@/lib/catalogos";

export const metadata = { title: "Reportes — RanchOps" };

export default async function ReportesPage({
  searchParams,
}: PageProps<"/reportes">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const mesActual = new Date().toISOString().slice(0, 7);
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesActual;
  const inicio = `${mes}-01`;
  const fin = `${mes}-31`;

  const [
    { data: activos },
    { data: eventosMes },
    { data: renglonesMes },
    { data: gastosMes },
    { data: consumosMes },
    { data: lluviasMes },
    { count: pluviometros },
  ] = await Promise.all([
    supabase.from("animales").select("clase").eq("rancho_id", rancho.id).eq("status", "activo"),
    supabase
      .from("eventos")
      .select("tipo, evento_animales(count)")
      .eq("rancho_id", rancho.id)
      .gte("fecha", inicio)
      .lte("fecha", fin),
    supabase
      .from("venta_renglones")
      .select("clase, cabezas, total, ventas!inner(fecha)")
      .eq("rancho_id", rancho.id)
      .gte("ventas.fecha", inicio)
      .lte("ventas.fecha", fin),
    supabase
      .from("gastos")
      .select("categoria, monto")
      .eq("rancho_id", rancho.id)
      .gte("fecha", inicio)
      .lte("fecha", fin),
    supabase
      .from("inventario_movimientos")
      .select("cantidad, productos(nombre, unidad)")
      .eq("rancho_id", rancho.id)
      .eq("tipo", "salida")
      .gte("fecha", inicio)
      .lte("fecha", fin),
    supabase
      .from("lluvias")
      .select("cantidad")
      .eq("rancho_id", rancho.id)
      .gte("fecha", inicio)
      .lte("fecha", fin),
    supabase
      .from("pluviometros")
      .select("id", { count: "exact", head: true })
      .eq("rancho_id", rancho.id)
      .eq("activo", true),
  ]);

  const porClase = new Map<string, number>();
  for (const a of activos ?? []) porClase.set(a.clase, (porClase.get(a.clase) ?? 0) + 1);

  const trabajosPorTipo = new Map<string, { eventos: number; animales: number }>();
  for (const e of eventosMes ?? []) {
    const actual = trabajosPorTipo.get(e.tipo) ?? { eventos: 0, animales: 0 };
    actual.eventos += 1;
    actual.animales += (e.evento_animales as { count: number }[])?.[0]?.count ?? 0;
    trabajosPorTipo.set(e.tipo, actual);
  }

  const ventasPorClase = new Map<string, { cabezas: number; total: number }>();
  for (const r of renglonesMes ?? []) {
    const actual = ventasPorClase.get(r.clase) ?? { cabezas: 0, total: 0 };
    actual.cabezas += r.cabezas;
    actual.total += Number(r.total);
    ventasPorClase.set(r.clase, actual);
  }

  const gastosPorCategoria = new Map<string, number>();
  for (const g of gastosMes ?? []) {
    gastosPorCategoria.set(g.categoria, (gastosPorCategoria.get(g.categoria) ?? 0) + Number(g.monto));
  }

  const consumoPorProducto = new Map<string, { cantidad: number; unidad: string }>();
  for (const c of consumosMes ?? []) {
    const p = c.productos as unknown as { nombre: string; unidad: string } | null;
    if (!p) continue;
    const actual = consumoPorProducto.get(p.nombre) ?? { cantidad: 0, unidad: p.unidad };
    actual.cantidad += Number(c.cantidad);
    consumoPorProducto.set(p.nombre, actual);
  }

  const lluviaPromedio =
    pluviometros && (lluviasMes ?? []).length > 0
      ? (lluviasMes ?? []).reduce((s, l) => s + Number(l.cantidad), 0) / pluviometros
      : null;

  const nombreMes = new Date(`${mes}-15`).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const mesAnterior = new Date(`${mes}-15`);
  mesAnterior.setMonth(mesAnterior.getMonth() - 1);
  const mesSiguiente = new Date(`${mes}-15`);
  mesSiguiente.setMonth(mesSiguiente.getMonth() + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 7);

  const totalGastos = [...gastosPorCategoria.values()].reduce((a, b) => a + b, 0);
  const totalVentas = [...ventasPorClase.values()].reduce((a, b) => a + b.total, 0);

  return (
    <div>
      <PageHeader
        titulo="Reportes"
        descripcion={`Reporte mensual de ${nombreMes} (se genera solo con lo capturado)`}
      >
        <Button
          variant="outline"
          render={<a href={`/reportes/exportar?tipo=ganado`} />}
        >
          <Download className="h-4 w-4" /> Inventario CSV
        </Button>
        <Button
          variant="outline"
          render={<a href={`/reportes/exportar?tipo=mensual&mes=${mes}`} />}
        >
          <Download className="h-4 w-4" /> Reporte CSV
        </Button>
      </PageHeader>

      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href={`/reportes?mes=${fmt(mesAnterior)}`} className="rounded-md border px-3 py-1 hover:bg-accent">
          ← {fmt(mesAnterior)}
        </Link>
        <span className="font-medium capitalize">{nombreMes}</span>
        {mes < mesActual && (
          <Link href={`/reportes?mes=${fmt(mesSiguiente)}`} className="rounded-md border px-3 py-1 hover:bg-accent">
            {fmt(mesSiguiente)} →
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventario actual por clase</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {CLASES_ANIMAL.filter((c) => porClase.has(c.valor)).map((c) => (
                  <TableRow key={c.valor}>
                    <TableCell>{c.plural}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {porClase.get(c.valor)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(activos ?? []).length}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trabajos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            {trabajosPorTipo.size === 0 ? (
              <p className="text-sm text-muted-foreground">Sin trabajos este mes.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajo</TableHead>
                    <TableHead className="text-right">Veces</TableHead>
                    <TableHead className="text-right">Animales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...trabajosPorTipo.entries()].map(([tipo, v]) => (
                    <TableRow key={tipo}>
                      <TableCell>{etiquetaTrabajo(tipo)}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.eventos}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.animales}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Ventas del mes · {formatoMoneda(totalVentas)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ventasPorClase.size === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas este mes.</p>
            ) : (
              <Table>
                <TableBody>
                  {[...ventasPorClase.entries()].map(([clase, v]) => (
                    <TableRow key={clase}>
                      <TableCell className="capitalize">{clase}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.cabezas} cab.</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatoMoneda(v.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Costos del mes · {formatoMoneda(totalGastos)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gastosPorCategoria.size === 0 ? (
              <p className="text-sm text-muted-foreground">Sin gastos este mes.</p>
            ) : (
              <Table>
                <TableBody>
                  {[...gastosPorCategoria.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, monto]) => (
                      <TableRow key={cat}>
                        <TableCell>{cat}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatoMoneda(monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consumo de insumos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            {consumoPorProducto.size === 0 ? (
              <p className="text-sm text-muted-foreground">Sin consumos este mes.</p>
            ) : (
              <Table>
                <TableBody>
                  {[...consumoPorProducto.entries()].map(([nombre, v]) => (
                    <TableRow key={nombre}>
                      <TableCell>{nombre}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatoNumero(v.cantidad, 1)} {v.unidad}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lluvia del mes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {lluviaPromedio == null ? (
              <p className="text-muted-foreground">Sin lecturas este mes.</p>
            ) : (
              <p>
                Promedio del rancho:{" "}
                <span className="text-xl font-semibold tabular-nums">
                  {formatoNumero(lluviaPromedio, 1)}
                  {rancho.unidad_lluvia === "mm" ? " mm" : '"'}
                </span>{" "}
                <Link href="/lluvias" className="underline">
                  ver detalle
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
