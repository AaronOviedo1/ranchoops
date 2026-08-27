import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Beef, Pencil, Syringe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GRAFICAS_HEX } from "@/lib/colores";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { urlFirmada } from "@/lib/archivos";
import {
  etiquetaClase,
  etiquetaReproductivo,
  etiquetaArete,
  etiquetaTrabajo,
  formatoFecha,
  formatoNumero,
} from "@/lib/catalogos";
import { edadTexto } from "@/lib/ciclo-vida";
import { fechaHoy } from "@/lib/fechas";
import { categoriaDSE, dseAnimal } from "@/lib/dse";
import {
  diasEntre,
  formatoGdp,
  gananciaDesdeNacimiento,
  gananciaDiaria,
} from "@/lib/pesos";
import { Aviso } from "@/components/aviso";
import { GraficaPeso, type PuntoPeso } from "@/components/graficas/grafica-peso";
import type { Animal, AnimalEnRetiro, Evento, EventoAnimal } from "@/lib/tipos";
import { registrarMuerte, registrarParto } from "../acciones";
import { DialogoMuerte, DialogoParto } from "./acciones-rapidas";
import { PanelAnimal } from "./panel";

export const metadata = { title: "Animal — RanchOps" };

export default async function AnimalPage({ params }: PageProps<"/ganado/[id]">) {
  const { id } = await params;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { data: animal } = await supabase
    .from("animales")
    .select(
      "*, grupos(id, nombre, potreros:potrero_actual_id(id, nombre)), divisiones(id, nombre), madre:madre_id(id, arete_control, siniga), padre:padre_id(id, arete_control, siniga)"
    )
    .eq("id", id)
    .eq("rancho_id", rancho.id)
    .single();

  if (!animal) notFound();
  type Pariente = { id: string; arete_control: string | null; siniga: string | null };
  const a = animal as unknown as Animal & {
    grupos: {
      id: string;
      nombre: string;
      potreros: { id: string; nombre: string } | null;
    } | null;
    divisiones: { id: string; nombre: string } | null;
    madre: Pariente | null;
    padre: Pariente | null;
  };

  const [{ data: historial }, { data: crias }, { data: pesos }, { data: retiros }] = await Promise.all([
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
    supabase
      .from("v_animales_en_retiro")
      .select("*")
      .eq("animal_id", id)
      .order("retiro_hasta", { ascending: false }),
  ]);

  const eventos = ((historial ?? []) as unknown as (EventoAnimal & {
    eventos: Evento & { productos: { nombre: string } | null };
  })[]).sort((x, y) => (y.eventos.fecha < x.eventos.fecha ? -1 : 1));

  // Historial de pesajes, del más nuevo al más viejo.
  const pesajes = (pesos ?? [])
    .map((p) => ({
      fecha: (p.eventos as unknown as { fecha: string }).fecha,
      peso: (p.valores as { peso?: number } | null)?.peso,
    }))
    .filter((p): p is { fecha: string; peso: number } => p.peso != null)
    .sort((x, y) => y.fecha.localeCompare(x.fecha));

  const ultimoPeso = pesajes[0];

  // La condición corporal más reciente que le hayan calificado.
  const ultimaCondicion = eventos
    .filter((ea) => ea.eventos.tipo === "condicion_corporal" && ea.valores?.condicion != null)
    .map((ea) => ({ fecha: ea.eventos.fecha, condicion: ea.valores!.condicion! }))[0];
  // Contra el pesaje anterior; si es el primero, contra el peso al nacer.
  const gdp = ultimoPeso
    ? gananciaDiaria(pesajes[1] ?? null, ultimoPeso) ??
      gananciaDesdeNacimiento(a, ultimoPeso)
    : null;

  const foto = await urlFirmada(supabase, a.foto_url);
  const partoAction = registrarParto.bind(null, a.id);
  const muerteAction = registrarMuerte.bind(null, a.id);

  // ── Retiro vigente (la app avisa, la persona decide) ──
  const retiro = ((retiros ?? []) as AnimalEnRetiro[])[0];

  // ── Curva de peso y proyección contra la meta ──
  const fechaCorta = (f: string) =>
    new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });

  const puntosReales: { fecha: string; peso: number }[] = [];
  if (a.fecha_nacimiento && a.peso_nacimiento != null) {
    puntosReales.push({ fecha: a.fecha_nacimiento, peso: a.peso_nacimiento });
  }
  if (a.fecha_destete && a.peso_destete != null) {
    puntosReales.push({ fecha: a.fecha_destete, peso: a.peso_destete });
  }
  for (const p of pesajes) puntosReales.push({ fecha: p.fecha, peso: p.peso });
  puntosReales.sort((x, y) => x.fecha.localeCompare(y.fecha));
  // Un punto por fecha: si el destete coincidió con báscula, gana la báscula.
  const porFecha = new Map(puntosReales.map((p) => [p.fecha, p.peso]));
  const curva: PuntoPeso[] = [...porFecha.entries()]
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([fecha, peso]) => ({ fecha: fechaCorta(fecha), peso }));

  const hayMeta = a.peso_objetivo != null && a.fecha_objetivo != null;
  let gdpRequerida: number | null = null;
  let pesoProyectado: number | null = null;
  if (hayMeta && ultimoPeso) {
    const dias = diasEntre(ultimoPeso.fecha, a.fecha_objetivo!);
    if (dias > 0) {
      gdpRequerida = (a.peso_objetivo! - ultimoPeso.peso) / dias;
      if (gdp != null) pesoProyectado = ultimoPeso.peso + gdp * dias;
    }
    // Tramo punteado: del último punto real a la meta.
    if (curva.length > 0) {
      curva[curva.length - 1].proyeccion = ultimoPeso.peso;
      curva.push({
        fecha: fechaCorta(a.fecha_objetivo!),
        proyeccion: a.peso_objetivo!,
      });
    }
  }

  const dse = dseAnimal(a);
  const categoria = categoriaDSE(a.especie, a.categoria_dse);
  const diasEnCampo = a.fecha_en_campo ? diasEntre(a.fecha_en_campo, fechaHoy()) : null;

  // Las tarjetas de arriba: lo que se pregunta de un animal sin abrir nada más.
  const metricas: {
    etiqueta: string;
    valor: string;
    detalle?: string | null;
    color: string;
    apagada?: boolean;
  }[] = [
    {
      etiqueta: "Último peso",
      valor: ultimoPeso ? `${formatoNumero(ultimoPeso.peso, 1)} kg` : "N/D",
      detalle: ultimoPeso ? formatoFecha(ultimoPeso.fecha) : "Sin pesajes",
      color: GRAFICAS_HEX[1],
      apagada: !ultimoPeso,
    },
    {
      etiqueta: "Ganancia diaria",
      valor: gdp != null ? formatoGdp(gdp) : "N/D",
      detalle: gdp != null ? "Contra el pesaje anterior" : "Falta un segundo pesaje",
      color: GRAFICAS_HEX[3],
      apagada: gdp == null,
    },
    {
      etiqueta: "DSE",
      valor: dse ? formatoNumero(dse, 2) : "N/D",
      detalle: categoria?.etiqueta ?? etiquetaClase(a.clase),
      color: GRAFICAS_HEX[0],
      apagada: !dse,
    },
    {
      etiqueta: "Condición corporal",
      valor: ultimaCondicion ? `${ultimaCondicion.condicion} de 5` : "N/D",
      detalle: ultimaCondicion ? formatoFecha(ultimaCondicion.fecha) : "Sin calificar",
      color: GRAFICAS_HEX[4],
      apagada: !ultimaCondicion,
    },
    {
      etiqueta: "En período de retiro",
      valor: retiro ? `${retiro.dias_retiro} días` : "No",
      detalle: retiro
        ? `${retiro.producto}, hasta el ${formatoFecha(retiro.retiro_hasta)}`
        : "Se puede vender",
      color: retiro ? GRAFICAS_HEX[2] : "var(--color-border)",
      apagada: !retiro,
    },
  ];

  const datosIdentidad: [string, string | null | undefined][] = [
    ["SINIIGA", a.siniga],
    ["Nombre", a.nombre],
    ["Sexo", a.sexo === "H" ? "Hembra" : a.sexo === "M" ? "Macho" : null],
    ["Color de pelaje", a.color_pelaje],
    ["Tipo de arete", a.tipo_arete ? etiquetaArete(a.tipo_arete) : null],
    ["Identificado", a.fecha_identificacion ? formatoFecha(a.fecha_identificacion) : null],
  ];

  const datosVida: [string, string | null | undefined][] = [
    [
      "Nacimiento",
      a.fecha_nacimiento
        ? `${formatoFecha(a.fecha_nacimiento)} (${edadTexto(a.fecha_nacimiento)})`
        : null,
    ],
    [
      "En el campo desde",
      a.fecha_en_campo
        ? `${formatoFecha(a.fecha_en_campo)}${diasEnCampo != null ? ` (${diasEnCampo} días)` : ""}`
        : null,
    ],
    ["Peso al nacer", a.peso_nacimiento ? `${formatoNumero(a.peso_nacimiento, 1)} kg` : null],
    [
      "Peso al destete",
      a.peso_destete
        ? `${formatoNumero(a.peso_destete, 1)} kg${a.fecha_destete ? ` (${formatoFecha(a.fecha_destete)})` : ""}`
        : null,
    ],
    ["Procedencia", a.procedencia],
    ["Causa de salida", a.causa_salida],
  ];

  const filas = (datos: [string, string | null | undefined][]) =>
    datos
      .filter(([, valor]) => valor)
      .map(([etiqueta, valor]) => (
        <div key={etiqueta} className="flex justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{etiqueta}</span>
          <span className="text-right font-medium">{valor}</span>
        </div>
      ));

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

      {retiro && (
        <Aviso tono="alerta" className="mb-4">
          En período de retiro por <strong>{retiro.producto}</strong> hasta el{" "}
          <strong>{formatoFecha(retiro.retiro_hasta)}</strong> ({retiro.dias_retiro}{" "}
          días desde el {formatoFecha(retiro.fecha_tratamiento)}). La carne no
          debería venderse antes; tú decides.
        </Aviso>
      )}

      {/* La identidad a la izquierda, siempre a la vista; lo que cambia con el
          tiempo a la derecha, repartido en pestañas. */}
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-6">
              {foto ? (
                <Image
                  src={foto}
                  alt={`Animal #${a.arete_control ?? "s/n"}`}
                  width={400}
                  height={300}
                  unoptimized
                  className="aspect-4/3 w-full rounded-lg border object-cover"
                />
              ) : (
                <div className="flex aspect-4/3 w-full items-center justify-center rounded-lg border border-dashed bg-muted/40">
                  <Beef className="size-10 text-muted-foreground/60" />
                </div>
              )}

              <div>
                <p className="font-heading text-lg font-semibold leading-tight">
                  {a.raza ?? etiquetaClase(a.clase)}
                </p>
                <p className="text-xs tracking-wider text-muted-foreground uppercase">
                  {etiquetaClase(a.clase)}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">{filas(datosIdentidad)}</div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Badge
                  variant={a.status === "activo" ? "secondary" : "destructive"}
                  className="capitalize"
                >
                  {a.status}
                </Badge>
                {a.status_reproductivo && (
                  <Badge variant="outline">
                    {etiquetaReproductivo(a.status_reproductivo)}
                  </Badge>
                )}
                {categoria && <Badge variant="outline">{categoria.etiqueta}</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">{filas(datosVida)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Genealogía</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Padre</span>
                {a.padre ? (
                  <Link href={`/ganado/${a.padre.id}`} className="font-medium underline">
                    #{a.padre.arete_control ?? "s/n"}
                  </Link>
                ) : (
                  <span className="font-medium">{a.padre_texto ?? "Sin registrar"}</span>
                )}
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Madre</span>
                {a.madre ? (
                  <Link href={`/ganado/${a.madre.id}`} className="font-medium underline">
                    #{a.madre.arete_control ?? "s/n"}
                  </Link>
                ) : (
                  <span className="font-medium">Sin registrar</span>
                )}
              </div>
              {(crias ?? []).length > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Crías</span>
                  <span className="font-medium">{crias!.length}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dónde anda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Potrero</span>
                {a.grupos?.potreros ? (
                  <Link
                    href={`/potreros/${a.grupos.potreros.id}`}
                    className="font-medium underline"
                  >
                    {a.grupos.potreros.nombre}
                  </Link>
                ) : (
                  <span className="font-medium">Sin potrero</span>
                )}
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Grupo</span>
                {a.grupos ? (
                  <Link href={`/grupos/${a.grupos.id}`} className="font-medium underline">
                    {a.grupos.nombre}
                  </Link>
                ) : (
                  <span className="font-medium">Sin grupo</span>
                )}
              </div>
              {a.divisiones && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">División</span>
                  <span className="font-medium">{a.divisiones.nombre}</span>
                </div>
              )}
              {a.fecha_ingreso_grupo && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">En el grupo desde</span>
                  <span className="font-medium">
                    {formatoFecha(a.fecha_ingreso_grupo)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {a.notas && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{a.notas}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <PanelAnimal
          acciones={
            <Button variant="outline" size="sm" render={<Link href="/trabajos/nuevo" />}>
              <Syringe className="h-4 w-4" /> Registrar trabajo
            </Button>
          }
          produccion={
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metricas.map((m) => (
                  <Card
                    key={m.etiqueta}
                    className="border-t-4"
                    style={{ borderTopColor: m.color }}
                  >
                    <CardContent className="pt-4">
                      <p className="text-xs tracking-wider text-muted-foreground uppercase">
                        {m.etiqueta}
                      </p>
                      <p
                        className={`font-heading text-2xl font-semibold ${
                          m.apagada ? "text-muted-foreground" : ""
                        }`}
                      >
                        {m.valor}
                      </p>
                      {m.detalle && (
                        <p className="text-xs text-muted-foreground">{m.detalle}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {curva.length >= 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Peso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GraficaPeso datos={curva} />
                    {hayMeta && ultimoPeso && (
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-muted-foreground">Meta</p>
                          <p className="font-medium">
                            {formatoNumero(a.peso_objetivo!, 0)} kg al{" "}
                            {formatoFecha(a.fecha_objetivo)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">GDP requerida</p>
                          <p
                            className={
                              gdpRequerida != null && gdp != null
                                ? gdp >= gdpRequerida
                                  ? "font-medium text-exito-fuerte"
                                  : "font-medium text-peligro-fuerte"
                                : "font-medium"
                            }
                          >
                            {formatoGdp(gdpRequerida)}
                            {gdp != null && ` (lleva ${formatoGdp(gdp)})`}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Proyección a la meta</p>
                          <p className="font-medium">
                            {pesoProyectado != null
                              ? `${formatoNumero(pesoProyectado, 0)} kg al paso actual`
                              : "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

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
            </>
          }
          historial={
            <Card>
              <CardContent className="pt-6">
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
                          {(v?.peso != null ||
                            v?.condicion != null ||
                            v?.resultado ||
                            e.resultado) && (
                            <p className="text-sm text-muted-foreground">
                              {v?.peso != null && <>Peso: {formatoNumero(v.peso, 1)} kg. </>}
                              {v?.condicion != null && <>Condición: {v.condicion} de 5. </>}
                              {(v?.resultado ?? e.resultado) && (
                                <>Resultado: {v?.resultado ?? e.resultado}. </>
                              )}
                            </p>
                          )}
                          {(v?.obs ?? e.obs) && (
                            <p className="text-sm text-muted-foreground">
                              {v?.obs ?? e.obs}
                            </p>
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
          }
        />
      </div>
    </div>
  );
}
