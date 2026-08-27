import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { registrarSesion } from "../sesion";
import { WizardTrabajo } from "./wizard";

export const metadata = { title: "Trabajar ganado — RanchOps" };

export default async function NuevoTrabajoPage({
  searchParams,
}: PageProps<"/trabajos/nuevo">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: grupos }, { data: animales }, { data: productos }, { data: plantillas }] =
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
        .select("id, nombre, unidad, tipo, controlado")
        .eq("rancho_id", rancho.id)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("plantillas_trabajo")
        .select("id, nombre, pasos")
        .eq("rancho_id", rancho.id)
        .eq("activo", true)
        .order("nombre"),
    ]);

  return (
    <div>
      <PageHeader
        titulo="Trabajar ganado"
        descripcion="Elige todo lo que se les va a hacer, el grupo y los animales: se captura una vez y queda en el historial de cada uno."
      />
      <WizardTrabajo
        action={registrarSesion}
        grupos={grupos ?? []}
        animales={animales ?? []}
        productos={productos ?? []}
        plantillas={plantillas ?? []}
        grupoInicial={typeof sp.grupo === "string" ? sp.grupo : undefined}
        error={typeof sp.error === "string" ? sp.error : null}
      />
    </div>
  );
}
