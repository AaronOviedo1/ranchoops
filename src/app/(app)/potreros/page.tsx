import Link from "next/link";
import { ArchiveRestore, Fence, Map as MapIcon, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TablaPro } from "@/components/tabla-pro";
import { EmptyState, PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/estado-badge";
import { Aviso } from "@/components/aviso";
import { estadoPotrero } from "@/lib/estados";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoFecha, formatoNumero } from "@/lib/catalogos";
import type { Potrero, PotreroCarga, PotreroEstado } from "@/lib/tipos";
import {
  actualizarPotrero,
  crearPotrero,
  eliminarPotrero,
  reactivarPotrero,
} from "./acciones";
import { DialogoEliminarPotrero, DialogoPotrero } from "./componentes";

export const metadata = { title: "Potreros — RanchOps" };

export default async function PotrerosPage({
  searchParams,
}: PageProps<"/potreros">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const verArchivados = sp.archivados === "1";

  const [{ data: estados }, { data: grupos }, { data: cargas }, { data: completos }] =
    await Promise.all([
      supabase
        .from("v_potrero_estado")
        .select("*")
        .eq("rancho_id", rancho.id)
        .order("nombre"),
      supabase
        .from("grupos")
        .select("id, nombre")
        .eq("rancho_id", rancho.id),
      supabase
        .from("v_potrero_carga")
        .select("*")
        .eq("rancho_id", rancho.id),
      // La tabla completa, no la vista: el formulario de editar necesita la
      // vegetación y las notas (si no, guardar desde la lista las borraría), y
      // las vistas filtran `activo`, así que los archivados solo salen aquí.
      supabase
        .from("potreros")
        .select("*")
        .eq("rancho_id", rancho.id)
        .order("nombre"),
    ]);

  const nombreGrupo = new Map((grupos ?? []).map((g) => [g.id, g.nombre]));
  const carga = new Map(
    ((cargas ?? []) as PotreroCarga[]).map((c) => [c.potrero_id, c])
  );
  const lista = (estados ?? []) as PotreroEstado[];
  const meta = rancho.meta_dias_descanso;
  const ocupados = lista.filter((p) => p.grupo_actual_id);
  const listos = lista.filter((p) => !p.grupo_actual_id && (p.dias_descanso ?? 0) >= meta);
  const potreros = (completos ?? []) as Potrero[];
  const datosPor = new Map(potreros.map((p) => [p.id, p]));
  const guardados = potreros.filter((p) => !p.activo);
  const error = typeof sp.error === "string" ? sp.error : null;
  const archivado = typeof sp.archivado === "string" ? sp.archivado : null;
  const sinPermiso = sp.sin_permiso === "1";

  /**
   * Si un potrero ya tuvo grupo no se va a borrar, se va a archivar. Sale de
   * la misma vista que ya se cargó, sin una consulta por renglón.
   */
  const conHistorial = (p: PotreroEstado) =>
    !!p.grupo_actual_id || !!p.ocupado_desde || !!p.ultima_salida;

  return (
    <div>
      <PageHeader
        titulo="Potreros"
        descripcion={`${lista.length} potreros · ${ocupados.length} ocupados · ${listos.length} listos (≥${meta} días de descanso)`}
      >
        <Button variant="outline" render={<Link href="/mapa" />}>
          <MapIcon className="h-4 w-4" /> Ver mapa
        </Button>
        <DialogoPotrero action={crearPotrero} />
      </PageHeader>

      {error && (
        <Aviso tono="peligro" className="mb-4">{error}</Aviso>
      )}
      {sinPermiso && (
        <Aviso tono="peligro" className="mb-4">
          Tu usuario captura, pero no borra potreros. Pídeselo a un
          administrador del rancho.
        </Aviso>
      )}
      {archivado && (
        <Aviso tono="alerta" className="mb-4">
          <strong>{archivado}</strong> ya tenía historial de pastoreo, así que se
          archivó en vez de borrarse. Sigue contando para la carga de los meses
          en que se usó.
        </Aviso>
      )}

      {lista.length === 0 ? (
        <EmptyState
          icono={Fence}
          titulo="Sin potreros"
          descripcion="Crea tus potreros aquí o dibújalos directamente en el mapa."
        />
      ) : (
        <TablaPro
          id="potreros"
          datos={lista}
          claveDe={(p) => p.potrero_id}
          hrefDe={(p) => `/potreros/${p.potrero_id}`}
          agrupables={["estado"]}
          exportarHref="/potreros/exportar"
          columnas={[
            {
              clave: "nombre",
              encabezado: "Potrero",
              enTarjeta: "titulo",
              fija: true,
              celda: (p) => p.nombre,
            },
            {
              clave: "estado",
              encabezado: "Estado",
              enTarjeta: "estado",
              valorDe: (p) =>
                estadoPotrero(p.dias_descanso, meta, !!p.grupo_actual_id).etiqueta,
              celda: (p) => {
                const e = estadoPotrero(p.dias_descanso, meta, !!p.grupo_actual_id);
                return <EstadoBadge tono={e.tono}>{e.etiqueta}</EstadoBadge>;
              },
            },
            {
              clave: "has",
              encabezado: "Has",
              numerica: true,
              celda: (p) => formatoNumero(p.superficie_has, 1),
            },
            {
              clave: "cabezas",
              encabezado: "Cabezas",
              numerica: true,
              desde: "sm",
              celda: (p) => carga.get(p.potrero_id)?.cabezas || "—",
            },
            {
              clave: "ua",
              encabezado: "UA",
              numerica: true,
              desde: "md",
              celda: (p) => {
                const c = carga.get(p.potrero_id);
                return c && c.ua > 0 ? formatoNumero(c.ua, 1) : "—";
              },
            },
            {
              clave: "ua_ha",
              encabezado: "UA/ha",
              numerica: true,
              apagada: true,
              celda: (p) => {
                const c = carga.get(p.potrero_id);
                return c?.ua_por_ha ? formatoNumero(c.ua_por_ha, 2) : "—";
              },
            },
            {
              clave: "capacidad",
              encabezado: "% capacidad",
              numerica: true,
              desde: "md",
              celda: (p) => {
                const pct = carga.get(p.potrero_id)?.pct_capacidad;
                if (pct == null) return "—";
                // Solo aviso: la app no mueve nada sola.
                const tono = pct > 100 ? "peligro" : pct >= 80 ? "alerta" : "exito";
                return <EstadoBadge tono={tono}>{pct}%</EstadoBadge>;
              },
            },
            {
              clave: "grupo",
              encabezado: "Grupo",
              desde: "sm",
              celda: (p) =>
                p.grupo_actual_id
                  ? (nombreGrupo.get(p.grupo_actual_id) ?? "—")
                  : "—",
            },
            {
              clave: "fecha",
              encabezado: "Desde / última salida",
              desde: "md",
              celda: (p) =>
                p.grupo_actual_id
                  ? formatoFecha(p.ocupado_desde)
                  : formatoFecha(p.ultima_salida),
            },
            {
              clave: "dias",
              encabezado: "Días",
              celda: (p) =>
                p.grupo_actual_id ? (
                  <Badge variant="outline">{p.dias_ocupado} ocupado</Badge>
                ) : p.dias_descanso != null ? (
                  <Badge variant="outline">{p.dias_descanso} descanso</Badge>
                ) : (
                  "—"
                ),
            },
            {
              // Solo en escritorio: en el teléfono la tarjeta entera es un
              // enlace a la ficha y no puede llevar formularios adentro.
              clave: "acciones",
              encabezado: <span className="sr-only">Acciones</span>,
              etiqueta: "Acciones",
              enTarjeta: "oculto",
              celda: (p) => {
                const potrero = datosPor.get(p.potrero_id);
                return (
                  // `relative z-10`: el enlace de la primera celda se estira
                  // con after:inset-0 sobre toda la fila y taparía los botones.
                  <div className="relative z-10 flex items-center justify-end gap-1">
                    {potrero && (
                      <DialogoPotrero
                        action={actualizarPotrero.bind(null, p.potrero_id)}
                        potrero={potrero}
                        volverA="/potreros"
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground"
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                    )}
                    <DialogoEliminarPotrero
                      action={eliminarPotrero.bind(null, p.potrero_id)}
                      nombre={p.nombre}
                      conHistorial={conHistorial(p)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                          title="Eliminar"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  </div>
                );
              },
            },
          ]}
        />
      )}

      {guardados.length > 0 && (
        <div className="mt-6">
          {verArchivados ? (
            <div className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-heading font-semibold">
                  Potreros archivados ({guardados.length})
                </h2>
                <Button variant="ghost" size="sm" render={<Link href="/potreros" />}>
                  Ocultar
                </Button>
              </div>
              <ul className="space-y-2">
                {guardados.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link href={`/potreros/${p.id}`} className="font-medium underline">
                        {p.nombre}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.superficie_has
                          ? `${formatoNumero(p.superficie_has, 1)} has`
                          : "sin superficie"}
                      </span>
                    </div>
                    <form action={reactivarPotrero.bind(null, p.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        <ArchiveRestore className="size-4" /> Reactivar
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/potreros?archivados=1" />}
            >
              Ver archivados ({guardados.length})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
