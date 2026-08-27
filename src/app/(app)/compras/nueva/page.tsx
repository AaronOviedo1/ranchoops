import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { crearCompra } from "../acciones";
import { FormularioCompra } from "./formulario";

export const metadata = { title: "Nueva compra — RanchOps" };

export default async function NuevaCompraPage({
  searchParams,
}: PageProps<"/compras/nueva">) {
  const sp = await searchParams;
  const { rancho } = await requireAdmin();
  const supabase = await createClient();

  const { data: divisiones } = await supabase
    .from("divisiones")
    .select("id, nombre")
    .eq("rancho_id", rancho.id)
    .eq("activo", true)
    .order("nombre");

  return (
    <div>
      <PageHeader
        titulo="Nueva compra"
        descripcion="El ganado que entra comprado; después se da de alta animal por animal."
      />
      <FormularioCompra
        action={crearCompra}
        divisiones={divisiones ?? []}
        error={typeof sp.error === "string" ? sp.error : null}
      />
    </div>
  );
}
