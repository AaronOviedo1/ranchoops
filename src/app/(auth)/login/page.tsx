import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { iniciarSesion, registrarse } from "./actions";
import { Aviso } from "@/components/aviso";
import { Marca } from "@/components/marca";

export const metadata = { title: "Entrar — RanchOps" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const aviso = typeof params.aviso === "string" ? params.aviso : null;
  const modo = params.modo === "registro" ? "registro" : "entrar";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Tierra al amanecer: un halo cálido detrás de la tarjeta */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-marca-suave),transparent_60%)]"
      />
      <Card className="relative w-full max-w-sm shadow-lg">
        <CardHeader className="items-center gap-3 text-center">
          <Marca orientacion="apilada" tamano="lg" />
          <CardDescription>Administración del rancho ganadero</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Aviso tono="peligro" className="mb-4">{error}</Aviso>
          )}
          {aviso && (
            <Aviso tono="info" className="mb-4">{aviso}</Aviso>
          )}
          <Tabs defaultValue={modo}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="entrar" className="flex-1">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="registro" className="flex-1">
                Crear cuenta
              </TabsTrigger>
            </TabsList>
            <TabsContent value="entrar">
              <form action={iniciarSesion} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full">
                  Entrar
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="registro">
              <form action={registrarse} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" required autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-r">Correo</Label>
                  <Input id="email-r" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-r">Contraseña (mín. 8 caracteres)</Label>
                  <Input id="password-r" name="password" type="password" required minLength={8} autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full">
                  Crear cuenta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
