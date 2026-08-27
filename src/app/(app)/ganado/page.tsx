import Link from "next/link";
import Image from "next/image";
import { Beef } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TablaPro } from "@/components/tabla-pro";
import { EmptyState, PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/estado-badge";
import { estadoAnimal } from "@/lib/estados";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { urlsFirmadas } from "@/lib/archivos";
import {
  ESPECIES,
  clasesDe,
  etiquetaClase,
  etiquetaReproductivo,
  formatoFecha,
} from "@/lib/catalogos";
import { comparaArete, filtroOr, terminosBusqueda } from "@/lib/busqueda";
import { edadTexto, paraReclasificar } from "@/lib/ciclo-vida";
import type { Animal, Grupo } from "@/lib/tipos";
import { BuscadorGanado, FiltroSelect } from "./filtros";
import { DialogoMoverLote } from "./mover-lote";
import { moverAnimales } from "./acciones";
import { AvisoReclasificar } from "./reclasificar";
import { BotonNuevoAnimal } from "./boton-nuevo";

export const metadata = { title: "Ganado — RanchOps" };

export default async function GanadoPage({ searchParams }: PageProps<"/ganado">) {
  const params = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const texto = (s: unknown) => (typeof s === "string" ? s.trim() : "");
  const q = texto(params.q);
  const especie = texto(params.especie);
  const clase = texto(params.clase);
  const grupo = texto(params.grupo);
  const status = texto(params.status) || "activo";

  let query = supabase
    .from("animales")
    .select("*, grupos(nombre), divisiones(nombre)")
    .eq("rancho_id", rancho.id)
    .limit(500);

  if (status !== "todos") query = query.eq("status", status);
  if (especie) query = query.eq("especie", especie);
  if (clase) query = query.eq("clase", clase);
  if (grupo) query = query.eq("grupo_id", grupo);

  const terminos = terminosBusqueda(q);
  if (terminos.length > 0) {
    query = query.or(filtroOr(["arete_control", "siniga", "nombre"], terminos));
  }

  const [{ data: animales }, { data: grupos }, { data: divisiones }, { data: activos }] =
    await Promise.all([
    query,
    supabase
      .from("grupos")
      .select("id, nombre")
      .eq("rancho_id", rancho.id)
      .eq("activo", true)
      .order("nombre"),
    supabase
      .from("divisiones")
      .select("id, nombre")
      .eq("rancho_id", rancho.id)
      .eq("activo", true)
      .order("nombre"),
    // Solo lo indispensable para saber a quién le toca cambiar de clase.
    supabase
      .from("animales")
      .select("id, arete_control, especie, clase, sexo, fecha_nacimiento")
      .eq("rancho_id", rancho.id)
      .eq("status", "activo")
      .not("fecha_nacimiento", "is", null)
      .limit(5000),
  ]);

  const lista = ((animales ?? []) as (Animal & {
    grupos: Pick<Grupo, "nombre"> | null;
    divisiones: { nombre: string } | null;
  })[]).sort((a, b) => comparaArete(a.arete_control, b.arete_control));

  const fotos = await urlsFirmadas(supabase, lista.map((a) => a.foto_url));
  const pendientes = paraReclasificar(activos ?? []);

  // Las especies que este rancho realmente tiene; sin ellas no hay qué filtrar.
  const especiesPresentes = ESPECIES.filter((e) =>
    (activos ?? []).some((a) => a.especie === e.valor)
  );
  const clasesVisibles = clasesDe(especie || especiesPresentes[0]?.valor || "bovino");

  const filtroUrl = (cambios: Record<string, string>) => {
    const p = new URLSearchParams({ q, especie, clase, grupo, status, ...cambios });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/ganado?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        titulo="Ganado"
        descripcion={`${lista.length} ${lista.length === 1 ? "animal" : "animales"}${
          status === "todos" ? "" : ` ${status}${lista.length === 1 ? "" : "s"}`
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {lista.length > 0 && (
            <DialogoMoverLote
              action={moverAnimales}
              animales={lista.map((a) => ({
                id: a.id,
                arete_control: a.arete_control,
                siniga: a.siniga,
                clase: a.clase,
                grupo_nombre: a.grupos?.nombre ?? null,
              }))}
              grupos={grupos ?? []}
              divisiones={divisiones ?? []}
            />
          )}
          <BotonNuevoAnimal />
        </div>
      </PageHeader>

      {pendientes.length > 0 && <AvisoReclasificar pendientes={pendientes} />}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <BuscadorGanado valorInicial={q} />
        {(grupos ?? []).length > 0 && (
          <FiltroSelect
            parametro="grupo"
            valor={grupo}
            placeholder="Todos los grupos"
            opciones={(grupos ?? []).map((g) => ({ valor: g.id, etiqueta: g.nombre }))}
          />
        )}
      </div>

      {especiesPresentes.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Link href={filtroUrl({ especie: "", clase: "" })}>
            <Badge variant={!especie ? "default" : "outline"}>Todas las especies</Badge>
          </Link>
          {especiesPresentes.map((e) => (
            <Link key={e.valor} href={filtroUrl({ especie: e.valor, clase: "" })}>
              <Badge variant={especie === e.valor ? "default" : "outline"}>{e.plural}</Badge>
            </Link>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href={filtroUrl({ clase: "" })}>
          <Badge variant={!clase ? "default" : "outline"}>Todas las clases</Badge>
        </Link>
        {clasesVisibles
          .filter((c) => c.valor !== "otro")
          .map((c) => (
            <Link key={c.valor} href={filtroUrl({ clase: c.valor })}>
              <Badge variant={clase === c.valor ? "default" : "outline"}>{c.plural}</Badge>
            </Link>
          ))}
        <span className="mx-2 border-l" />
        <Link href={filtroUrl({ status: "activo" })}>
          <Badge variant={status === "activo" ? "default" : "outline"}>Activos</Badge>
        </Link>
        <Link href={filtroUrl({ status: "todos" })}>
          <Badge variant={status === "todos" ? "default" : "outline"}>Todos</Badge>
        </Link>
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icono={Beef}
          titulo={q ? "Sin coincidencias" : "Sin animales"}
          descripcion={
            q
              ? `Nada con «${q}». Prueba con el arete o los últimos dígitos del SINIIGA.`
              : "Registra tu primer animal o ajusta los filtros."
          }
        >
          <BotonNuevoAnimal />
        </EmptyState>
      ) : (
        <TablaPro
          id="ganado"
          datos={lista}
          claveDe={(a) => a.id}
          hrefDe={(a) => `/ganado/${a.id}`}
          agrupables={["clase", "grupo", "status_rep", "division"]}
          exportarHref="/ganado/exportar"
          columnas={[
            {
              clave: "arete",
              encabezado: "Arete",
              enTarjeta: "titulo",
              fija: true,
              celda: (a) => (
                <span className="flex items-center gap-2">
                  {a.foto_url && fotos.get(a.foto_url) && (
                    <Image
                      src={fotos.get(a.foto_url)!}
                      alt=""
                      width={28}
                      height={28}
                      unoptimized
                      className="size-7 shrink-0 rounded-full object-cover"
                    />
                  )}
                  #{a.arete_control ?? "s/n"}
                </span>
              ),
            },
            {
              clave: "siniga",
              encabezado: "SINIIGA",
              enTarjeta: "subtitulo",
              celda: (a) => (
                <span className="font-mono text-xs text-muted-foreground">
                  {a.siniga ?? "—"}
                </span>
              ),
            },
            {
              clave: "status",
              encabezado: "Status",
              enTarjeta: "estado",
              celda: (a) => {
                const e = estadoAnimal(a.status);
                return <EstadoBadge tono={e.tono}>{e.etiqueta}</EstadoBadge>;
              },
            },
            {
              clave: "clase",
              encabezado: "Clase",
              valorDe: (a) => etiquetaClase(a.clase),
              celda: (a) => etiquetaClase(a.clase),
            },
            {
              clave: "edad",
              encabezado: "Edad",
              desde: "md",
              celda: (a) => edadTexto(a.fecha_nacimiento),
            },
            {
              clave: "raza",
              encabezado: "Raza",
              desde: "lg",
              celda: (a) => a.raza ?? "—",
            },
            {
              clave: "nacimiento",
              encabezado: "Nacimiento",
              desde: "lg",
              celda: (a) => formatoFecha(a.fecha_nacimiento),
            },
            {
              clave: "grupo",
              encabezado: "Grupo",
              desde: "sm",
              valorDe: (a) => a.grupos?.nombre,
              celda: (a) => a.grupos?.nombre ?? "—",
            },
            {
              clave: "status_rep",
              encabezado: "Status rep.",
              desde: "sm",
              valorDe: (a) => etiquetaReproductivo(a.status_reproductivo),
              celda: (a) => etiquetaReproductivo(a.status_reproductivo),
            },
            {
              clave: "division",
              encabezado: "División",
              desde: "sm",
              apagada: true,
              valorDe: (a) => a.divisiones?.nombre,
              celda: (a) => a.divisiones?.nombre ?? "—",
            },
            {
              clave: "color",
              encabezado: "Color",
              desde: "sm",
              apagada: true,
              celda: (a) => a.color_pelaje ?? "—",
            },
            {
              clave: "procedencia",
              encabezado: "Procedencia",
              desde: "sm",
              apagada: true,
              celda: (a) => a.procedencia ?? "—",
            },
            {
              clave: "en_campo",
              encabezado: "En campo desde",
              desde: "sm",
              apagada: true,
              celda: (a) => formatoFecha(a.fecha_en_campo),
            },
          ]}
        />
      )}
    </div>
  );
}
