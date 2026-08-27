import Link from "next/link";
import { BarChart3, ChevronRight, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoNumero } from "@/lib/catalogos";
import {
  ANALISIS,
  FAMILIAS_REGISTRO,
  TIPOS_EVENTO_CONOCIDOS,
  TIPOS_REGISTRO,
} from "@/lib/registros";

export const metadata = { title: "Registros — RanchOps" };

/**
 * El archivero del rancho: todo lo capturado, consultable por tipo.
 * La captura vive en Trabajos; aquí nomás se consulta y se exporta.
 */
export default async function RegistrosPage() {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const hace12m = new Date();
  hace12m.setFullYear(hace12m.getFullYear() - 1);
  const desde = hace12m.toISOString().slice(0, 10);

  const [
    { data: eventos },
    { count: ventasAnimal },
    { count: compras },
    { count: movimientos },
    { data: vientres },
    { count: activos },
  ] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, tipo, fecha, evento_animales(count)")
      .eq("rancho_id", rancho.id)
      .neq("tipo", "nota_bitacora")
      .limit(20000),
    supabase
      .from("venta_animales")
      .select("animal_id", { count: "exact", head: true })
      .eq("rancho_id", rancho.id),
    supabase
      .from("compras")
      .select("id", { count: "exact", head: true })
      .eq("rancho_id", rancho.id),
    supabase
      .from("grupo_movimientos")
      .select("id", { count: "exact", head: true })
      .eq("rancho_id", rancho.id),
    supabase
      .from("animales")
      .select("id")
      .eq("rancho_id", rancho.id)
      .eq("status", "activo")
      .in("clase", ["vaca", "vaquilla"]),
    supabase
      .from("animales")
      .select("id", { count: "exact", head: true })
      .eq("rancho_id", rancho.id)
      .eq("status", "activo"),
  ]);

  // Conteos por tipo de registro (eventos por renglón de animal)
  const porTipoEvento = new Map<string, { eventos: number; animales: number }>();
  const doceMeses = { parto: 0, muerte: 0, destete: 0 };
  for (const e of eventos ?? []) {
    const acc = porTipoEvento.get(e.tipo) ?? { eventos: 0, animales: 0 };
    acc.eventos += 1;
    acc.animales += (e.evento_animales as { count: number }[])?.[0]?.count ?? 0;
    porTipoEvento.set(e.tipo, acc);
    if (e.fecha >= desde && e.tipo in doceMeses) {
      doceMeses[e.tipo as keyof typeof doceMeses] += 1;
    }
  }

  const conteoDe = (slug: string): number => {
    const t = TIPOS_REGISTRO.find((x) => x.slug === slug);
    if (!t) return 0;
    if (t.fuente === "venta_animales") return ventasAnimal ?? 0;
    if (t.fuente === "compras") return compras ?? 0;
    if (t.fuente === "grupo_movimientos") return movimientos ?? 0;
    let n = 0;
    for (const tipo of t.tiposEvento ?? []) {
      n += porTipoEvento.get(tipo)?.eventos ?? 0;
    }
    if (t.slug === "otros") {
      // La cubeta también junta los tipos que nadie declaró.
      for (const [tipo, c] of porTipoEvento) {
        if (!TIPOS_EVENTO_CONOCIDOS.has(tipo)) n += c.eventos;
      }
    }
    return n;
  };

  const numVientres = (vientres ?? []).length;
  const paricion =
    numVientres > 0 ? (doceMeses.parto / numVientres) * 100 : null;
  const mortalidad =
    (activos ?? 0) + doceMeses.muerte > 0
      ? (doceMeses.muerte / ((activos ?? 0) + doceMeses.muerte)) * 100
      : null;

  return (
    <div>
      <PageHeader
        titulo="Registros"
        descripcion="Todo lo capturado, consultable y exportable por tipo"
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          etiqueta="Parición 12 meses"
          valor={paricion != null ? `${formatoNumero(paricion, 0)}%` : "—"}
          detalle={`${doceMeses.parto} partos · ${numVientres} vientres`}
          href="/registros/nacimientos"
          tono="exito"
          destacado
        />
        <StatTile
          etiqueta="Mortalidad 12 meses"
          valor={mortalidad != null ? `${formatoNumero(mortalidad, 1)}%` : "—"}
          detalle={`${doceMeses.muerte} bajas`}
          href="/registros/muertes"
          tono={doceMeses.muerte > 0 ? "peligro" : "neutro"}
          destacado
        />
        <StatTile
          etiqueta="Destetes 12 meses"
          valor={formatoNumero(doceMeses.destete)}
          href="/registros/destetes"
          tono="info"
          destacado
        />
        <StatTile
          etiqueta="Cabezas activas"
          valor={formatoNumero(activos ?? 0)}
          href="/ganado"
          destacado
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-semibold">Análisis</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ANALISIS.map((a) => (
            <Link key={a.slug} href={`/registros/${a.slug}`}>
              <Card className="h-full border-primary/30 transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <BarChart3 className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.etiqueta}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.descripcion}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {FAMILIAS_REGISTRO.map((familia) => (
        <section key={familia.clave} className="mt-8">
          <h2 className="mb-3 font-heading text-lg font-semibold">
            {familia.etiqueta}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TIPOS_REGISTRO.filter((t) => t.familia === familia.clave).map(
              (t) => {
                const n = conteoDe(t.slug);
                return (
                  <Link key={t.slug} href={`/registros/${t.slug}`}>
                    <Card className="h-full transition-colors hover:bg-accent/50">
                      <CardContent className="flex items-center gap-3 p-4">
                        <ClipboardList className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{t.etiqueta}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.descripcion}
                          </p>
                        </div>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatoNumero(n)}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              }
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
