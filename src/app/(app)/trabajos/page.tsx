import Link from "next/link";
import { Layers, Plus, ScanLine, Syringe } from "lucide-react";
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

  // Cuántos trabajos se hicieron en cada jornada, para marcarlos como uno solo.
  const enJornada = new Map<string, number>();
  for (const e of eventos ?? []) {
    if (e.sesion_id) enJornada.set(e.sesion_id, (enJornada.get(e.sesion_id) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader titulo="Trabajos de ganado" descripcion="Últimos 100 registros">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/trabajos/manga" />}>
            <ScanLine className="h-4 w-4" /> Manga
          </Button>
          <Button render={<Link href="/trabajos/nuevo" />}>
            <Plus className="h-4 w-4" /> Trabajar ganado
          </Button>
        </div>
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
                <span className="flex items-center gap-1.5">
                  <Badge variant="outline">{etiquetaTrabajo(e.tipo)}</Badge>
                  {e.sesion_id && (
                    <span
                      title={`Misma jornada: ${enJornada.get(e.sesion_id) ?? 1} trabajos`}
                      className="flex items-center gap-0.5 text-xs text-muted-foreground"
                    >
                      <Layers className="size-3" />
                      {enJornada.get(e.sesion_id) ?? 1}
                    </span>
                  )}
                </span>
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
