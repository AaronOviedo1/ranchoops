"use client";

import { useRef, useState } from "react";
import { Ban, Camera, ChevronDown, HandCoins, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectCampo } from "@/components/ui/select-campo";
import { Aviso } from "@/components/aviso";
import {
  CONDICION_CORPORAL,
  ESTADOS_REPRODUCTIVOS,
  TIPOS_TRABAJO,
  etiquetaClase,
  etiquetaTrabajo,
  formatoNumero,
  trabajo,
} from "@/lib/catalogos";
import { edadTexto } from "@/lib/ciclo-vida";
import { formatoGdp, gananciaDiaria, gananciaDesdeNacimiento } from "@/lib/pesos";
import { cn } from "@/lib/utils";
import { SelectorProducto, type ProductoTrabajo } from "../componentes-trabajo";
import {
  camposPorAnimal,
  trabajosDeBase,
  type Capturado,
  type Destino,
  type TrabajoAnimal,
  type TrabajoBase,
} from "./estado";
import { subirFotoTrabajo } from "./foto-directa";

export type AnimalManga = {
  id: string;
  arete_control: string | null;
  siniga: string | null;
  clase: string;
  sexo: "H" | "M" | null;
  fecha_nacimiento: string | null;
  peso_nacimiento: number | null;
  grupo_id: string | null;
  status_reproductivo: string | null;
  ultimo: { fecha: string; peso: number } | null;
};

// Parto y muerte cambian la ficha del animal y tienen su propio flujo.
const TIPOS_EXTRA = TIPOS_TRABAJO.filter((t) => !["parto", "muerte"].includes(t.valor));

/** Lo que se le puso, en corto: "Ivermectina · 5 ml". */
function resumenTrabajo(t: TrabajoAnimal, productos: ProductoTrabajo[]): string {
  const producto = productos.find((p) => p.id === t.producto_id);
  return [producto?.nombre, t.dosis, t.nota].filter(Boolean).join(" · ");
}

/**
 * El animal que está en la trampa. Arranca con los trabajos del día ya
 * marcados; aquí se le quita lo que no le tocó, se le cambia el producto o la
 * dosis, y se le agrega lo que solo él necesita.
 *
 * Si la jornada es solo pesar, no estorba: peso → Enter → siguiente.
 */
