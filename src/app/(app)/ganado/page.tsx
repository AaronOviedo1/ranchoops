import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { CLASES_ANIMAL, formatoFecha } from "@/lib/catalogos";
import type { Animal, Grupo } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const STATUS_COLORES: Record<string, string> = {
  activo: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  vendido: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  muerto: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  desecho: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  transferido: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

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
          emoji="🐄"
          titulo="Sin animales"
          descripcion="Registra tu primer animal o ajusta los filtros."
        >
          <Button render={<Link href="/ganado/nuevo" />}>
            <Plus className="h-4 w-4" /> Nuevo animal
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arete</TableHead>
                <TableHead>SINIIGA</TableHead>
                <TableHead>Clase</TableHead>
                <TableHead className="hidden sm:table-cell">Raza</TableHead>
                <TableHead className="hidden md:table-cell">Nacimiento</TableHead>
                <TableHead className="hidden sm:table-cell">Grupo</TableHead>
                <TableHead>Status rep.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((a) => (
                <TableRow key={a.id} className="relative">
                  <TableCell className="font-medium">
                    <Link
                      href={`/ganado/${a.id}`}
                      className="after:absolute after:inset-0"
                    >
                      #{a.arete_control ?? "s/n"}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {a.siniga ?? "—"}
                  </TableCell>
                  <TableCell className="capitalize">{a.clase}</TableCell>
                  <TableCell className="hidden sm:table-cell">{a.raza ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatoFecha(a.fecha_nacimiento)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {a.grupos?.nombre ?? "—"}
                  </TableCell>
                  <TableCell>{a.status_reproductivo ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        STATUS_COLORES[a.status]
                      )}
                    >
                      {a.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
