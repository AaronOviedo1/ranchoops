import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearRancho } from "./actions";
import { Aviso } from "@/components/aviso";
import { LogoRanchOps } from "@/components/marca";

export const metadata = { title: "Crear rancho — RanchOps" };

export default async function CrearRanchoPage({
  searchParams,
}: PageProps<"/crear-rancho">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Tierra al amanecer: un halo cálido detrás de la tarjeta */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-marca-suave),transparent_60%)]"
      />
      <Card className="relative w-full max-w-sm shadow-lg">
        <CardHeader className="items-center gap-2 text-center">
          <LogoRanchOps variante="duotono" className="size-10 text-primary" />
          <CardTitle className="text-xl">Crea tu rancho</CardTitle>
          <CardDescription>
            Se crearán las divisiones (Pie de cría, Repasto, Engorda) y el
            catálogo inicial de insumos; podrás editarlos después.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Aviso tono="peligro" className="mb-4">{error}</Aviso>
          )}
          <form action={crearRancho} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del rancho</Label>
              <Input id="nombre" name="nombre" placeholder="La Jaimea" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upp">UPP (opcional)</Label>
              <Input id="upp" name="upp" placeholder="260291521001" />
            </div>
            <Button type="submit" className="w-full">
              Crear rancho
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
