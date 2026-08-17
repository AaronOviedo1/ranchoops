import Link from "next/link";
import { HandCoins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TablaResponsiva } from "@/components/tabla-responsiva";
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
        <EmptyState icono={HandCoins} titulo={`Sin ventas en ${anio}`}>
          <Button render={<Link href="/ventas/nueva" />}>
            <Plus className="h-4 w-4" /> Nueva venta
          </Button>
        </EmptyState>
      ) : (
        <TablaResponsiva
          datos={lista}
          claveDe={(v) => v.id}
          hrefDe={(v) => `/ventas/${v.id}`}
          columnas={[
            {
              clave: "comprador",
              encabezado: "Comprador",
              enTarjeta: "titulo",
              celda: (v) => v.comprador ?? "—",
            },
            {
              clave: "fecha",
              encabezado: "Fecha",
              enTarjeta: "subtitulo",
              celda: (v) => formatoFecha(v.fecha),
            },
            {
              clave: "total",
              encabezado: "Total",
              numerica: true,
              enTarjeta: "estado",
              celda: (v) => (
                <span className="font-heading font-semibold tabular-nums">
                  {formatoMoneda(v.total)}
                </span>
              ),
            },
            {
              clave: "cabezas",
              encabezado: "Cabezas",
              numerica: true,
              celda: (v) => v.cabezas,
            },
            {
              clave: "kilos",
              encabezado: "Kilos",
              numerica: true,
              desde: "sm",
              celda: (v) => formatoNumero(v.kilos),
            },
            {
              clave: "guia",
              encabezado: "GUIA / REEMO",
              desde: "md",
              celda: (v) => [v.guia, v.reemo].filter(Boolean).join(" / ") || "—",
            },
          ]}
        />
      )}
    </div>
  );
}
