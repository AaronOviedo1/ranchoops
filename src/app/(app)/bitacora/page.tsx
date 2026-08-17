import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { formatoFecha } from "@/lib/catalogos";
import { registrarNota } from "../trabajos/acciones";

export const metadata = { title: "Bitácora — RanchOps" };

export default async function BitacoraPage() {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: notas }, { data: grupos }] = await Promise.all([
    supabase
      .from("eventos")
      .select("*, grupos(nombre)")
      .eq("rancho_id", rancho.id)
      .eq("tipo", "nota_bitacora")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("grupos")
      .select("id, nombre")
      .eq("rancho_id", rancho.id)
      .eq("activo", true)
      .order("nombre"),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);

  // Agrupa por mes para lectura tipo "Reporte Mensual"
  const porMes = new Map<string, typeof notas>();
  for (const n of notas ?? []) {
    const mes = n.fecha.slice(0, 7);
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes)!.push(n);
  }

  return (
    <div>
      <PageHeader
        titulo="Bitácora"
        descripcion="El diario del rancho: nacimientos, curaciones, alimento puesto, lo que pasó cada día."
      />

      <Card className="mb-6">
        <CardContent className="pt-4">
          <form action={registrarNota} className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Input name="fecha" type="date" defaultValue={hoy} className="w-40" required />
              <select
                name="grupo_id"
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="">Sin grupo</option>
                {(grupos ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              name="obs"
              placeholder="¿Qué pasó hoy en el rancho? Ej. Parió la vaquilla #9, se pusieron 2 tinas de Protelick…"
              rows={2}
              required
            />
            <Button type="submit">Guardar nota</Button>
          </form>
        </CardContent>
      </Card>

      {(notas ?? []).length === 0 ? (
        <EmptyState emoji="📓" titulo="La bitácora está vacía" />
      ) : (
        <div className="space-y-6">
          {[...porMes.entries()].map(([mes, items]) => (
            <div key={mes}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
                {new Date(mes + "-15").toLocaleDateString("es-MX", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <div className="space-y-2">
                {items!.map((n) => (
                  <div key={n.id} className="flex gap-3 rounded-md border p-3 text-sm">
                    <span className="w-20 shrink-0 whitespace-nowrap text-muted-foreground">
                      {formatoFecha(n.fecha)}
                    </span>
                    <div>
                      <p>{n.obs}</p>
                      {(n.grupos as { nombre: string } | null)?.nombre && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Grupo: {(n.grupos as { nombre: string }).nombre}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
