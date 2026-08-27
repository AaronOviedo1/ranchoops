import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AnimalForm } from "@/components/animal-form";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { urlFirmada } from "@/lib/archivos";
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

  const [
    { data: animal },
    { data: divisiones },
    { data: grupos },
    { data: madres },
    { data: padres },
  ] = await Promise.all([
    supabase.from("animales").select("*").eq("id", id).eq("rancho_id", rancho.id).single(),
    supabase.from("divisiones").select("*").eq("rancho_id", rancho.id).eq("activo", true),
    supabase.from("grupos").select("*").eq("rancho_id", rancho.id).eq("activo", true),
    supabase
      .from("animales")
      .select("id, arete_control, siniga, nombre, clase")
      .eq("rancho_id", rancho.id)
      .eq("sexo", "H")
      .neq("id", id)
      .order("arete_control"),
    supabase
      .from("animales")
      .select("id, arete_control, siniga, nombre, clase")
      .eq("rancho_id", rancho.id)
      .eq("sexo", "M")
      .neq("id", id)
      .order("arete_control"),
  ]);

  if (!animal) notFound();

  const foto = await urlFirmada(supabase, (animal as Animal).foto_url);

  return (
    <div>
      <PageHeader titulo={`Editar #${animal.arete_control ?? "s/n"}`} />
      <AnimalForm
        action={actualizarAnimal.bind(null, id)}
        animal={animal as Animal}
        divisiones={divisiones ?? []}
        grupos={grupos ?? []}
        madres={madres ?? []}
        padres={padres ?? []}
        fotoUrl={foto}
        error={typeof sp.error === "string" ? sp.error : null}
      />
    </div>
  );
}
