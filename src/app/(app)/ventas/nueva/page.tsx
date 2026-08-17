import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { crearVenta } from "../acciones";
import { FormularioVenta } from "./formulario";

export const metadata = { title: "Nueva venta — RanchOps" };

export default async function NuevaVentaPage({
  searchParams,
}: PageProps<"/ventas/nueva">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: divisiones }, { data: animales }] = await Promise.all([
    supabase
      .from("divisiones")
      .select("id, nombre")
      .eq("rancho_id", rancho.id)
      .eq("activo", true),
    supabase
      .from("animales")
      .select("id, arete_control, clase")
      .eq("rancho_id", rancho.id)
      .eq("status", "activo")
      .order("arete_control"),
  ]);

  return (
    <div>
      <PageHeader titulo="Nueva venta" />
      <FormularioVenta
        action={crearVenta}
        divisiones={divisiones ?? []}
        animales={animales ?? []}
        error={typeof sp.error === "string" ? sp.error : null}
      />
    </div>
  );
}
