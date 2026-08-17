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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { iniciarSesion, registrarse } from "./actions";

export const metadata = { title: "Entrar — RanchOps" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const aviso = typeof params.aviso === "string" ? params.aviso : null;
  const modo = params.modo === "registro" ? "registro" : "entrar";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🐄 RanchOps</CardTitle>
          <CardDescription>Administración del rancho ganadero</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {aviso && (
            <p className="mb-4 rounded-md bg-primary/10 p-3 text-sm">{aviso}</p>
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
