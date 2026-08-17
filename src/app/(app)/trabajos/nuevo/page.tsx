import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { registrarTrabajo } from "../acciones";
import { WizardTrabajo } from "./wizard";

export const metadata = { title: "Trabajar ganado — RanchOps" };

export default async function NuevoTrabajoPage({
  searchParams,
}: PageProps<"/trabajos/nuevo">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: grupos }, { data: animales }, { data: productos }] =
    await Promise.all([
      supabase
        .from("grupos")
        .select("id, nombre")
        .eq("rancho_id", rancho.id)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("animales")
        .select("id, arete_control, clase, grupo_id, status_reproductivo")
        .eq("rancho_id", rancho.id)
        .eq("status", "activo")
        .order("arete_control"),
      supabase
        .from("productos")
        .select("id, nombre, unidad, tipo")
        .eq("rancho_id", rancho.id)
        .eq("activo", true)
        .order("nombre"),
    ]);

  return (
    <div>
      <PageHeader
        titulo="Trabajar ganado"
        descripcion="Elige el trabajo, el grupo y los animales; todo queda en el historial de cada uno."
      />
      <WizardTrabajo
        action={registrarTrabajo}
        grupos={grupos ?? []}
        animales={animales ?? []}
        productos={productos ?? []}
        grupoInicial={typeof sp.grupo === "string" ? sp.grupo : undefined}
        error={typeof sp.error === "string" ? sp.error : null}
      />
    </div>
  );
}
