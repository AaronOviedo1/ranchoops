import { PageHeader } from "@/components/page-header";
import { AnimalForm } from "@/components/animal-form";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { crearAnimal } from "../acciones";

export const metadata = { title: "Nuevo animal — RanchOps" };

export default async function NuevoAnimalPage({
  searchParams,
}: PageProps<"/ganado/nuevo">) {
  const params = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: divisiones }, { data: grupos }, { data: madres }] =
    await Promise.all([
      supabase.from("divisiones").select("*").eq("rancho_id", rancho.id).eq("activo", true),
      supabase.from("grupos").select("*").eq("rancho_id", rancho.id).eq("activo", true),
      supabase
        .from("animales")
        .select("id, arete_control, siniga")
        .eq("rancho_id", rancho.id)
        .eq("sexo", "H")
        .eq("status", "activo")
        .order("arete_control"),
    ]);

  return (
    <div>
      <PageHeader titulo="Nuevo animal" />
      <AnimalForm
        action={crearAnimal}
        divisiones={divisiones ?? []}
        grupos={grupos ?? []}
        madres={madres ?? []}
        error={typeof params.error === "string" ? params.error : null}
      />
    </div>
  );
}
