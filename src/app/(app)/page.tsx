import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { CLASES_ANIMAL, formatoFecha, formatoMoneda, formatoNumero } from "@/lib/catalogos";
import type { PotreroEstado } from "@/lib/tipos";

export const metadata = { title: "Inicio — RanchOps" };

function Tile({
  etiqueta,
  valor,
  detalle,
  href,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:bg-accent/40">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">{etiqueta}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{valor}</p>
          {detalle && <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function InicioPage() {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.toISOString().slice(0, 7);

  const [
    { data: activos },
    { data: potreros },
    { data: gastosMes },
    { data: gastosAnio },
    { data: ventasAnio },
    { data: lluviasAnio },
    { data: lluviasAnioPasado },
    { count: pluviometros },
    { data: eventosAnio },
    { data: bitacora },
  ] = await Promise.all([
    supabase.from("animales").select("clase").eq("rancho_id", rancho.id).eq("status", "activo"),
    supabase.from("v_potrero_estado").select("*").eq("rancho_id", rancho.id),
    supabase
      .from("gastos")
      .select("monto")
      .eq("rancho_id", rancho.id)
      .gte("fecha", `${mes}-01`)
      .lte("fecha", `${mes}-31`),
    supabase
      .from("gastos")
      .select("monto")
      .eq("rancho_id", rancho.id)
      .gte("fecha", `${anio}-01-01`),
    supabase
      .from("venta_renglones")
      .select("total, cabezas, ventas!inner(fecha)")
      .eq("rancho_id", rancho.id)
      .gte("ventas.fecha", `${anio}-01-01`),
    supabase
      .from("lluvias")
      .select("cantidad, pluviometro_id")
      .eq("rancho_id", rancho.id)
      .gte("fecha", `${anio}-01-01`),
    supabase
      .from("lluvias")
      .select("cantidad, pluviometro_id")
      .eq("rancho_id", rancho.id)
      .gte("fecha", `${anio - 1}-01-01`)
      .lte("fecha", `${anio - 1}-12-31`),
    supabase
      .from("pluviometros")
      .select("id", { count: "exact", head: true })
      .eq("rancho_id", rancho.id)
      .eq("activo", true),
    supabase
      .from("eventos")
      .select("tipo")
      .eq("rancho_id", rancho.id)
      .in("tipo", ["parto", "muerte"])
      .gte("fecha", `${anio}-01-01`),
    supabase
      .from("eventos")
      .select("fecha, tipo, obs, resultado")
      .eq("rancho_id", rancho.id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const porClase = new Map<string, number>();
  for (const a of activos ?? []) porClase.set(a.clase, (porClase.get(a.clase) ?? 0) + 1);
  const totalCabezas = (activos ?? []).length;

  const estados = (potreros ?? []) as PotreroEstado[];
  const ocupados = estados.filter((p) => p.grupo_actual_id).length;
  const enDescanso = estados.filter((p) => !p.grupo_actual_id && p.dias_descanso != null);
  const promedioDescanso = enDescanso.length
    ? enDescanso.reduce((s, p) => s + (p.dias_descanso ?? 0), 0) / enDescanso.length
    : null;
  const listos = enDescanso.filter((p) => (p.dias_descanso ?? 0) >= rancho.meta_dias_descanso).length;

  const totalGastosMes = (gastosMes ?? []).reduce((s, g) => s + Number(g.monto), 0);
  const totalGastosAnio = (gastosAnio ?? []).reduce((s, g) => s + Number(g.monto), 0);
  const totalVentas = (ventasAnio ?? []).reduce((s, v) => s + Number(v.total), 0);
  const cabezasVendidas = (ventasAnio ?? []).reduce((s, v) => s + v.cabezas, 0);

  const promedioLluvia = (filas: { cantidad: number; pluviometro_id: string }[] | null) => {
    if (!filas || filas.length === 0) return null;
    const n = pluviometros || new Set(filas.map((f) => f.pluviometro_id)).size || 1;
    return filas.reduce((s, f) => s + Number(f.cantidad), 0) / n;
  };
  const lluviaActual = promedioLluvia(lluviasAnio);
  const lluviaPasada = promedioLluvia(lluviasAnioPasado);
  const unidadLluvia = rancho.unidad_lluvia === "mm" ? "mm" : '"';

  const nacimientos = (eventosAnio ?? []).filter((e) => e.tipo === "parto").length;
  const muertes = (eventosAnio ?? []).filter((e) => e.tipo === "muerte").length;

  return (
    <div>
      <PageHeader
        titulo={rancho.nombre}
        descripcion={hoy.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile
          etiqueta="Inventario total"
          valor={formatoNumero(totalCabezas)}
          detalle="cabezas activas"
          href="/ganado"
        />
        <Tile
          etiqueta={`Nacimientos ${anio}`}
          valor={formatoNumero(nacimientos)}
          detalle={`${muertes} mortalidades`}
          href="/trabajos"
        />
        <Tile
          etiqueta={`Ventas ${anio}`}
          valor={formatoMoneda(totalVentas)}
          detalle={`${cabezasVendidas} cabezas`}
          href="/ventas"
        />
        <Tile
          etiqueta="Costos del mes"
          valor={formatoMoneda(totalGastosMes)}
          detalle={`${formatoMoneda(totalGastosAnio)} acumulado ${anio}`}
          href="/costos"
        />
        <Tile
          etiqueta={`Lluvia ${anio}`}
          valor={lluviaActual != null ? `${formatoNumero(lluviaActual, 1)}${unidadLluvia}` : "—"}
          detalle={
            lluviaPasada != null
              ? `${formatoNumero(lluviaPasada, 1)}${unidadLluvia} en ${anio - 1}`
              : "promedio del rancho"
          }
          href="/lluvias"
        />
        <Tile
          etiqueta="Potreros ocupados"
          valor={`${ocupados}/${estados.length}`}
          detalle={`${listos} listos para usarse`}
          href="/potreros"
        />
        <Tile
          etiqueta="Descanso promedio"
          valor={promedioDescanso != null ? `${formatoNumero(promedioDescanso)} días` : "—"}
          detalle={`meta: ${rancho.meta_dias_descanso} días`}
          href="/potreros"
        />
        <Tile
          etiqueta="Capturar trabajo"
          valor="+"
          detalle="vacunar, palpar, pesar…"
          href="/trabajos/nuevo"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventario por clase</CardTitle>
          </CardHeader>
          <CardContent>
            {totalCabezas === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay animales.{" "}
                <Link href="/ganado/nuevo" className="underline">
                  Registra el primero
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CLASES_ANIMAL.filter((c) => porClase.has(c.valor)).map((c) => (
                  <Link
                    key={c.valor}
                    href={`/ganado?clase=${c.valor}`}
                    className="rounded-md border p-3 text-center hover:bg-accent"
                  >
                    <p className="text-xl font-semibold tabular-nums">
                      {porClase.get(c.valor)}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.plural}</p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(bitacora ?? []).length === 0 ? (
              <p className="text-muted-foreground">
                Sin actividad todavía. Empieza con la{" "}
                <Link href="/bitacora" className="underline">
                  bitácora
                </Link>{" "}
                o un{" "}
                <Link href="/trabajos/nuevo" className="underline">
                  trabajo
                </Link>
                .
              </p>
            ) : (
              bitacora!.map((e, i) => (
                <div key={i} className="flex gap-3 border-b pb-2 last:border-0">
                  <span className="w-20 shrink-0 text-muted-foreground">
                    {formatoFecha(e.fecha)}
                  </span>
                  <span className="min-w-0 truncate">
                    {e.obs ?? e.resultado ?? e.tipo.replaceAll("_", " ")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
