import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import type { PotreroEstado } from "@/lib/tipos";
import { MapaRancho, type PotreroMapa, type PuntoMapa } from "./mapa-rancho";

export const metadata = { title: "Mapa — RanchOps" };

export default async function MapaPage() {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return (
      <div>
        <PageHeader titulo="Mapa del rancho" />
        <Card>
          <CardContent className="pt-6 text-sm">
            <p className="font-medium">Falta configurar Mapbox.</p>
            <p className="mt-2 text-muted-foreground">
              Crea un token gratuito en{" "}
              <a href="https://account.mapbox.com" className="underline">
                account.mapbox.com
              </a>{" "}
              y agrégalo como <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> en{" "}
              <code>.env.local</code> (y en Vercel → Environment Variables).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ data: potreros }, { data: estados }, { data: grupos }, { data: pluviometros }, { data: infra }] =
    await Promise.all([
      supabase
        .from("potreros")
        .select("id, nombre, superficie_has, geom")
        .eq("rancho_id", rancho.id)
        .eq("activo", true),
      supabase.from("v_potrero_estado").select("*").eq("rancho_id", rancho.id),
      supabase.from("grupos").select("id, nombre").eq("rancho_id", rancho.id),
      supabase
        .from("pluviometros")
        .select("id, nombre, geom")
        .eq("rancho_id", rancho.id)
        .eq("activo", true),
      supabase
        .from("infraestructura")
        .select("id, nombre, tipo, geom")
        .eq("rancho_id", rancho.id),
    ]);

  const estadoPor = new Map(
    ((estados ?? []) as PotreroEstado[]).map((e) => [e.potrero_id, e])
  );
  const grupoPor = new Map((grupos ?? []).map((g) => [g.id, g.nombre]));

  const potrerosMapa: PotreroMapa[] = (potreros ?? []).map((p) => {
    const e = estadoPor.get(p.id);
    return {
      id: p.id,
      nombre: p.nombre,
      superficie_has: p.superficie_has,
      geom: p.geom,
      ocupado: !!e?.grupo_actual_id,
      dias_descanso: e?.dias_descanso ?? null,
      grupo: e?.grupo_actual_id ? grupoPor.get(e.grupo_actual_id) ?? null : null,
    };
  });

  const puntos: PuntoMapa[] = [
    ...(pluviometros ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      tipo: "pluviometro",
      geom: p.geom,
    })),
    ...(infra ?? []).map((i) => ({
      id: i.id,
      nombre: i.nombre,
      tipo: i.tipo,
      geom: i.geom,
    })),
  ];

  return (
    <div>
      <PageHeader
        titulo="Mapa del rancho"
        descripcion="Dibuja potreros, marca pluviómetros e infraestructura, y ve el estado del pastoreo."
        className="mb-3"
      />
      <MapaRancho
        token={token}
        potreros={potrerosMapa}
        puntos={puntos}
        meta={rancho.meta_dias_descanso}
      />
    </div>
  );
}
