import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  CalendarioMes,
  type CapaAgenda,
  type ElementoAgenda,
} from "@/components/calendario-mes";
import { createClient } from "@/lib/supabase/server";
import { requireMembresia } from "@/lib/auth";
import { etiquetaTrabajo, formatoFecha, formatoNumero } from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";

export const metadata = { title: "Agenda — RanchOps" };

const CAPAS: CapaAgenda[] = [
  { clave: "trabajos", etiqueta: "Trabajos", color: "var(--chart-1)" },
  { clave: "tareas", etiqueta: "Tareas", color: "var(--chart-2)" },
  { clave: "lluvias", etiqueta: "Lluvias", color: "var(--chart-3)" },
  { clave: "movimientos", etiqueta: "Movimientos", color: "var(--chart-4)" },
  { clave: "bitacora", etiqueta: "Bitácora", color: "var(--chart-5)" },
];

/**
 * El mes del rancho de un vistazo: lo hecho (trabajos, lluvias, movimientos,
 * bitácora) y lo por hacer (tareas), en capas que se prenden y apagan.
 * La captura vive donde siempre; el botón Crear nomás lleva.
 */
export default async function AgendaPage({
  searchParams,
}: PageProps<"/agenda">) {
  const sp = await searchParams;
  const { rancho, rol } = await requireMembresia();
  const supabase = await createClient();

  const hoy = fechaHoy();
  const mes = /^\d{4}-\d{2}$/.test(String(sp.mes ?? "")) ? String(sp.mes) : hoy.slice(0, 7);
  const dia =
    typeof sp.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : null;

  const capasParam = typeof sp.capas === "string" ? sp.capas : "";
  const activas = new Set(
    capasParam ? capasParam.split(",").filter(Boolean) : CAPAS.map((c) => c.clave)
  );

  const inicio = `${mes}-01`;
  const fin = `${mes}-31`;

  const [
    { data: eventos },
    { data: tareas },
    { data: lluvias },
    { data: movs },
  ] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, tipo, fecha, obs, evento_animales(count)")
      .eq("rancho_id", rancho.id)
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .limit(2000),
    supabase
      .from("tareas")
      .select("id, nombre, fecha_vence, estado, prioridad")
      .eq("rancho_id", rancho.id)
      .gte("fecha_vence", inicio)
      .lte("fecha_vence", fin),
    supabase
      .from("lluvias")
      .select("fecha, cantidad")
      .eq("rancho_id", rancho.id)
      .gte("fecha", inicio)
      .lte("fecha", fin),
    supabase
      .from("grupo_movimientos")
      .select("id, fecha_entrada, fecha_salida, grupos(nombre), potreros(nombre)")
      .eq("rancho_id", rancho.id)
      .or(`and(fecha_entrada.gte.${inicio},fecha_entrada.lte.${fin}),and(fecha_salida.gte.${inicio},fecha_salida.lte.${fin})`),
  ]);

  const elementos: ElementoAgenda[] = [];

  if (activas.has("trabajos") || activas.has("bitacora")) {
    for (const e of eventos ?? []) {
      const esNota = e.tipo === "nota_bitacora";
      if (esNota && !activas.has("bitacora")) continue;
      if (!esNota && !activas.has("trabajos")) continue;
      const n = (e.evento_animales as { count: number }[])?.[0]?.count ?? 0;
      elementos.push({
        fecha: e.fecha,
        capa: esNota ? "bitacora" : "trabajos",
        etiqueta: esNota
          ? (e.obs ?? "Nota")
          : `${etiquetaTrabajo(e.tipo)}${n > 0 ? ` (${n})` : ""}`,
        href: esNota ? "/bitacora" : "/trabajos",
      });
    }
  }

  if (activas.has("tareas")) {
    for (const t of tareas ?? []) {
      if (!t.fecha_vence || t.estado === "cancelada") continue;
      elementos.push({
        fecha: t.fecha_vence,
        capa: "tareas",
        etiqueta: `${t.estado === "hecha" ? "✓ " : ""}${t.nombre}`,
        href: "/agenda/tareas",
      });
    }
  }

  if (activas.has("lluvias")) {
    const porDia = new Map<string, number>();
    for (const l of lluvias ?? []) {
      porDia.set(l.fecha, (porDia.get(l.fecha) ?? 0) + Number(l.cantidad));
    }
    const unidad = rancho.unidad_lluvia === "mm" ? "mm" : '"';
    for (const [fecha, suma] of porDia) {
      elementos.push({
        fecha,
        capa: "lluvias",
        etiqueta: `Lluvia ${formatoNumero(suma, 1)}${unidad}`,
        href: "/lluvias",
      });
    }
  }

  if (activas.has("movimientos")) {
    type Mov = {
      fecha_entrada: string;
      fecha_salida: string | null;
      grupos: { nombre: string } | null;
      potreros: { nombre: string } | null;
    };
    for (const m of (movs ?? []) as unknown as Mov[]) {
      const grupo = m.grupos?.nombre ?? "Grupo";
      const potrero = m.potreros?.nombre ?? "potrero";
      if (m.fecha_entrada.slice(0, 7) === mes) {
        elementos.push({
          fecha: m.fecha_entrada,
          capa: "movimientos",
          etiqueta: `${grupo} → ${potrero}`,
          href: "/potreros",
        });
      }
      if (m.fecha_salida && m.fecha_salida.slice(0, 7) === mes) {
        elementos.push({
          fecha: m.fecha_salida,
          capa: "movimientos",
          etiqueta: `${grupo} sale de ${potrero}`,
          href: "/potreros",
        });
      }
    }
  }

  // Navegación de meses
  const [anio, numMes] = mes.split("-").map(Number);
  const mesAnterior = new Date(anio, numMes - 2, 1);
  const mesSiguiente = new Date(anio, numMes, 1);
  const aMes = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const nombreMes = new Date(anio, numMes - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const urlCon = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams();
    if (mes !== hoy.slice(0, 7)) p.set("mes", mes);
    if (capasParam) p.set("capas", capasParam);
    if (dia) p.set("dia", dia);
    for (const [k, v] of Object.entries(cambios)) {
      if (v == null) p.delete(k);
      else p.set(k, v);
    }
    const q = p.toString();
    return `/agenda${q ? `?${q}` : ""}`;
  };

  const urlCapa = (clave: string) => {
    const nuevas = new Set(activas);
    if (nuevas.has(clave)) nuevas.delete(clave);
    else nuevas.add(clave);
    const todas = nuevas.size === CAPAS.length;
    return urlCon({ capas: todas ? null : [...nuevas].join(",") || "ninguna" });
  };

  const delDia = dia
    ? elementos
        .filter((e) => e.fecha === dia)
        .sort((a, b) => a.capa.localeCompare(b.capa))
    : [];

  return (
    <div>
      <PageHeader titulo="Agenda" descripcion="El mes del rancho de un vistazo">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/agenda/tareas" />}>
            <ListTodo className="size-4" /> Tareas
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button>
                  <Plus className="size-4" /> Crear
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href="/agenda/tareas?nueva=1" />}>
                Nueva tarea
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/trabajos/nuevo" />}>
                Capturar trabajo
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/bitacora" />}>
                Nota de bitácora
              </DropdownMenuItem>
              {rol !== "capturista" && (
                <DropdownMenuItem render={<Link href="/lluvias" />}>
                  Registrar lluvia
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            render={<Link href={urlCon({ mes: aMes(mesAnterior), dia: null })} />}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            render={<Link href={urlCon({ mes: aMes(mesSiguiente), dia: null })} />}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="font-heading text-lg font-semibold capitalize">
          {nombreMes}
        </span>
        {mes !== hoy.slice(0, 7) && (
          <Link href={urlCon({ mes: null, dia: null })}>
            <Badge variant="outline">Hoy</Badge>
          </Link>
        )}
        <span className="mx-1 hidden border-l sm:inline" />
        {CAPAS.map((c) => (
          <Link key={c.clave} href={urlCapa(c.clave)}>
            <Badge
              variant={activas.has(c.clave) ? "default" : "outline"}
              className="gap-1.5"
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: c.color }}
              />
              {c.etiqueta}
            </Badge>
          </Link>
        ))}
      </div>

      <CalendarioMes
        mes={mes}
        elementos={elementos}
        capas={CAPAS}
        diaActivo={dia}
        hrefDia={(f) => urlCon({ dia: f })}
      />

      {dia && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base capitalize">
              {formatoFecha(dia)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {delDia.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada capturado este día.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {delDia.map((e, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background:
                          CAPAS.find((c) => c.clave === e.capa)?.color ??
                          "var(--color-muted-foreground)",
                      }}
                    />
                    {e.href ? (
                      <Link href={e.href} className="hover:underline">
                        {e.etiqueta}
                      </Link>
                    ) : (
                      e.etiqueta
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
