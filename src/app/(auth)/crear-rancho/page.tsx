import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearRancho } from "./actions";
import { Aviso } from "@/components/aviso";
import { Marca } from "@/components/marca";
import { PanelMarca } from "@/components/panel-marca";

export const metadata = { title: "Crear rancho — RanchOps" };

export default async function CrearRanchoPage({
  searchParams,
}: PageProps<"/crear-rancho">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <PanelMarca pie="Todo esto se puede cambiar después, en Configuración." />

      <div className="flex w-full min-w-0 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <Marca tamano="md" className="mb-8 lg:hidden" />

          <div className="mb-6">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Crea tu rancho
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Se crearán las divisiones (Pie de cría, Repasto, Engorda) y el
              catálogo inicial de insumos.
            </p>
          </div>

          {error && (
            <Aviso tono="peligro" className="mb-4">
              {error}
            </Aviso>
          )}

          <form action={crearRancho} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre del rancho</Label>
              <Input
                id="nombre"
                name="nombre"
                placeholder="La Jaimea"
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upp">UPP</Label>
              <Input
                id="upp"
                name="upp"
                placeholder="260291521001"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Es tu Unidad de Producción Pecuaria.
              </p>
            </div>
            <Button type="submit" size="lg" className="w-full">
              Crear rancho
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