export function TarjetaAnimal({
  animal,
  previo,
  base,
  fecha,
  ranchoId,
  productos,
  grupos,
  onGuardar,
  onCancelar,
}: {
  animal: AnimalManga;
  /** Lo que ya se le había capturado, si se está corrigiendo. */
  previo: Capturado | undefined;
  base: TrabajoBase[];
  fecha: string;
  ranchoId: string;
  productos: ProductoTrabajo[];
  grupos: { id: string; nombre: string }[];
  onGuardar: (capturado: Capturado) => void;
  onCancelar: () => void;
}) {
  const [trabajos, setTrabajos] = useState<TrabajoAnimal[]>(
    previo?.trabajos ?? trabajosDeBase(base)
  );
  const [peso, setPeso] = useState(previo?.peso?.toString() ?? "");
  const [condicion, setCondicion] = useState(previo?.condicion?.toString() ?? "");
  const [resultado, setResultado] = useState(previo?.resultado ?? "");
  const [obs, setObs] = useState(previo?.obs ?? "");
  const [destino, setDestino] = useState<Destino>(previo?.destino ?? null);
  const [separarA, setSepararA] = useState(previo?.separarA ?? "");
  const [editando, setEditando] = useState<string | null>(null);
  const [extra, setExtra] = useState<TrabajoAnimal | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Con solo pesar (o nada que ajustar) el detalle va cerrado, como siempre.
  const hayQueAjustar = base.some((b) => trabajo(b.tipo)?.usaProducto) || base.length === 0;
  const [detalle, setDetalle] = useState(hayQueAjustar || !!previo);

  const campoCondicion = useRef<HTMLInputElement>(null);
  const campoFoto = useRef<HTMLInputElement>(null);

  const pide = camposPorAnimal(trabajos);
  const otrosGrupos = grupos.filter((g) => g.id !== animal.grupo_id);

  // Los trabajos del día que a este animal se le quitaron: se pueden regresar.
  const quitados = trabajosDeBase(base).filter((b) => !trabajos.some((t) => t.id === b.id));

  const gdp = (() => {
    if (!pide.peso || !peso.trim()) return null;
    const hoy = { fecha, peso: Number(peso) };
    return gananciaDiaria(animal.ultimo, hoy) ?? gananciaDesdeNacimiento(animal, hoy);
  })();

  const editar = (id: string, cambios: Partial<TrabajoAnimal>) =>
    setTrabajos((prev) => prev.map((t) => (t.id === id ? { ...t, ...cambios } : t)));

  const guardar = (conDestino?: Destino) => {
    const d = conDestino !== undefined ? conDestino : destino;
    if (trabajos.length === 0 && !d && !separarA && !obs.trim()) {
      setAviso("A este animal no se le marcó nada. Márcale un trabajo, una nota o a dónde va.");
      return;
    }
    onGuardar({
      animalId: animal.id,
      trabajos,
      peso: pide.peso && peso.trim() ? Number(peso) : null,
      condicion: pide.condicion && condicion.trim() ? Number(condicion) : null,
      resultado: pide.resultado && resultado ? resultado : null,
      obs: obs.trim() || null,
      destino: d,
      separarA: separarA || null,
    });
  };

  const abrirExtra = () =>
    setExtra({
      id: `extra:${crypto.randomUUID()}`,
      tipo: "tratamiento",
      producto_id: null,
      cantidad: null,
      dosis: null,
      nota: null,
      foto_ruta: null,
      extra: true,
    });

  const alElegirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo || !extra) return;
    setSubiendo(true);
    setAviso(null);
    try {
      const ruta = await subirFotoTrabajo(ranchoId, archivo);
      setExtra((prev) => (prev ? { ...prev, foto_ruta: ruta } : prev));
    } catch {
      setAviso("No se pudo subir la foto. Revisa la señal y vuelve a tomarla.");
    } finally {
      setSubiendo(false);
    }
  };

  const extraPideFoto = !!extra && !!trabajo(extra.tipo)?.requiereFoto;
  const extraListo = !!extra && (!extraPideFoto || !!extra.foto_ruta);

  const agregarExtra = () => {
    if (!extra || !extraListo) return;
    setTrabajos((prev) => [...prev, extra]);
    setExtra(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-2xl font-semibold">
            #{animal.arete_control ?? "s/n"}
          </p>
          <p className="text-sm text-muted-foreground">
            {etiquetaClase(animal.clase)} · {edadTexto(animal.fecha_nacimiento)}
            {animal.siniga && ` · ${animal.siniga}`}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Cancelar" onClick={onCancelar}>
          <X />
        </Button>
      </div>

      {pide.peso && (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-muted-foreground">
              Último peso:{" "}
              <span className="font-medium text-foreground">
                {animal.ultimo ? `${formatoNumero(animal.ultimo.peso, 1)} kg` : "—"}
              </span>
            </span>
            {gdp != null && (
              <span
                className={cn(
                  "font-medium",
                  gdp >= 0 ? "text-exito-fuerte" : "text-peligro-fuerte"
                )}
              >
                {formatoGdp(gdp)}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="peso-manga" className="text-base">
              Peso (kg)
            </Label>
            <Input
              id="peso-manga"
              autoFocus
              type="number"
              step="0.1"
              inputMode="decimal"
              value={peso}
              placeholder="0.0"
              className="h-14 text-2xl"
              onChange={(e) => setPeso(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                // Enter pasa al siguiente dato y guarda en el último.
                if (pide.condicion) campoCondicion.current?.focus();
                else guardar();
              }}
            />
          </div>
        </>
      )}

      {(pide.condicion || pide.resultado) && (
        <div className="grid grid-cols-2 gap-3">
          {pide.condicion && (
            <div className="space-y-2">
              <Label htmlFor="condicion-manga">Condición (1 a 5)</Label>
              <Input
                id="condicion-manga"
                ref={campoCondicion}
                autoFocus={!pide.peso}
                type="number"
                step={CONDICION_CORPORAL.paso}
                min={CONDICION_CORPORAL.min}
                max={CONDICION_CORPORAL.max}
                inputMode="decimal"
                value={condicion}
                className="h-11 text-lg"
                onChange={(e) => setCondicion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    guardar();
                  }
                }}
              />
            </div>
          )}
          {pide.resultado && (
            <div className="space-y-2">
              <Label>Resultado de la palpación</Label>
              <SelectCampo
                value={resultado}
                onValueChange={setResultado}
                placeholder="—"
                opciones={ESTADOS_REPRODUCTIVOS.map((e) => ({
                  valor: e.valor,
                  etiqueta: e.etiqueta,
                }))}
              />
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setDetalle((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
        aria-expanded={detalle}
      >
        <span className="truncate">
          <span className="font-medium">Lo que se le hace:</span>{" "}
          <span className="text-muted-foreground">
            {trabajos.length > 0
              ? trabajos.map((t) => etiquetaTrabajo(t.tipo)).join(" + ")
              : "nada todavía"}
            {separarA && " · se separa"}
          </span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", detalle && "rotate-180")} />
      </button>

      {detalle && (
        <div className="space-y-3 rounded-md border p-3">
          {trabajos.length > 0 && (
            <ul className="space-y-2">
              {trabajos.map((t) => {
                const definicion = trabajo(t.tipo);
                const abierto = editando === t.id;
                const producto = productos.find((p) => p.id === t.producto_id);
                return (
                  <li key={t.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      {t.extra ? (
                        <button
                          type="button"
                          aria-label={`Quitar ${etiquetaTrabajo(t.tipo)}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setTrabajos((prev) => prev.filter((x) => x.id !== t.id))}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : (
                        <Checkbox
                          checked
                          aria-label={`A este no: ${etiquetaTrabajo(t.tipo)}`}
                          onCheckedChange={() =>
                            setTrabajos((prev) => prev.filter((x) => x.id !== t.id))
                          }
                        />
                      )}
                      <span className="shrink-0 font-medium">{etiquetaTrabajo(t.tipo)}</span>
                      <span className="min-w-0 truncate text-muted-foreground">
                        {resumenTrabajo(t, productos)}
                      </span>
                      {t.extra && (
                        <span className="shrink-0 rounded-full border px-1.5 text-[11px] whitespace-nowrap text-muted-foreground">
                          solo a este
                        </span>
                      )}
                      {definicion?.usaProducto && (
                        <button
                          type="button"
                          className="ml-auto shrink-0 text-xs text-primary hover:underline"
                          onClick={() => setEditando(abierto ? null : t.id)}
                        >
                          {abierto ? "listo" : "cambiar"}
                        </button>
                      )}
                    </div>
                    {abierto && (
                      <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                        <div className="col-span-2">
                          <SelectorProducto
                            size="sm"
                            tipoTrabajo={t.tipo}
                            productos={productos}
                            value={t.producto_id}
                            onValueChange={(producto_id) => editar(t.id, { producto_id })}
                          />
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          aria-label="Cantidad"
                          placeholder={`Cantidad${producto ? ` (${producto.unidad})` : ""}`}
                          value={t.cantidad ?? ""}
                          className="h-8"
                          onChange={(e) =>
                            editar(t.id, {
                              cantidad: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                        />
                        <Input
                          aria-label="Dosis"
                          placeholder="Dosis (5 ml IM)"
                          value={t.dosis ?? ""}
                          className="h-8"
                          onChange={(e) => editar(t.id, { dosis: e.target.value || null })}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {quitados.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={false}
                onCheckedChange={() => setTrabajos((prev) => [...prev, t])}
              />
              <span className="line-through">{etiquetaTrabajo(t.tipo)}</span>
              <span className="text-xs">a este no</span>
            </label>
          ))}

          {!extra ? (
            <Button variant="outline" size="sm" onClick={abrirExtra}>
              <Plus /> Algo solo a este animal
            </Button>
          ) : (
            <div className="space-y-2 rounded-md bg-muted/50 p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <SelectCampo
                    size="sm"
                    opcionVacia={false}
                    value={extra.tipo}
                    onValueChange={(tipo) =>
                      tipo && setExtra({ ...extra, tipo, producto_id: null })
                    }
                    opciones={TIPOS_EXTRA.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
                  />
                </div>
                {trabajo(extra.tipo)?.usaProducto && (
                  <>
                    <div className="col-span-2">
                      <SelectorProducto
                        size="sm"
                        tipoTrabajo={extra.tipo}
                        productos={productos}
                        value={extra.producto_id}
                        onValueChange={(producto_id) => setExtra({ ...extra, producto_id })}
                      />
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      aria-label="Cantidad"
                      placeholder="Cantidad"
                      value={extra.cantidad ?? ""}
                      className="h-8"
                      onChange={(e) =>
                        setExtra({
                          ...extra,
                          cantidad: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                    <Input
                      aria-label="Dosis"
                      placeholder="Dosis (5 ml IM)"
                      value={extra.dosis ?? ""}
                      className="h-8"
                      onChange={(e) => setExtra({ ...extra, dosis: e.target.value || null })}
                    />
                  </>
                )}
                <Input
                  aria-label="Nota"
                  placeholder="Qué tenía o qué se le hizo"
                  value={extra.nota ?? ""}
                  className="col-span-2 h-8"
                  onChange={(e) => setExtra({ ...extra, nota: e.target.value || null })}
                />
              </div>

              {extraPideFoto && (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    ref={campoFoto}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={alElegirFoto}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={subiendo}
                    onClick={() => campoFoto.current?.click()}
                  >
                    {subiendo ? <Loader2 className="animate-spin" /> : <Camera />}
                    {extra.foto_ruta ? "Tomar otra" : "Tomar foto"}
                  </Button>
                  <span className={extra.foto_ruta ? "text-exito-fuerte" : "text-muted-foreground"}>
                    {subiendo
                      ? "Subiendo…"
                      : extra.foto_ruta
                        ? "Foto lista"
                        : `${etiquetaTrabajo(extra.tipo)} necesita foto`}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" disabled={!extraListo || subiendo} onClick={agregarExtra}>
                  Agregar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setExtra(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="obs-manga">Nota del animal</Label>
            <Input
              id="obs-manga"
              value={obs}
              placeholder="Lo que haya que acordarse de este"
              onChange={(e) => setObs(e.target.value)}
            />
          </div>

          {otrosGrupos.length > 0 && (
            <div className="space-y-2">
              <Label>Separarlo a otro grupo</Label>
              <SelectCampo
                value={separarA}
                onValueChange={setSepararA}
                opcionVacia="Se queda donde está"
                placeholder="Se queda donde está"
                opciones={otrosGrupos.map((g) => ({ valor: g.id, etiqueta: g.nombre }))}
              />
            </div>
          )}
        </div>
      )}

      {aviso && <Aviso tono="alerta">{aviso}</Aviso>}

      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1"
          // Sin nada que teclear, Enter guarda y pasa al siguiente.
          autoFocus={!pide.peso && !pide.condicion}
          disabled={subiendo}
          onClick={() => guardar()}
        >
          Guardar y seguir
        </Button>
        <Button
          variant={destino === "venta" ? "secondary" : "outline"}
          disabled={subiendo}
          onClick={() => {
            setDestino("venta");
            guardar("venta");
          }}
        >
          <HandCoins /> A venta
        </Button>
        <Button
          variant={destino === "desecho" ? "secondary" : "outline"}
          disabled={subiendo}
          onClick={() => {
            setDestino("desecho");
            guardar("desecho");
          }}
        >
          <Ban /> A desecho
        </Button>
      </div>
    </div>
  );
}
