"use client";

import { useMemo, useRef, useState } from "react";
import { Ban, HandCoins, ScanLine, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aviso } from "@/components/aviso";
import { SelectCampo } from "@/components/ui/select-campo";
import { etiquetaClase, formatoNumero } from "@/lib/catalogos";
import { edadTexto } from "@/lib/ciclo-vida";
import { fechaHoy } from "@/lib/fechas";
import { formatoGdp, gananciaDiaria, gananciaDesdeNacimiento } from "@/lib/pesos";
import { cn } from "@/lib/utils";
import { CampoFecha } from "@/components/ui/campo-fecha";

export type AnimalManga = {
  id: string;
  arete_control: string | null;
  siniga: string | null;
  clase: string;
  sexo: "H" | "M" | null;
  fecha_nacimiento: string | null;
  peso_nacimiento: number | null;
  grupo_id: string | null;
  ultimo: { fecha: string; peso: number } | null;
};

type Destino = "venta" | "desecho" | null;
type Capturado = { animal: AnimalManga; peso: number | null; destino: Destino };

/**
 * Captura de corrido en la manga.
 *
 * "Un solo input de texto y tú le vas poniendo nomás el peso y ya te pone el
 * siguiente": arete → Enter → peso → Enter → siguiente animal. El teclado
 * nunca se suelta y la ganancia diaria se ve en el momento.
 */
