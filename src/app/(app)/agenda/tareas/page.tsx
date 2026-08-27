import Link from "next/link";
import { ArrowLeft, Check, Copy, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/aviso";
import { EmptyState, PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/estado-badge";
import { TablaPro } from "@/components/tabla-pro";
import { estadoPrioridad, estadoTarea } from "@/lib/estados";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoFecha } from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";
import type { Tarea } from "@/lib/tipos";
import {
  completarTarea,
  copiarTarea,
  crearTarea,
  editarTarea,
} from "../acciones";
import { DialogoTarea } from "./dialogo-tarea";

export const metadata = { title: "Tareas — RanchOps" };

export default async function TareasPage({
  searchParams,
}: PageProps<"/agenda/tareas">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const mostrarHechas = sp.hechas === "1";

  const [{ data: tareas }, { data: miembros }, { data: potreros }, { data: grupos }] =
    await Promise.all([
      supabase
        .from("tareas")
        .select("*, potreros(nombre), grupos(nombre), perfiles:responsable_id(nombre)")
        .eq("rancho_id", rancho.id)
        .order("fecha_vence", { ascending: true, nullsFirst: false })
        .limit(500),
      supabase
        .from("rancho_usuarios")
        .select("usuario_id, perfiles:usuario_id(nombre)")
        .eq("rancho_id", rancho.id),
      supabase
        .from("potreros")
        .select("id, nombre")
        .eq("rancho_id", rancho.id)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("grupos")
        .select("id, nombre")
        .eq("rancho_id", rancho.id)
        .eq("activo", true)
        .order("nombre"),
    ]);

  type Fila = Tarea & {
    potreros: { nombre: string } | null;
    grupos: { nombre: string } | null;
    perfiles: { nombre: string | null } | null;
  };
  const todas = (tareas ?? []) as unknown as Fila[];
  const lista = todas.filter((t) =>
    mostrarHechas ? true : t.estado === "pendiente" || t.estado === "en_curso"
  );
  const pendientes = todas.filter(
    (t) => t.estado === "pendiente" || t.estado === "en_curso"
  ).length;

  const opcionesMiembros = ((miembros ?? []) as unknown as {
    usuario_id: string;
    perfiles: { nombre: string | null } | null;
  }[]).map((m) => ({
    valor: m.usuario_id,
    etiqueta: m.perfiles?.nombre ?? "Sin nombre",
  }));
  const opcionesPotreros = (potreros ?? []).map((p) => ({ valor: p.id, etiqueta: p.nombre }));
  const opcionesGrupos = (grupos ?? []).map((g) => ({ valor: g.id, etiqueta: g.nombre }));

  const hoy = fechaHoy();
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div>
      <PageHeader
        titulo="Tareas"
        descripcion={`${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}`}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/agenda" />}>
            <ArrowLeft className="size-4" /> Agenda
          </Button>
          <DialogoTarea
            action={crearTarea}
            miembros={opcionesMiembros}
            potreros={opcionesPotreros}
            grupos={opcionesGrupos}
            abiertoInicial={sp.nueva === "1"}
          />
        </div>
      </PageHeader>

      {error && <Aviso tono="peligro" className="mb-4">{error}</Aviso>}

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/agenda/tareas">
          <Badge variant={!mostrarHechas ? "default" : "outline"}>Pendientes</Badge>
        </Link>
        <Link href="/agenda/tareas?hechas=1">
          <Badge variant={mostrarHechas ? "default" : "outline"}>Todas</Badge>
        </Link>
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icono={ListTodo}
          titulo={mostrarHechas ? "Sin tareas" : "Sin pendientes"}
          descripcion="Apunta aquí lo que no se puede olvidar: la bomba, el cerco, la vacuna que toca."
        >
          <DialogoTarea
            action={crearTarea}
            miembros={opcionesMiembros}
            potreros={opcionesPotreros}
            grupos={opcionesGrupos}
          />
        </EmptyState>
      ) : (
        <TablaPro
          id="tareas"
          datos={lista}
          claveDe={(t) => t.id}
          agrupables={["categoria", "responsable", "estado"]}
          exportarHref="/agenda/exportar"
          columnas={[
            {
              clave: "nombre",
              encabezado: "Tarea",
              enTarjeta: "titulo",
              fija: true,
              celda: (t) => (
                <span className={t.estado === "hecha" ? "text-muted-foreground line-through" : undefined}>
                  {t.nombre}
                </span>
              ),
            },
            {
              clave: "prioridad",
              encabezado: "Prioridad",
              celda: (t) => {
                const p = estadoPrioridad(t.prioridad);
                return <EstadoBadge tono={p.tono}>{p.etiqueta}</EstadoBadge>;
              },
            },
            {
              clave: "vence",
              encabezado: "Vence",
              enTarjeta: "subtitulo",
              celda: (t) =>
                t.fecha_vence ? (
                  <span
                    className={
                      t.fecha_vence < hoy && t.estado !== "hecha"
                        ? "font-medium text-peligro-fuerte"
                        : undefined
                    }
                  >
                    {formatoFecha(t.fecha_vence)}
                  </span>
                ) : (
                  "—"
                ),
            },
            {
              clave: "responsable",
              encabezado: "Responsable",
              desde: "sm",
              valorDe: (t) => t.perfiles?.nombre,
              celda: (t) => t.perfiles?.nombre ?? "—",
            },
            {
              clave: "ubicacion",
              encabezado: "Dónde",
              desde: "md",
              celda: (t) => t.potreros?.nombre ?? t.grupos?.nombre ?? "—",
            },
            {
              clave: "categoria",
              encabezado: "Categoría",
              desde: "lg",
              apagada: true,
              valorDe: (t) => t.categoria,
              celda: (t) => t.categoria,
            },
            {
              clave: "estado",
              encabezado: "Estado",
              enTarjeta: "estado",
              valorDe: (t) => estadoTarea(t.estado).etiqueta,
              celda: (t) => {
                const e = estadoTarea(t.estado);
                return <EstadoBadge tono={e.tono}>{e.etiqueta}</EstadoBadge>;
              },
            },
            {
              clave: "acciones",
              encabezado: "",
              celda: (t) => (
                <div className="flex items-center gap-1">
                  {t.estado !== "hecha" && t.estado !== "cancelada" && (
                    <form action={completarTarea.bind(null, t.id)}>
                      <Button variant="ghost" size="sm" type="submit" title="Marcar hecha">
                        <Check className="size-4" /> Hecha
                      </Button>
                    </form>
                  )}
                  <form action={copiarTarea.bind(null, t.id)}>
                    <Button variant="ghost" size="sm" type="submit" title="Duplicar">
                      <Copy className="size-4" />
                    </Button>
                  </form>
                  <DialogoTarea
                    action={editarTarea.bind(null, t.id)}
                    tarea={t}
                    miembros={opcionesMiembros}
                    potreros={opcionesPotreros}
                    grupos={opcionesGrupos}
                  />
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
