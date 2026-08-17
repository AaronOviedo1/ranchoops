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

export const metadata = { title: "Crear rancho — RanchOps" };

export default async function CrearRanchoPage({
  searchParams,
}: PageProps<"/crear-rancho">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Crea tu rancho</CardTitle>
          <CardDescription>
            Se crearán las divisiones (Pie de cría, Repasto, Engorda) y el
            catálogo inicial de insumos; podrás editarlos después.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
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