export function Manga({
  action,
  animales,
  grupos,
}: {
  action: (formData: FormData) => Promise<void>;
  animales: AnimalManga[];
  grupos: { id: string; nombre: string }[];
}) {
  const [fecha, setFecha] = useState(fechaHoy());
  const [busqueda, setBusqueda] = useState("");
  const [actual, setActual] = useState<AnimalManga | null>(null);
  const [peso, setPeso] = useState("");
  const [capturados, setCapturados] = useState<Capturado[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [tambienDestete, setTambienDestete] = useState(false);

  const campoArete = useRef<HTMLInputElement>(null);
  const campoPeso = useRef<HTMLInputElement>(null);

  const yaCapturado = useMemo(
    () => new Set(capturados.map((c) => c.animal.id)),
    [capturados]
  );

  /** Busca por arete o SINIIGA, con o sin espacios. */
  const coincidencias = (texto: string) => {
    const t = texto.replace(/\s/g, "").toLowerCase();
    if (!t) return [];
    const exactos = animales.filter(
      (a) => a.arete_control?.toLowerCase() === t || a.siniga?.toLowerCase() === t
    );
    if (exactos.length > 0) return exactos;
    return animales.filter(
      (a) =>
        a.arete_control?.toLowerCase().includes(t) || a.siniga?.toLowerCase().includes(t)
    );
  };

  const encontrados = busqueda ? coincidencias(busqueda) : [];

  const elegir = (a: AnimalManga) => {
    setActual(a);
    setBusqueda("");
    setAviso(yaCapturado.has(a.id) ? `#${a.arete_control ?? "s/n"} ya estaba en la lista.` : null);
    setPeso(capturados.find((c) => c.animal.id === a.id)?.peso?.toString() ?? "");
    setTimeout(() => campoPeso.current?.focus(), 0);
  };

  const buscarYElegir = () => {
    const r = coincidencias(busqueda);
    if (r.length === 0) {
      setAviso(`No hay ningún animal activo con «${busqueda}».`);
      return;
    }
    if (r.length === 1) elegir(r[0]);
    else setAviso(`${r.length} animales coinciden: elige cuál.`);
  };

  /** Guarda el animal actual y devuelve el foco al arete. */
  const siguiente = (destino: Destino = null) => {
    if (!actual) return;
    const valor = peso.trim() ? Number(peso) : null;
    setCapturados((prev) => [
      ...prev.filter((c) => c.animal.id !== actual.id),
      { animal: actual, peso: valor, destino },
    ]);
    setActual(null);
    setPeso("");
    setAviso(null);
    setTimeout(() => campoArete.current?.focus(), 0);
  };

  const quitar = (id: string) =>
    setCapturados((prev) => prev.filter((c) => c.animal.id !== id));

  const marcar = (id: string, destino: Destino) =>
    setCapturados((prev) =>
      prev.map((c) =>
        c.animal.id === id ? { ...c, destino: c.destino === destino ? null : destino } : c
      )
    );

  // Ganancia del animal en pantalla, con lo que se acaba de teclear.
  const gdpActual = (() => {
    if (!actual || !peso.trim()) return null;
    const hoyPesaje = { fecha, peso: Number(peso) };
    return (
      gananciaDiaria(actual.ultimo, hoyPesaje) ?? gananciaDesdeNacimiento(actual, hoyPesaje)
    );
  })();

  const conPeso = capturados.filter((c) => c.peso != null);
  const aVenta = capturados.filter((c) => c.destino === "venta");
  const totalKilos = conPeso.reduce((s, c) => s + (c.peso ?? 0), 0);

  // Un mismo grupo para toda la jornada solo si todos vienen del mismo.
  const grupoComun = capturados.length
    ? capturados.every((c) => c.animal.grupo_id === capturados[0].animal.grupo_id)
      ? capturados[0].animal.grupo_id
      : null
    : null;

  const acciones = [
    { tipo: "pesaje" },
    ...(tambienDestete ? [{ tipo: "destete" }] : []),
  ];

  const valores = Object.fromEntries(
    capturados.map((c) => [
      c.animal.id,
      {
        ...(c.peso != null ? { peso: c.peso } : {}),
        ...(c.destino ? { destino: c.destino } : {}),
      },
    ])
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="fecha-manga">Fecha</Label>
          <CampoFecha
            id="fecha-manga"
            value={fecha}
            onValueChange={setFecha}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <Checkbox
              checked={tambienDestete}
              onCheckedChange={(v) => setTambienDestete(v === true)}
            />
            Es el destete
          </label>
        </div>
      </div>

      {/* El input que nunca se suelta */}
      <div className="rounded-lg border-2 border-primary/30 bg-card p-4">
        {!actual ? (
          <div className="space-y-2">
            <Label htmlFor="arete-manga" className="text-base">
              Arete o SINIIGA
            </Label>
            <div className="relative">
              <ScanLine className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="arete-manga"
                ref={campoArete}
                autoFocus
                value={busqueda}
                inputMode="numeric"
                placeholder="Teclea o escanea…"
                className="h-14 pl-10 text-2xl"
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setAviso(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscarYElegir();
                  }
                }}
              />
            </div>

            {encontrados.length > 1 && (
              <div className="max-h-48 divide-y overflow-y-auto rounded-md border">
                {encontrados.slice(0, 20).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => elegir(a)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-medium">#{a.arete_control ?? "s/n"}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {a.siniga}
                    </span>
                    <span className="ml-auto text-muted-foreground">
                      {etiquetaClase(a.clase)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-heading text-2xl font-semibold">
                  #{actual.arete_control ?? "s/n"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {etiquetaClase(actual.clase)} · {edadTexto(actual.fecha_nacimiento)}
                  {actual.siniga && ` · ${actual.siniga}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Cancelar"
                onClick={() => {
                  setActual(null);
                  setPeso("");
                  setTimeout(() => campoArete.current?.focus(), 0);
                }}
              >
                <X />
              </Button>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-muted-foreground">
                Último peso:{" "}
                <span className="font-medium text-foreground">
                  {actual.ultimo ? `${formatoNumero(actual.ultimo.peso, 1)} kg` : "—"}
                </span>
              </span>
              {gdpActual != null && (
                <span
                  className={cn(
                    "font-medium",
                    gdpActual >= 0 ? "text-exito-fuerte" : "text-peligro-fuerte"
                  )}
                >
                  {formatoGdp(gdpActual)}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="peso-manga" className="text-base">
                Peso (kg)
              </Label>
              <Input
                id="peso-manga"
                ref={campoPeso}
                type="number"
                step="0.1"
                inputMode="decimal"
                value={peso}
                placeholder="0.0"
                className="h-14 text-2xl"
                onChange={(e) => setPeso(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    siguiente();
                  }
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="flex-1" onClick={() => siguiente()}>
                Guardar y seguir
              </Button>
              <Button variant="outline" onClick={() => siguiente("venta")}>
                <HandCoins /> A venta
              </Button>
              <Button variant="outline" onClick={() => siguiente("desecho")}>
                <Ban /> A desecho
              </Button>
            </div>
          </div>
        )}

        {aviso && (
          <Aviso tono="alerta" className="mt-3">
            {aviso}
          </Aviso>
        )}
      </div>

      {capturados.length > 0 && (
        <div className="rounded-lg border">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-3 py-2">
            <h2 className="font-medium">{capturados.length} en la jornada</h2>
            <p className="text-sm text-muted-foreground">
              {conPeso.length > 0 && (
                <>
                  {formatoNumero(totalKilos, 0)} kg · promedio{" "}
                  {formatoNumero(totalKilos / conPeso.length, 1)} kg
                </>
              )}
              {aVenta.length > 0 && ` · ${aVenta.length} a venta`}
            </p>
          </div>
          <ul className="max-h-80 divide-y overflow-y-auto">
            {capturados.map(({ animal, peso: p, destino }) => (
              <li key={animal.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-16 shrink-0 font-medium">
                  #{animal.arete_control ?? "s/n"}
                </span>
                <span className="w-20 shrink-0 text-muted-foreground">
                  {p != null ? `${formatoNumero(p, 1)} kg` : "sin peso"}
                </span>
                <button
                  type="button"
                  onClick={() => marcar(animal.id, "venta")}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs",
                    destino === "venta" && "border-primary bg-accent font-medium"
                  )}
                >
                  venta
                </button>
                <button
                  type="button"
                  onClick={() => marcar(animal.id, "desecho")}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs",
                    destino === "desecho" && "border-primary bg-accent font-medium"
                  )}
                >
                  desecho
                </button>
                <button
                  type="button"
                  aria-label={`Quitar ${animal.arete_control ?? ""}`}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  onClick={() => quitar(animal.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="fecha" value={fecha} />
        <input type="hidden" name="acciones" value={JSON.stringify(acciones)} />
        <input type="hidden" name="valores" value={JSON.stringify(valores)} />
        {grupoComun && <input type="hidden" name="grupo_id" value={grupoComun} />}
        {capturados.map((c) => (
          <input key={c.animal.id} type="hidden" name="animal_id" value={c.animal.id} />
        ))}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="responsable-manga">Responsable</Label>
            <Input id="responsable-manga" name="responsable" placeholder="Vaquero, MVZ…" />
          </div>
          {grupos.length > 0 && !grupoComun && (
            <div className="space-y-2">
              <Label>Grupo (opcional)</Label>
              <SelectCampo
                name="grupo_id"
                opciones={grupos.map((g) => ({ valor: g.id, etiqueta: g.nombre }))}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="flex-1" disabled={capturados.length === 0}>
            Cerrar jornada ({capturados.length})
          </Button>
          {aVenta.length > 0 && (
            <Button
              type="submit"
              name="ir_a_venta"
              value="1"
              variant="secondary"
              className="flex-1"
            >
              <HandCoins /> Cerrar y hacer la venta ({aVenta.length})
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
