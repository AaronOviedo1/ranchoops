import Link from "next/link";
import { Plus, Syringe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TablaResponsiva } from "@/components/tabla-responsiva";
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
          icono={Syringe}
          titulo="Sin trabajos registrados"
          descripcion="Registra vacunaciones, palpaciones, pesajes y más; cada trabajo queda en el historial de los animales."
        >
          <Button render={<Link href="/trabajos/nuevo" />}>
            <Plus className="h-4 w-4" /> Trabajar ganado
          </Button>
        </EmptyState>
      ) : (
        <TablaResponsiva
          datos={eventos!}
          claveDe={(e) => e.id}
          columnas={[
            {
              clave: "tipo",
              encabezado: "Trabajo",
              enTarjeta: "titulo",
              celda: (e) => (
                <Badge variant="outline">{etiquetaTrabajo(e.tipo)}</Badge>
              ),
            },
            {
              clave: "fecha",
              encabezado: "Fecha",
              enTarjeta: "subtitulo",
              celda: (e) => formatoFecha(e.fecha),
            },
            {
              clave: "grupo",
              encabezado: "Grupo",
              celda: (e) =>
                (e.grupos as { nombre: string } | null)?.nombre ?? "—",
            },
            {
              clave: "animales",
              encabezado: "Animales",
              numerica: true,
              celda: (e) =>
                (e.evento_animales as { count: number }[] | null)?.[0]?.count ?? 0,
            },
            {
              clave: "producto",
              encabezado: "Producto",
              desde: "sm",
              celda: (e) => (
                <>
                  {(e.productos as { nombre: string } | null)?.nombre ?? "—"}
                  {e.dosis && (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      ({e.dosis})
                    </span>
                  )}
                </>
              ),
            },
            {
              clave: "costo",
              encabezado: "Costo",
              numerica: true,
              desde: "md",
              celda: (e) => formatoMoneda(e.costo_total),
            },
            {
              clave: "obs",
              encabezado: "Obs.",
              desde: "lg",
              celda: (e) => e.resultado ?? e.obs ?? "—",
            },
          ]}
        />
      )}
    </div>
  );
}
