import { PageHeader } from "@/components/page-header";
import { requireRancho } from "@/lib/auth";
import { ImportadorGanado } from "./importador";

export const metadata = { title: "Importar ganado — RanchOps" };

export default async function ImportarGanadoPage() {
  await requireRancho();

  return (
    <div>
      <PageHeader
        titulo="Importar ganado"
        descripcion="Sube el CSV con tu inventario y revisa cómo va a quedar antes de guardarlo."
      />
      <ImportadorGanado />
    </div>
  );
}
