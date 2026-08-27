import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TablaPro } from "@/components/tabla-pro";
import { EmptyState, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatoFecha, formatoMoneda, formatoNumero } from "@/lib/catalogos";

export const metadata = { title: "Compras — RanchOps" };

export default async function ComprasPage({ searchParams }: PageProps<"/compras">) {
  const sp = await searchParams;
  const { rancho } = await requireAdmin();
  const supabase = await createClient();

  const anioActual = new Date().getFullYear();
  const anio = typeof sp.anio === "string" ? Number(sp.anio) : anioActual;

  const { data: compras } = await supabase
    .from("compras")
    .select("*, divisiones(nombre), compra_renglones(cabezas, kilos, total)")
    .eq("rancho_id", rancho.id)
    .gte("fecha", `${anio}-01-01`)
    .lte("fecha", `${anio}-12-31`)
    .order("fecha", { ascending: false });

  const lista = (compras ?? []).map((c) => {
    const renglones = (c.compra_renglones ?? []) as {
      cabezas: number;
      kilos: number | null;
      total: number;
    }[];
    return {
      ...c,
      divisionNombre:
        (c.divisiones as unknown as { nombre: string } | null)?.nombre ?? null,
      cabezas: renglones.reduce((s, r) => s + r.cabezas, 0),
      kilos: renglones.reduce((s, r) => s + Number(r.kilos ?? 0), 0),
      total: renglones.reduce((s, r) => s + Number(r.total), 0),
    };
  });

  const totalAnio = lista.reduce((s, c) => s + c.total, 0);
  const cabezasAnio = lista.reduce((s, c) => s + c.cabezas, 0);
  const anios = Array.from({ length: 5 }, (_, i) => anioActual - i);

  return (
    <div>
      <PageHeader
        titulo="Compras"
        descripcion={`${cabezasAnio} cabezas compradas en ${anio}`}
      >
        <Button render={<Link href="/compras/nueva" />}>
          <Plus className="h-4 w-4" /> Nueva compra
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {anios.map((a) => (
          <Link
            key={a}
            href={`/compras?anio=${a}`}
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
        <EmptyState
          icono={ShoppingCart}
          titulo={`Sin compras en ${anio}`}
          descripcion="Registra aquí el ganado que entra comprado; el gasto se carga a la división."
        >
          <Button render={<Link href="/compras/nueva" />}>
            <Plus className="h-4 w-4" /> Nueva compra
          </Button>
        </EmptyState>
      ) : (
        <TablaPro
          id="compras"
          datos={lista}
          claveDe={(c) => c.id}
          hrefDe={(c) => `/compras/${c.id}`}
          agrupables={["proveedor", "division"]}
          exportarHref="/registros/exportar?tipo=compras"
          columnas={[
            {
              clave: "proveedor",
              encabezado: "Proveedor",
              enTarjeta: "titulo",
              fija: true,
              valorDe: (c) => c.proveedor,
              celda: (c) => c.proveedor ?? "—",
            },
            {
              clave: "fecha",
              encabezado: "Fecha",
              enTarjeta: "subtitulo",
              celda: (c) => formatoFecha(c.fecha),
            },
            {
              clave: "total",
              encabezado: "Total",
              numerica: true,
              enTarjeta: "estado",
              celda: (c) => (
                <span className="font-heading font-semibold tabular-nums">
                  {formatoMoneda(c.total)}
                </span>
              ),
            },
            {
              clave: "cabezas",
              encabezado: "Cabezas",
              numerica: true,
              celda: (c) => c.cabezas,
            },
            {
              clave: "kilos",
              encabezado: "Kilos",
              numerica: true,
              desde: "sm",
              celda: (c) => (c.kilos > 0 ? formatoNumero(c.kilos) : "—"),
            },
            {
              clave: "division",
              encabezado: "División",
              desde: "md",
              valorDe: (c) => c.divisionNombre,
              celda: (c) => c.divisionNombre ?? "—",
            },
          ]}
        />
      )}
    </div>
  );
}
