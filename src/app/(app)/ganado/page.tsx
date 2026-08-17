import Link from "next/link";
import { Beef, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablaResponsiva } from "@/components/tabla-responsiva";
import { EmptyState, PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/estado-badge";
import { estadoAnimal } from "@/lib/estados";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { CLASES_ANIMAL, formatoFecha } from "@/lib/catalogos";
import type { Animal, Grupo } from "@/lib/tipos";

export const metadata = { title: "Ganado — RanchOps" };

export default async function GanadoPage({
  searchParams,
}: PageProps<"/ganado">) {
  const params = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const clase = typeof params.clase === "string" ? params.clase : "";
  const status = typeof params.status === "string" ? params.status : "activo";

  let query = supabase
    .from("animales")
    .select("*, grupos(nombre)")
    .eq("rancho_id", rancho.id)
    .order("arete_control", { ascending: true })
    .limit(500);

  if (status && status !== "todos") query = query.eq("status", status);
  if (clase) query = query.eq("clase", clase);
  if (q) {
    query = query.or(
      `arete_control.ilike.%${q}%,siniga.ilike.%${q}%,nombre.ilike.%${q}%`
    );
  }

  const { data: animales } = await query;
  const lista = (animales ?? []) as (Animal & { grupos: Pick<Grupo, "nombre"> | null })[];

  const filtroUrl = (cambios: Record<string, string>) => {
    const p = new URLSearchParams({ q, clase, status, ...cambios });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/ganado?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        titulo="Ganado"
        descripcion={`${lista.length} animales ${status === "todos" ? "" : status + "s"}`}
      >
        <Button render={<Link href="/ganado/nuevo" />}>
          <Plus className="h-4 w-4" /> Nuevo animal
        </Button>
      </PageHeader>

      <form action="/ganado" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          name="q"
          placeholder="Buscar arete, SINIIGA o nombre…"
          defaultValue={q}
          className="w-full sm:w-64"
        />
        <input type="hidden" name="status" value={status} />
        {clase && <input type="hidden" name="clase" value={clase} />}
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href={filtroUrl({ clase: "" })}>
          <Badge variant={!clase ? "default" : "outline"}>Todas las clases</Badge>
        </Link>
        {CLASES_ANIMAL.filter((c) => c.valor !== "otro").map((c) => (
          <Link key={c.valor} href={filtroUrl({ clase: c.valor })}>
            <Badge variant={clase === c.valor ? "default" : "outline"}>
              {c.plural}
            </Badge>
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
          titulo="Sin animales"
          descripcion="Registra tu primer animal o ajusta los filtros."
        >
          <Button render={<Link href="/ganado/nuevo" />}>
            <Plus className="h-4 w-4" /> Nuevo animal
          </Button>
        </EmptyState>
      ) : (
        <TablaResponsiva
          datos={lista}
          claveDe={(a) => a.id}
          hrefDe={(a) => `/ganado/${a.id}`}
          columnas={[
            {
              clave: "arete",
              encabezado: "Arete",
              enTarjeta: "titulo",
              celda: (a) => `#${a.arete_control ?? "s/n"}`,
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
              celda: (a) => <span className="capitalize">{a.clase}</span>,
            },
            {
              clave: "raza",
              encabezado: "Raza",
              desde: "sm",
              celda: (a) => a.raza ?? "—",
            },
            {
              clave: "nacimiento",
              encabezado: "Nacimiento",
              desde: "md",
              celda: (a) => formatoFecha(a.fecha_nacimiento),
            },
            {
              clave: "grupo",
              encabezado: "Grupo",
              desde: "sm",
              celda: (a) => a.grupos?.nombre ?? "—",
            },
            {
              clave: "status_rep",
              encabezado: "Status rep.",
              celda: (a) => a.status_reproductivo ?? "—",
            },
          ]}
        />
      )}
    </div>
  );
}
