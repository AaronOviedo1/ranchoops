import { AlertTriangle, PackagePlus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { TIPOS_PRODUCTO, formatoFecha, formatoMoneda, formatoNumero } from "@/lib/catalogos";
import type { Existencia } from "@/lib/tipos";
import { crearProducto, registrarEntrada } from "./acciones";

export const metadata = { title: "Inventario — RanchOps" };

export default async function InventarioPage({
  searchParams,
}: PageProps<"/inventario">) {
  const sp = await searchParams;
  const rancho = await requireRancho();
  const supabase = await createClient();

  const [{ data: existencias }, { data: movimientos }] = await Promise.all([
    supabase
      .from("v_existencias")
      .select("*")
      .eq("rancho_id", rancho.id)
      .order("nombre"),
    supabase
      .from("inventario_movimientos")
      .select("*, productos(nombre, unidad)")
      .eq("rancho_id", rancho.id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const lista = (existencias ?? []) as Existencia[];
  const alertas = lista.filter(
    (e) => e.stock_minimo != null && e.existencia < e.stock_minimo
  );
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div>
      <PageHeader
        titulo="Inventario de insumos"
        descripcion="Alimentos, minerales, medicamentos, vacunas y semen"
      >
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline">
                <Plus className="h-4 w-4" /> Producto
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo producto</DialogTitle>
            </DialogHeader>
            <form action={crearProducto} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre-pr">Nombre</Label>
                <Input id="nombre-pr" name="nombre" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select
                    name="tipo"
                    className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  >
                    {TIPOS_PRODUCTO.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidad">Unidad</Label>
                  <Input id="unidad" name="unidad" defaultValue="saco" placeholder="saco, tina, frasco…" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contenido_kg">Kg por unidad</Label>
                  <Input id="contenido_kg" name="contenido_kg" type="number" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costo_unitario-p">Costo por unidad</Label>
                  <Input id="costo_unitario-p" name="costo_unitario" type="number" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock_minimo">Inventario mínimo</Label>
                  <Input id="stock_minimo" name="stock_minimo" type="number" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proveedor-p">Proveedor</Label>
                  <Input id="proveedor-p" name="proveedor" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Crear producto
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger
            render={
              <Button>
                <PackagePlus className="h-4 w-4" /> Entrada
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar entrada (compra)</DialogTitle>
            </DialogHeader>
            <form action={registrarEntrada} className="space-y-4">
              <div className="space-y-2">
                <Label>Producto</Label>
                <select
                  name="producto_id"
                  required
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                >
                  <option value="">Elegir…</option>
                  {lista.map((p) => (
                    <option key={p.producto_id} value={p.producto_id}>
                      {p.nombre} ({p.unidad})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cantidad-e">Cantidad</Label>
                  <Input id="cantidad-e" name="cantidad" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costo_unitario-e">Costo por unidad</Label>
                  <Input id="costo_unitario-e" name="costo_unitario" type="number" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha-e">Fecha</Label>
                  <Input
                    id="fecha-e"
                    name="fecha"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proveedor-e">Proveedor</Label>
                  <Input id="proveedor-e" name="proveedor" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="crear_gasto" defaultChecked />
                Registrar también como gasto en Costos
              </label>
              <Button type="submit" className="w-full">
                Guardar entrada
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      {alertas.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            <span className="font-medium">Inventario bajo:</span>{" "}
            {alertas
              .map((a) => `${a.nombre} (${formatoNumero(a.existencia, 1)} de ${formatoNumero(a.stock_minimo, 1)})`)
              .join(", ")}
          </p>
        </div>
      )}

      {lista.length === 0 ? (
        <EmptyState emoji="📦" titulo="Sin productos" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="overflow-x-auto rounded-lg border lg:col-span-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Existencia</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Costo/u</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => {
                  const bajo = p.stock_minimo != null && p.existencia < p.stock_minimo;
                  return (
                    <TableRow key={p.producto_id}>
                      <TableCell className="font-medium">
                        {p.nombre}
                        {bajo && (
                          <Badge variant="destructive" className="ml-2">
                            bajo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{p.tipo}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatoNumero(p.existencia, 1)} {p.unidad}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatoMoneda(p.costo_unitario)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {p.costo_unitario != null
                          ? formatoMoneda(p.costo_unitario * p.existencia)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimientos recientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(movimientos ?? []).length === 0 ? (
                <p className="text-muted-foreground">Sin movimientos.</p>
              ) : (
                movimientos!.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">
                        {(m.productos as unknown as { nombre: string } | null)?.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatoFecha(m.fecha)}
                        {m.obs ? ` · ${m.obs}` : ""}
                      </p>
                    </div>
                    <span
                      className={
                        m.tipo === "entrada"
                          ? "font-medium text-green-600"
                          : m.tipo === "salida"
                            ? "font-medium text-red-600"
                            : "font-medium"
                      }
                    >
                      {m.tipo === "entrada" ? "+" : m.tipo === "salida" ? "−" : "±"}
                      {formatoNumero(m.cantidad, 1)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
