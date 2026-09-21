import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Aviso } from "@/components/aviso";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { categoriaInventario, formatoMoneda } from "@/lib/catalogos";
import { cargarInventario } from "../datos";
import { AvisoStockBajo, PanelMovimientos, TablaCategoria, valorDe } from "../componentes";
import { DialogoEntrada, DialogoProducto } from "../dialogos";

export async function generateMetadata({ params }: PageProps<"/inventario/[categoria]">) {
  const categoria = categoriaInventario((await params).categoria);
  return { title: `${categoria?.etiqueta ?? "Inventario"} — RanchOps` };
}

/** Una pestaña del inventario: solo lo suyo, con sus columnas, avisos y movimientos. */
export default async function CategoriaInventarioPage({
  params,
  searchParams,
}: PageProps<"/inventario/[categoria]">) {
  const categoria = categoriaInventario((await params).categoria);
  if (!categoria) notFound();

  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { existencias, movimientos } = await cargarInventario(
    supabase,
    rancho.id,
    categoria.tipos
  );
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div>
      <PageHeader
        titulo={categoria.etiqueta}
        descripcion={
          existencias.length > 0
            ? `${existencias.length} ${existencias.length === 1 ? "producto" : "productos"} · ${formatoMoneda(valorDe(existencias))} en bodega`
            : "Inventario de insumos"
        }
      >
        <DialogoProducto categoria={categoria} />
        <DialogoEntrada productos={existencias} categoria={categoria} />
      </PageHeader>

      {error && (
        <Aviso tono="peligro" className="mb-4">
          {error}
        </Aviso>
      )}

      <AvisoStockBajo existencias={existencias} />

      {/* La tabla a todo lo ancho: cada pestaña trae más columnas que "Todo". */}
      <div className="space-y-4">
        <TablaCategoria
          categoria={categoria}
          existencias={existencias}
          vacio={
            <EmptyState
              icono={Package}
              titulo={`Sin productos en ${categoria.etiqueta.toLowerCase()}`}
            />
          }
        />
        <div className="max-w-xl">
          <PanelMovimientos movimientos={movimientos} />
        </div>
      </div>
    </div>
  );
}
