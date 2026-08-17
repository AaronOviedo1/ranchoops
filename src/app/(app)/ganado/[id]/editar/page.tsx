import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AnimalForm } from "@/components/animal-form";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { actualizarAnimal } from "../../acciones";
import type { Animal } from "@/lib/tipos";

export const metadata = { title: "Editar animal — RanchOps" };

export default async function EditarAnimalPage({
  params,
  searchParams,
}: PageProps<"/ganado/[id]/editar">) {
  const { id } = await params;
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: animal }, { data: divisiones }, { data: grupos }, { data: madres }] =
    await Promise.all([
      supabase.from("animales").select("*").eq("id", id).eq("rancho_id", rancho.id).single(),
      supabase.from("divisiones").select("*").eq("rancho_id", rancho.id).eq("activo", true),
      supabase.from("grupos").select("*").eq("rancho_id", rancho.id).eq("activo", true),
      supabase
        .from("animales")
        .select("id, arete_control, siniga")
        .eq("rancho_id", rancho.id)
        .eq("sexo", "H")
        .neq("id", id)
        .order("arete_control"),
    ]);

  if (!animal) notFound();

  return (
    <div>
      <PageHeader titulo={`Editar #${animal.arete_control ?? "s/n"}`} />
      <AnimalForm
        action={actualizarAnimal.bind(null, id)}
        animal={animal as Animal}
        divisiones={divisiones ?? []}
        grupos={grupos ?? []}
        madres={madres ?? []}
        error={typeof sp.error === "string" ? sp.error : null}
      />
    </div>
  );
}
