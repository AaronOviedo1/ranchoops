import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Aviso } from "@/components/aviso";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { CATEGORIAS_INVENTARIO, categoriaDeTipo, formatoMoneda } from "@/lib/catalogos";
import { cargarInventario } from "./datos";
import { AvisoStockBajo, PanelMovimientos, TablaResumen, valorDe } from "./componentes";
import { DialogoEntrada, DialogoProducto } from "./dialogos";

export const metadata = { title: "Inventario — RanchOps" };

/**
 * "Todo": el inventario completo, pero ya no revuelto. Cada categoría es una
 * sección con su tabla, y su pestaña la enseña con sus propias columnas.
 */
export default async function InventarioPage({
  searchParams,
}: PageProps<"/inventario">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { existencias, movimientos } = await cargarInventario(supabase, rancho.id);
  const error = typeof sp.error === "string" ? sp.error : null;

  const secciones = CATEGORIAS_INVENTARIO.map((categoria) => ({
    categoria,
    productos: existencias.filter((e) => categoriaDeTipo(e.tipo).slug === categoria.slug),
  })).filter((s) => s.productos.length > 0);

  return (
    <div>
      <PageHeader
        titulo="Inventario de insumos"
        descripcion="Alimentos, minerales, medicamentos, vacunas y semen, cada uno en su pestaña"
      >
        <DialogoProducto />
        <DialogoEntrada productos={existencias} />
      </PageHeader>

      {error && (
        <Aviso tono="peligro" className="mb-4">
          {error}
        </Aviso>
      )}

      <AvisoStockBajo existencias={existencias} />

      {existencias.length === 0 ? (
        <EmptyState icono={Package} titulo="Sin productos" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {secciones.map(({ categoria, productos }) => (
              <section key={categoria.slug}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="flex items-baseline gap-2 font-heading text-base font-semibold">
                    <Link
                      href={`/inventario/${categoria.slug}`}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {categoria.etiqueta}
                      <ChevronRight className="size-4 self-center text-muted-foreground" />
                    </Link>
                    <span className="text-xs font-normal text-muted-foreground">
                      {productos.length}
                    </span>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatoMoneda(valorDe(productos))}
                  </p>
                </div>
                <TablaResumen existencias={productos} />
              </section>
            ))}
          </div>

          <PanelMovimientos movimientos={movimientos} />
        </div>
      )}
    </div>
  );
}
