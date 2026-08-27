import Link from "next/link";
import { Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TablaResponsiva } from "@/components/tabla-responsiva";
import { EmptyState, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatoFecha, formatoMoneda } from "@/lib/catalogos";
import { crearGasto, eliminarGasto } from "./acciones";
import { DialogoGasto } from "./dialogo-gasto";
import { hayLectorDeTickets } from "./leer-ticket";

export const metadata = { title: "Costos — RanchOps" };

export default async function CostosPage({ searchParams }: PageProps<"/costos">) {
  const sp = await searchParams;
  const { rancho } = await requireAdmin();
  const lector = await hayLectorDeTickets();
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
        <DialogoGasto
          action={crearGasto}
          divisiones={divisiones ?? []}
          grupos={grupos ?? []}
          hayLector={lector}
        />
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
        <EmptyState icono={Receipt} titulo={`Sin gastos en ${nombreMes}`} />
      ) : (
        <TablaResponsiva
          datos={gastosMes!}
          claveDe={(g) => g.id}
          columnas={[
            {
              clave: "concepto",
              encabezado: "Concepto",
              enTarjeta: "titulo",
              celda: (g) => g.concepto,
            },
            {
              clave: "fecha",
              encabezado: "Fecha",
              enTarjeta: "subtitulo",
              celda: (g) => formatoFecha(g.fecha),
            },
            {
              clave: "monto",
              encabezado: "Monto",
              numerica: true,
              enTarjeta: "estado",
              celda: (g) => (
                <span className="font-heading font-semibold tabular-nums">
                  {formatoMoneda(Number(g.monto))}
                </span>
              ),
            },
            {
              clave: "categoria",
              encabezado: "Categoría",
              desde: "sm",
              celda: (g) => g.categoria,
            },
            {
              clave: "proveedor",
              encabezado: "Proveedor",
              desde: "md",
              celda: (g) => g.proveedor ?? "—",
            },
            {
              clave: "division",
              encabezado: "División",
              desde: "lg",
              celda: (g) =>
                (g.divisiones as unknown as { nombre: string } | null)?.nombre ?? "—",
            },
            {
              clave: "acciones",
              encabezado: <span className="sr-only">Acciones</span>,
              enTarjeta: "oculto",
              celda: (g) => (
                <form action={eliminarGasto.bind(null, g.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    title="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
