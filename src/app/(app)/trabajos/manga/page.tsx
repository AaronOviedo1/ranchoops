import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Aviso } from "@/components/aviso";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { registrarSesion } from "../sesion";
import { Manga, type AnimalManga } from "./manga";

export const metadata = { title: "Manga — RanchOps" };

export default async function MangaPage({ searchParams }: PageProps<"/trabajos/manga">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: animales }, { data: grupos }, { data: pesajes }] = await Promise.all([
    supabase
      .from("animales")
      .select(
        "id, arete_control, siniga, clase, sexo, fecha_nacimiento, peso_nacimiento, grupo_id"
      )
      .eq("rancho_id", rancho.id)
      .eq("status", "activo")
      .order("arete_control"),
    supabase
      .from("grupos")
      .select("id, nombre")
      .eq("rancho_id", rancho.id)
      .eq("activo", true)
      .order("nombre"),
    // Todo el historial de pesos: en la manga hay que ver la ganancia diaria
    // en el momento, no después.
    supabase
      .from("evento_animales")
      .select("animal_id, valores, eventos!inner(fecha, tipo)")
      .eq("rancho_id", rancho.id)
      .in("eventos.tipo", ["pesaje", "destete"]),
  ]);

  const ultimos = new Map<string, { fecha: string; peso: number }>();
  for (const fila of (pesajes ?? []) as unknown as {
    animal_id: string;
    valores: { peso?: number } | null;
    eventos: { fecha: string };
  }[]) {
    const peso = fila.valores?.peso;
    if (peso == null) continue;
    const previo = ultimos.get(fila.animal_id);
    if (!previo || fila.eventos.fecha > previo.fecha) {
      ultimos.set(fila.animal_id, { fecha: fila.eventos.fecha, peso });
    }
  }

  const lista: AnimalManga[] = (animales ?? []).map((a) => ({
    ...a,
    ultimo: ultimos.get(a.id) ?? null,
  }));

  return (
    <div>
      <PageHeader
        titulo="Manga"
        descripcion="Teclea o escanea el arete, captura el peso y pasa al siguiente. Sin ratón."
      >
        <Button variant="outline" size="sm" render={<Link href="/trabajos" />}>
          <ArrowLeft className="h-4 w-4" /> Trabajos
        </Button>
      </PageHeader>

      {typeof sp.error === "string" && (
        <Aviso tono="peligro" className="mb-4">
          {sp.error}
        </Aviso>
      )}

      <Manga action={registrarSesion} animales={lista} grupos={grupos ?? []} />
    </div>
  );
}
