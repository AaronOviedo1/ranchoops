"use client";

import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TIPOS_TRABAJO } from "@/lib/catalogos";
import { cn } from "@/lib/utils";
import { Aviso } from "@/components/aviso";
import { SelectCampo } from "@/components/ui/select-campo";

type AnimalMini = {
  id: string;
  arete_control: string | null;
  clase: string;
  grupo_id: string | null;
  status_reproductivo: string | null;
};

type GrupoMini = { id: string; nombre: string };
type ProductoMini = { id: string; nombre: string; unidad: string; tipo: string };

type ValoresIndividuales = Record<string, { peso?: number; resultado?: string; obs?: string }>;

export function WizardTrabajo({
  action,
  grupos,
  animales,
  productos,
  grupoInicial,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  grupos: GrupoMini[];
  animales: AnimalMini[];
  productos: ProductoMini[];
  grupoInicial?: string;
  error?: string | null;
}) {
  const [paso, setPaso] = useState(1);
  const [tipo, setTipo] = useState<string | null>(null);
  const [grupoId, setGrupoId] = useState<string | "todos">(grupoInicial ?? "todos");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [valores, setValores] = useState<ValoresIndividuales>({});
  const [filtro, setFiltro] = useState("");

  const trabajo = TIPOS_TRABAJO.find((t) => t.valor === tipo);
  const esPesaje = tipo === "pesaje";
  const esPalpacion = tipo === "palpacion" || tipo === "ultrasonido";

  const delGrupo = useMemo(
    () =>
      animales.filter((a) => (grupoId === "todos" ? true : a.grupo_id === grupoId)),
    [animales, grupoId]
  );
  const visibles = useMemo(
    () =>
      delGrupo.filter(
        (a) => !filtro || a.arete_control?.toLowerCase().includes(filtro.toLowerCase())
      ),
    [delGrupo, filtro]
  );

  const elegirGrupo = (id: string | "todos") => {
    setGrupoId(id);
    const nuevos = animales.filter((a) => (id === "todos" ? true : a.grupo_id === id));
    setSeleccion(new Set(nuevos.map((a) => a.id)));
  };

  const alternar = (id: string) => {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const setValor = (animalId: string, campo: "peso" | "resultado" | "obs", v: string) => {
    setValores((prev) => ({
      ...prev,
      [animalId]: {
        ...prev[animalId],
        [campo]: campo === "peso" ? (v ? Number(v) : undefined) : v || undefined,
      },
    }));
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const seleccionados = delGrupo.filter((a) => seleccion.has(a.id));

  return (
    <div className="mx-auto max-w-2xl">
      {error && (
        <Aviso tono="peligro" className="mb-4">{error}</Aviso>
      )}

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        {paso > 1 && (
          <Button variant="ghost" size="sm" onClick={() => setPaso(paso - 1)}>
            <ChevronLeft className="h-4 w-4" /> Atrás
          </Button>
        )}
        <span>
          Paso {paso} de 3
          {trabajo && ` · ${trabajo.etiqueta}`}
          {paso > 1 && ` · ${seleccion.size} animales`}
        </span>
      </div>

      {paso === 1 && (
        <div>
          <h2 className="mb-3 font-medium">¿Qué trabajo se va a hacer?</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TIPOS_TRABAJO.filter((t) => !["parto", "muerte", "otro"].includes(t.valor)).map(
              (t) => (
                <button
                  key={t.valor}
                  onClick={() => {
                    setTipo(t.valor);
                    if (seleccion.size === 0) elegirGrupo(grupoId);
                    setPaso(2);
                  }}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm font-medium transition-colors hover:bg-accent",
                    tipo === t.valor && "border-primary bg-accent"
                  )}
                >
                  {t.etiqueta}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 font-medium">Grupo</h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => elegirGrupo("todos")}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm",
                  grupoId === "todos" && "border-primary bg-accent font-medium"
                )}
              >
                Todo el ganado
              </button>
              {grupos.map((g) => (
                <button
                  key={g.id}
                  onClick={() => elegirGrupo(g.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    grupoId === g.id && "border-primary bg-accent font-medium"
                  )}
                >
                  {g.nombre}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-medium">
                Animales ({seleccion.size}/{delGrupo.length})
              </h2>
              <button
                type="button"
                className="text-sm underline"
                onClick={() =>
                  setSeleccion(
                    seleccion.size === delGrupo.length
                      ? new Set()
                      : new Set(delGrupo.map((a) => a.id))
                  )
                }
              >
                {seleccion.size === delGrupo.length ? "Quitar todos" : "Todos"}
              </button>
            </div>
            <Input
              placeholder="Filtrar por arete…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-80 divide-y overflow-y-auto rounded-md border">
              {visibles.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={seleccion.has(a.id)}
                    onCheckedChange={() => alternar(a.id)}
                  />
                  <span className="font-medium">#{a.arete_control ?? "s/n"}</span>
                  <span className="capitalize text-muted-foreground">{a.clase}</span>
                  {a.status_reproductivo && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {a.status_reproductivo}
                    </span>
                  )}
                </label>
              ))}
              {visibles.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Sin animales.</p>
              )}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={seleccion.size === 0}
            onClick={() => setPaso(3)}
          >
            Continuar ({seleccion.size} animales)
          </Button>
        </div>
      )}

      {paso === 3 && trabajo && (
        <form action={action} className="space-y-4">
          <input type="hidden" name="tipo" value={trabajo.valor} />
          {grupoId !== "todos" && <input type="hidden" name="grupo_id" value={grupoId} />}
          {[...seleccion].map((id) => (
            <input key={id} type="hidden" name="animal_id" value={id} />
          ))}
          <input type="hidden" name="valores" value={JSON.stringify(valores)} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-t">Fecha</Label>
              <Input id="fecha-t" name="fecha" type="date" defaultValue={hoy} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable</Label>
              <Input id="responsable" name="responsable" placeholder="MVZ, vaquero…" />
            </div>
          </div>

          {trabajo.usaProducto && (
            <div className="grid grid-cols-2 gap-4 rounded-md border p-3">
              <div className="col-span-2 space-y-2">
                <Label>Producto (descuenta inventario)</Label>
                <SelectCampo
                  name="producto_id"
                  opcionVacia="Sin producto"
                  placeholder="Sin producto"
                  opciones={productos.map((p) => ({
                    valor: p.id,
                    etiqueta: `${p.nombre} (${p.unidad})`,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad usada</Label>
                <Input id="cantidad" name="cantidad" type="number" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dosis">Dosis por animal</Label>
                <Input id="dosis" name="dosis" placeholder="5 ml IM" />
              </div>
            </div>
          )}

          {esPalpacion && (
            <div className="space-y-2 rounded-md border p-3">
              <Label>Resultado por animal (actualiza su status reproductivo)</Label>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {seleccionados.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-sm font-medium">
                      #{a.arete_control ?? "s/n"}
                    </span>
                    <Input
                      placeholder="C3, vacía…"
                      value={valores[a.id]?.resultado ?? ""}
                      onChange={(e) => setValor(a.id, "resultado", e.target.value)}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {esPesaje && (
            <div className="space-y-2 rounded-md border p-3">
              <Label>Peso por animal (kg)</Label>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {seleccionados.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-sm font-medium">
                      #{a.arete_control ?? "s/n"}
                    </span>
                    <Input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={valores[a.id]?.peso ?? ""}
                      onChange={(e) => setValor(a.id, "peso", e.target.value)}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!esPalpacion && (
            <div className="space-y-2">
              <Label htmlFor="resultado">Resultado general</Label>
              <Input id="resultado" name="resultado" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costo_total">Costo total (MXN, opcional)</Label>
              <Input
                id="costo_total"
                name="costo_total"
                type="number"
                step="0.01"
                placeholder="Auto si hay producto"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs-t">Observaciones</Label>
            <Textarea id="obs-t" name="obs" rows={3} />
          </div>

          <Button type="submit" className="w-full">
            Guardar trabajo ({seleccion.size} animales)
          </Button>
        </form>
      )}
    </div>
  );
}
