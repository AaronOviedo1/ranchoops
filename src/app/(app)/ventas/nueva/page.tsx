import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { crearVenta } from "../acciones";
import { FormularioVenta } from "./formulario";

export const metadata = { title: "Nueva venta — RanchOps" };

export default async function NuevaVentaPage({
  searchParams,
}: PageProps<"/ventas/nueva">) {
  const sp = await searchParams;
  const { rancho } = await requireAdmin();
  const supabase = await createClient();

  const [{ data: divisiones }, { data: animales }, { data: retiros }] =
    await Promise.all([
      supabase
        .from("divisiones")
        .select("id, nombre")
        .eq("rancho_id", rancho.id)
        .eq("activo", true),
      supabase
        .from("animales")
        .select("id, arete_control, siniga, clase")
        .eq("rancho_id", rancho.id)
        .eq("status", "activo")
        .order("arete_control"),
      supabase
        .from("v_animales_en_retiro")
        .select("animal_id, producto, retiro_hasta")
        .eq("rancho_id", rancho.id),
    ]);

  // La venta puede llegar precargada de dos lados: de la manga (lo que se
  // acaba de marcar "a venta") o de un grupo entero (el grupo de venta).
  const sesion = typeof sp.sesion === "string" ? sp.sesion : null;
  const grupo = typeof sp.grupo === "string" ? sp.grupo : null;
  let preseleccion: { animal_id: string; peso: number | null }[] = [];
  let origen: string | undefined;

  if (sesion) {
    const { data } = await supabase
      .from("evento_animales")
      .select("animal_id, valores, eventos!inner(sesion_id, tipo)")
      .eq("rancho_id", rancho.id)
      .eq("eventos.sesion_id", sesion)
      .eq("eventos.tipo", "pesaje");

    preseleccion = ((data ?? []) as unknown as {
      animal_id: string;
      valores: { peso?: number; destino?: string } | null;
    }[])
      .filter((f) => f.valores?.destino === "venta")
      .map((f) => ({ animal_id: f.animal_id, peso: f.valores?.peso ?? null }));
    origen = `${preseleccion.length} ${preseleccion.length === 1 ? "animal marcado" : "animales marcados"} en la manga, con su peso.`;
  } else if (grupo) {
    const [{ data: delGrupo }, { data: pesajes }] = await Promise.all([
      supabase
        .from("animales")
        .select("id")
        .eq("rancho_id", rancho.id)
        .eq("status", "activo")
        .eq("grupo_id", grupo),
      supabase
        .from("evento_animales")
        .select("animal_id, valores, eventos!inner(fecha, tipo)")
        .eq("rancho_id", rancho.id)
        .in("eventos.tipo", ["pesaje", "destete"]),
    ]);

    // El último peso conocido de cada uno, para no tener que volver a pesarlos.
    const ultimos = new Map<string, { fecha: string; peso: number }>();
    for (const f of (pesajes ?? []) as unknown as {
      animal_id: string;
      valores: { peso?: number } | null;
      eventos: { fecha: string };
    }[]) {
      const peso = f.valores?.peso;
      if (peso == null) continue;
      const previo = ultimos.get(f.animal_id);
      if (!previo || f.eventos.fecha > previo.fecha) {
        ultimos.set(f.animal_id, { fecha: f.eventos.fecha, peso });
      }
    }

    preseleccion = (delGrupo ?? []).map((a) => ({
      animal_id: a.id,
      peso: ultimos.get(a.id)?.peso ?? null,
    }));
    const { data: g } = await supabase
      .from("grupos")
      .select("nombre")
      .eq("id", grupo)
      .eq("rancho_id", rancho.id)
      .single();
    origen = `${preseleccion.length} ${preseleccion.length === 1 ? "animal" : "animales"} del grupo ${g?.nombre ?? ""}, con su último peso.`;
  }

  return (
    <div>
      <PageHeader
        titulo="Nueva venta"
        descripcion={preseleccion.length > 0 ? origen : undefined}
      />
      <FormularioVenta
        action={crearVenta}
        divisiones={divisiones ?? []}
        animales={animales ?? []}
        preseleccion={preseleccion}
        enRetiro={retiros ?? []}
        error={typeof sp.error === "string" ? sp.error : null}
      />
    </div>
  );
}
