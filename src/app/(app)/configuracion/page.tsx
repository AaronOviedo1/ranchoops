import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Aviso } from "@/components/aviso";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { SelectCampo } from "@/components/ui/select-campo";
import {
  actualizarRancho,
  alternarDivision,
  crearDivision,
  invitarMiembro,
} from "./acciones";

export const metadata = { title: "Configuración — RanchOps" };

export default async function ConfiguracionPage({
  searchParams,
}: PageProps<"/configuracion">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: divisiones }, { data: miembros }] = await Promise.all([
    supabase
      .from("divisiones")
      .select("*")
      .eq("rancho_id", rancho.id)
      .order("nombre"),
    supabase
      .from("rancho_usuarios")
      .select("usuario_id, rol, perfiles:usuario_id(nombre)")
      .eq("rancho_id", rancho.id),
  ]);

  const error = typeof sp.error === "string" ? sp.error : null;
  const ok = sp.ok === "1";

  return (
    <div>
      <PageHeader titulo="Configuración" />

      {error && (
        <Aviso tono="peligro" className="mb-4">{error}</Aviso>
      )}
      {ok && (
        <Aviso tono="exito" className="mb-4">Guardado.</Aviso>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rancho</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={actualizarRancho} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre-r">Nombre</Label>
                <Input id="nombre-r" name="nombre" defaultValue={rancho.nombre} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="upp-r">UPP</Label>
                  <Input id="upp-r" name="upp" defaultValue={rancho.upp ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Unidad de lluvia</Label>
                  <SelectCampo
                    name="unidad_lluvia"
                    defaultValue={rancho.unidad_lluvia}
                    opcionVacia={false}
                    opciones={[
                      { valor: "in", etiqueta: "Pulgadas" },
                      { valor: "mm", etiqueta: "Milímetros" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-r">Meta de descanso (días)</Label>
                  <Input
                    id="meta-r"
                    name="meta_dias_descanso"
                    type="number"
                    defaultValue={rancho.meta_dias_descanso}
                  />
                </div>
              </div>
              <Button type="submit">Guardar</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Divisiones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {(divisiones ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className={d.activo ? "font-medium" : "text-muted-foreground line-through"}>
                    {d.nombre}
                  </span>
                  <form action={alternarDivision.bind(null, d.id, !d.activo)}>
                    <Button type="submit" variant="ghost" size="sm">
                      {d.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
            <form action={crearDivision} className="flex gap-2">
              <Input name="nombre" placeholder="Nueva división…" required />
              <Button type="submit" variant="outline">
                Agregar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {(miembros ?? []).map((m) => (
                <div key={m.usuario_id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium">
                    {(m.perfiles as unknown as { nombre: string | null } | null)?.nombre ??
                      "Sin nombre"}
                  </span>
                  <Badge variant={m.rol === "admin" ? "default" : "secondary"}>{m.rol}</Badge>
                </div>
              ))}
            </div>
            <form action={invitarMiembro} className="flex gap-2">
              <Input
                name="correo"
                type="email"
                placeholder="correo@ejemplo.com"
                required
              />
              <Button type="submit" variant="outline">
                Agregar
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              La persona debe crear su cuenta primero en la pantalla de inicio de
              sesión; después agrégala aquí con su correo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
