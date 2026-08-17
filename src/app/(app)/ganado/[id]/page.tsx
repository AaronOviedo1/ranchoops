import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { etiquetaTrabajo, formatoFecha, formatoNumero } from "@/lib/catalogos";
import type { Animal, Evento, EventoAnimal } from "@/lib/tipos";
import { registrarMuerte, registrarParto } from "../acciones";
import { DialogoMuerte, DialogoParto } from "./acciones-rapidas";

export const metadata = { title: "Animal — RanchOps" };

function edadTexto(fechaNacimiento: string | null): string | null {
  if (!fechaNacimiento) return null;
  const meses = Math.floor(
    (Date.now() - new Date(fechaNacimiento).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  if (meses < 24) return `${meses} meses`;
  return `${(meses / 12).toFixed(1)} años`;
}

export default async function AnimalPage({ params }: PageProps<"/ganado/[id]">) {
  const { id } = await params;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { data: animal } = await supabase
    .from("animales")
    .select("*, grupos(id, nombre), divisiones(id, nombre), madre:madre_id(id, arete_control, siniga)")
    .eq("id", id)
    .eq("rancho_id", rancho.id)
    .single();

  if (!animal) notFound();
  const a = animal as unknown as Animal & {
    grupos: { id: string; nombre: string } | null;
    divisiones: { id: string; nombre: string } | null;
    madre: { id: string; arete_control: string | null; siniga: string | null } | null;
  };

  const [{ data: historial }, { data: crias }, { data: pesos }] = await Promise.all([
    supabase
      .from("evento_animales")
      .select("*, eventos(*, productos(nombre))")
      .eq("animal_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("animales")
      .select("id, arete_control, sexo, fecha_nacimiento, status")
      .eq("madre_id", id)
      .order("fecha_nacimiento", { ascending: false }),
    supabase
      .from("evento_animales")
      .select("valores, eventos!inner(fecha, tipo)")
      .eq("animal_id", id)
      .eq("eventos.tipo", "pesaje"),
  ]);

  const eventos = ((historial ?? []) as unknown as (EventoAnimal & {
    eventos: Evento & { productos: { nombre: string } | null };
  })[]).sort((x, y) => (y.eventos.fecha < x.eventos.fecha ? -1 : 1));

  const ultimoPeso = (pesos ?? [])
    .map((p) => ({
      fecha: (p.eventos as unknown as { fecha: string }).fecha,
      peso: (p.valores as { peso?: number } | null)?.peso,
    }))
    .filter((p) => p.peso != null)
    .sort((x, y) => (y.fecha < x.fecha ? -1 : 1))[0];

  const partoAction = registrarParto.bind(null, a.id);
  const muerteAction = registrarMuerte.bind(null, a.id);

  return (
    <div>
      <PageHeader titulo={`#${a.arete_control ?? "s/n"}`}>
        <div className="flex flex-wrap gap-2">
          {a.status === "activo" && a.sexo === "H" && (
            <DialogoParto action={partoAction} padreSugerido={a.padre_texto} />
          )}
          {a.status === "activo" && <DialogoMuerte action={muerteAction} />}
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/ganado/${a.id}/editar`} />}
          >
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </div>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge className="capitalize">{a.clase}</Badge>
        <Badge variant={a.status === "activo" ? "secondary" : "destructive"} className="capitalize">
          {a.status}
        </Badge>
        {a.status_reproductivo && <Badge variant="outline">{a.status_reproductivo}</Badge>}
        {a.raza && <Badge variant="outline">{a.raza}</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["SINIIGA", a.siniga],
              ["Nombre", a.nombre],
              ["Sexo", a.sexo === "H" ? "Hembra" : a.sexo === "M" ? "Macho" : null],
              ["Nacimiento", a.fecha_nacimiento ? `${formatoFecha(a.fecha_nacimiento)} (${edadTexto(a.fecha_nacimiento)})` : null],
              ["Peso al nacer", a.peso_nacimiento ? `${formatoNumero(a.peso_nacimiento, 1)} kg` : null],
              ["Último peso", ultimoPeso ? `${formatoNumero(ultimoPeso.peso!, 1)} kg (${formatoFecha(ultimoPeso.fecha)})` : null],
              ["Procedencia", a.procedencia],
              ["Padre / semental", a.padre_texto],
              ["División", a.divisiones?.nombre],
            ].map(
              ([etiqueta, valor]) =>
                valor && (
                  <div key={etiqueta as string} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{etiqueta}</span>
                    <span className="text-right font-medium">{valor}</span>
                  </div>
                )
            )}
            {a.madre && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Madre</span>
                <Link href={`/ganado/${a.madre.id}`} className="font-medium underline">
                  #{a.madre.arete_control ?? "s/n"}
                </Link>
              </div>
            )}
            {a.grupos && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Grupo</span>
                <Link href={`/grupos/${a.grupos.id}`} className="font-medium underline">
                  {a.grupos.nombre}
                </Link>
              </div>
            )}
            {a.causa_salida && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Causa de salida</span>
                <span className="font-medium">{a.causa_salida}</span>
              </div>
            )}
            {a.notas && (
              <>
                <Separator />
                <p className="text-muted-foreground">{a.notas}</p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {(crias ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Crías ({crias!.length})</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {crias!.map((c) => (
                  <Link
                    key={c.id}
                    href={`/ganado/${c.id}`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    #{c.arete_control ?? "s/n"} · {c.sexo ?? "?"} ·{" "}
                    {formatoFecha(c.fecha_nacimiento)}
                    {c.status !== "activo" && (
                      <span className="ml-1 text-destructive">({c.status})</span>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Línea de tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              {eventos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay eventos registrados para este animal.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l pl-4">
                  {eventos.map((ea) => {
                    const e = ea.eventos;
                    const v = ea.valores;
                    return (
                      <li key={ea.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                        <p className="text-xs text-muted-foreground">
                          {formatoFecha(e.fecha)}
                        </p>
                        <p className="text-sm font-medium">
                          {etiquetaTrabajo(e.tipo)}
                          {e.productos?.nombre && (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              · {e.productos.nombre}
                              {e.dosis ? ` (${e.dosis})` : ""}
                            </span>
                          )}
                        </p>
                        {(v?.peso != null || v?.resultado || e.resultado) && (
                          <p className="text-sm text-muted-foreground">
                            {v?.peso != null && <>Peso: {formatoNumero(v.peso, 1)} kg. </>}
                            {(v?.resultado ?? e.resultado) && (
                              <>Resultado: {v?.resultado ?? e.resultado}. </>
                            )}
                          </p>
                        )}
                        {(v?.obs ?? e.obs) && (
                          <p className="text-sm text-muted-foreground">{v?.obs ?? e.obs}</p>
                        )}
                        {e.responsable && (
                          <p className="text-xs text-muted-foreground">
                            Responsable: {e.responsable}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
