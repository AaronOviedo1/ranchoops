"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ESTADOS_REPRODUCTIVOS, TIPOS_TRABAJO, trabajo } from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import { Aviso } from "@/components/aviso";
import { SelectCampo } from "@/components/ui/select-campo";
import { CampoFoto } from "@/components/campo-foto";
import type { AccionSesion } from "../sesion";
import { CampoFecha } from "@/components/ui/campo-fecha";

type AnimalMini = {
  id: string;
  arete_control: string | null;
  clase: string;
  grupo_id: string | null;
  status_reproductivo: string | null;
};

type GrupoMini = { id: string; nombre: string };
type ProductoMini = {
  id: string;
  nombre: string;
  unidad: string;
  tipo: string;
  controlado: boolean;
};
type PlantillaMini = {
  id: string;
  nombre: string;
  pasos: { tipo: string; producto_id: string | null; dosis: string | null }[];
};

type ValoresIndividuales = Record<
  string,
  { peso?: number; condicion?: number; resultado?: string; obs?: string }
>;

export function WizardTrabajo({
  action,
  grupos,
  animales,
  productos,
  plantillas,
  grupoInicial,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  grupos: GrupoMini[];
  animales: AnimalMini[];
  productos: ProductoMini[];
  plantillas: PlantillaMini[];
  grupoInicial?: string;
  error?: string | null;
}) {
  const [paso, setPaso] = useState(1);
  // Varias acciones en la misma jornada: vacunar + desparasitar + pesar.
  const [acciones, setAcciones] = useState<AccionSesion[]>([]);
  const [grupoId, setGrupoId] = useState<string | "todos">(grupoInicial ?? "todos");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [valores, setValores] = useState<ValoresIndividuales>({});
  const [filtro, setFiltro] = useState("");
  const [guardarPlantilla, setGuardarPlantilla] = useState(false);

  const delGrupo = useMemo(
    () => animales.filter((a) => (grupoId === "todos" ? true : a.grupo_id === grupoId)),
    [animales, grupoId]
  );
  const visibles = useMemo(
    () =>
      delGrupo.filter(
        (a) => !filtro || a.arete_control?.toLowerCase().includes(filtro.toLowerCase())
      ),
    [delGrupo, filtro]
  );
  const seleccionados = delGrupo.filter((a) => seleccion.has(a.id));

  const elegirGrupo = (id: string | "todos") => {
    setGrupoId(id);
    const nuevos = animales.filter((a) => (id === "todos" ? true : a.grupo_id === id));
    setSeleccion(new Set(nuevos.map((a) => a.id)));
  };

  const alternarAccion = (tipo: string) => {
    setAcciones((prev) =>
      prev.some((a) => a.tipo === tipo)
        ? prev.filter((a) => a.tipo !== tipo)
        : [...prev, { tipo }]
    );
  };

  const editarAccion = (tipo: string, cambios: Partial<AccionSesion>) => {
    setAcciones((prev) => prev.map((a) => (a.tipo === tipo ? { ...a, ...cambios } : a)));
  };

  const aplicarPlantilla = (p: PlantillaMini) => {
    setAcciones(
      p.pasos.map((paso) => ({
        tipo: paso.tipo,
        producto_id: paso.producto_id,
        dosis: paso.dosis,
      }))
    );
    if (seleccion.size === 0) elegirGrupo(grupoId);
    setPaso(2);
  };

  const alternar = (id: string) => {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const setValor = (
    animalId: string,
    campo: "peso" | "condicion" | "resultado" | "obs",
    v: string
  ) => {
    const numerico = campo === "peso" || campo === "condicion";
    setValores((prev) => ({
      ...prev,
      [animalId]: {
        ...prev[animalId],
        [campo]: numerico ? (v ? Number(v) : undefined) : v || undefined,
      },
    }));
  };

  const hoy = fechaHoy();
  const elegidas = acciones
    .map((a) => trabajo(a.tipo))
    .filter((t): t is NonNullable<typeof t> => t != null);
  const pideFoto = elegidas.some((t) => t.requiereFoto);
  const resumen = elegidas.map((t) => t.etiqueta).join(" + ");

  return (
    <div className="mx-auto max-w-2xl">
      {error && (
        <Aviso tono="peligro" className="mb-4">
          {error}
        </Aviso>
      )}

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        {paso > 1 && (
          <Button variant="ghost" size="sm" onClick={() => setPaso(paso - 1)}>
            <ChevronLeft className="h-4 w-4" /> Atrás
          </Button>
        )}
        <span className="truncate">
          Paso {paso} de 3
          {resumen && ` · ${resumen}`}
          {paso > 1 && ` · ${seleccion.size} animales`}
        </span>
      </div>

      {paso === 1 && (
        <div className="space-y-4">
          {plantillas.length > 0 && (
            <div>
              <h2 className="mb-2 font-medium">Repetir una jornada guardada</h2>
              <div className="flex flex-wrap gap-1.5">
                {plantillas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => aplicarPlantilla(p)}
                    className="rounded-full border px-3 py-1 text-sm hover:bg-accent"
                  >
                    {p.nombre}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {p.pasos.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-1 font-medium">¿Qué se le va a hacer al ganado?</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Puedes elegir varios: se hacen en la misma pasada y los animales se
              capturan una sola vez.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TIPOS_TRABAJO.filter(
                (t) => !["parto", "muerte", "otro"].includes(t.valor)
              ).map((t) => {
                const activa = acciones.some((a) => a.tipo === t.valor);
                return (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => alternarAccion(t.valor)}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-colors hover:bg-accent",
                      activa && "border-primary bg-accent"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                        activa && "border-primary bg-primary text-primary-foreground"
                      )}
                    >
                      {activa && <Check className="size-3" />}
                    </span>
                    {t.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={acciones.length === 0}
            onClick={() => {
              if (seleccion.size === 0) elegirGrupo(grupoId);
              setPaso(2);
            }}
          >
            Continuar
            {acciones.length > 0 &&
              ` (${acciones.length} ${acciones.length === 1 ? "trabajo" : "trabajos"})`}
          </Button>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 font-medium">Grupo</h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
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
                  type="button"
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

          <Button className="w-full" disabled={seleccion.size === 0} onClick={() => setPaso(3)}>
            Continuar ({seleccion.size} animales)
          </Button>
        </div>
      )}

      {paso === 3 && (
        <form action={action} className="space-y-4">
          <input type="hidden" name="acciones" value={JSON.stringify(acciones)} />
          {grupoId !== "todos" && <input type="hidden" name="grupo_id" value={grupoId} />}
          {[...seleccion].map((id) => (
            <input key={id} type="hidden" name="animal_id" value={id} />
          ))}
          <input type="hidden" name="valores" value={JSON.stringify(valores)} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-t">Fecha</Label>
              <CampoFecha id="fecha-t" name="fecha" defaultValue={hoy} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable</Label>
              <Input id="responsable" name="responsable" placeholder="MVZ, vaquero…" />
            </div>
          </div>

          {/* Una tarjeta por trabajo: su producto, su dosis, su costo. */}
          {acciones.map((accion) => {
            const t = trabajo(accion.tipo);
            if (!t) return null;
            const producto = productos.find((p) => p.id === accion.producto_id);
            return (
              <fieldset key={accion.tipo} className="space-y-3 rounded-lg border p-3">
                <legend className="flex items-center gap-2 px-1 text-sm font-medium">
                  {t.etiqueta}
                  <button
                    type="button"
                    aria-label={`Quitar ${t.etiqueta}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => alternarAccion(accion.tipo)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </legend>

                {t.usaProducto && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label>Producto (descuenta inventario)</Label>
                      <SelectCampo
                        value={accion.producto_id ?? ""}
                        onValueChange={(v) =>
                          editarAccion(accion.tipo, { producto_id: v || null })
                        }
                        opcionVacia="Sin producto"
                        placeholder="Sin producto"
                        opciones={productos.map((p) => ({
                          valor: p.id,
                          etiqueta: `${p.nombre} (${p.unidad})${
                            p.controlado ? " · controlado" : ""
                          }`,
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cantidad usada</Label>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={accion.cantidad ?? ""}
                        onChange={(e) =>
                          editarAccion(accion.tipo, {
                            cantidad: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dosis por animal</Label>
                      <Input
                        placeholder="5 ml IM"
                        value={accion.dosis ?? ""}
                        onChange={(e) =>
                          editarAccion(accion.tipo, { dosis: e.target.value || null })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Controlados: sin MVZ y folio no se guarda. */}
                {producto?.controlado && (
                  <div className="grid grid-cols-2 gap-3 rounded-md bg-alerta-suave p-2.5">
                    <p className="col-span-2 text-xs text-alerta-fuerte">
                      {producto.nombre} es controlado: el uso tiene que quedar
                      comprobable.
                    </p>
                    <div className="space-y-2">
                      <Label>MVZ responsable</Label>
                      <Input
                        value={accion.mvz ?? ""}
                        onChange={(e) => editarAccion(accion.tipo, { mvz: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Folio de receta</Label>
                      <Input
                        value={accion.receta_folio ?? ""}
                        onChange={(e) =>
                          editarAccion(accion.tipo, { receta_folio: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                )}

                {t.porAnimal === "resultado" && (
                  <div className="space-y-2">
                    <Label>Resultado por animal (actualiza su estado reproductivo)</Label>
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                      {seleccionados.map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <span className="w-16 shrink-0 text-sm font-medium">
                            #{a.arete_control ?? "s/n"}
                          </span>
                          <SelectCampo
                            size="sm"
                            value={valores[a.id]?.resultado ?? ""}
                            onValueChange={(v) => setValor(a.id, "resultado", v)}
                            placeholder="—"
                            opciones={ESTADOS_REPRODUCTIVOS.map((e) => ({
                              valor: e.valor,
                              etiqueta: e.etiqueta,
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {t.porAnimal === "peso" && (
                  <div className="space-y-2">
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

                {t.porAnimal === "condicion" && (
                  <div className="space-y-2">
                    <Label>Condición corporal por animal (1 a 5)</Label>
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                      {seleccionados.map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <span className="w-16 shrink-0 text-sm font-medium">
                            #{a.arete_control ?? "s/n"}
                          </span>
                          <Input
                            type="number"
                            step="0.5"
                            min={1}
                            max={5}
                            inputMode="decimal"
                            value={valores[a.id]?.condicion ?? ""}
                            onChange={(e) => setValor(a.id, "condicion", e.target.value)}
                            className="h-8"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!t.porAnimal && (
                  <div className="space-y-2">
                    <Label>Resultado / nota</Label>
                    <Input
                      value={accion.resultado ?? ""}
                      onChange={(e) =>
                        editarAccion(accion.tipo, { resultado: e.target.value || null })
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Costo total (MXN, opcional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Auto si hay producto"
                    value={accion.costo_total ?? ""}
                    onChange={(e) =>
                      editarAccion(accion.tipo, {
                        costo_total: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </fieldset>
            );
          })}

          {pideFoto && (
            <CampoFoto
              name="foto"
              requerida
              etiqueta="Foto del tratamiento"
              ayuda="Las curaciones y los tratamientos necesitan foto del momento."
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="obs-t">Observaciones</Label>
            <Textarea id="obs-t" name="obs" rows={3} />
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                name="guardar_plantilla"
                checked={guardarPlantilla}
                onCheckedChange={(v) => setGuardarPlantilla(v === true)}
              />
              Guardar esta jornada como plantilla para repetirla
            </label>
            {guardarPlantilla && (
              <Input
                name="nombre_plantilla"
                placeholder="Trabajo de destete, Vacunación de otoño…"
                required
              />
            )}
          </div>

          <Button type="submit" className="w-full">
            Guardar {acciones.length === 1 ? "el trabajo" : `los ${acciones.length} trabajos`}{" "}
            ({seleccion.size} animales)
          </Button>
        </form>
      )}
    </div>
  );
}
