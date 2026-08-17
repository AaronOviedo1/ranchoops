import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { iniciarSesion, registrarse } from "./actions";
import { Aviso } from "@/components/aviso";
import { Marca } from "@/components/marca";
import { PanelMarca } from "@/components/panel-marca";

export const metadata = { title: "Entrar — RanchOps" };

const campo = "h-10";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const aviso = typeof params.aviso === "string" ? params.aviso : null;
  const modo = params.modo === "registro" ? "registro" : "entrar";

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <PanelMarca />

      <div className="flex w-full min-w-0 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* En el celular no hay panel de marca: el logotipo va aquí */}
          <Marca tamano="md" className="mb-8 lg:hidden" />

          <div className="mb-6">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {modo === "registro" ? "Crea tu cuenta" : "Entra a tu rancho"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Administración del rancho ganadero
            </p>
          </div>

          {error && (
            <Aviso tono="peligro" className="mb-4">
              {error}
            </Aviso>
          )}
          {aviso && (
            <Aviso tono="info" className="mb-4">
              {aviso}
            </Aviso>
          )}

          <Tabs defaultValue={modo}>
            <TabsList className="mb-6 h-9 w-full">
              <TabsTrigger value="entrar" className="flex-1">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="registro" className="flex-1">
                Crear cuenta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form action={iniciarSesion} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    className={campo}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className={campo}
                  />
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="registro">
              <form action={registrarse} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    required
                    autoComplete="name"
                    placeholder="José Carlos"
                    className={campo}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-r">Correo</Label>
                  <Input
                    id="email-r"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    className={campo}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-r">Contraseña</Label>
                  <Input
                    id="password-r"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={campo}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres.
                  </p>
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Crear cuenta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
