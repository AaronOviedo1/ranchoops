"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type OpcionCombo = {
  valor: string;
  etiqueta: string;
  /** Texto secundario que se muestra a la derecha (SINIIGA, clase, grupo…). */
  detalle?: string;
  /** Términos extra por los que se puede buscar sin que se vean. */
  busqueda?: string;
  deshabilitada?: boolean;
};

/** A partir de aquí la lista deja de leerse de un vistazo y conviene teclear. */
const LISTA_LARGA = 8;

/**
 * Select con buscador escribible.
 *
 * "Que le puedas escribir para buscar… lo escribes y te va mostrando lo que
 * sale con el número" — con 500 vacas, un select de scroll no sirve.
 *
 * Emite un input oculto con el `name`, así que sustituye a un <select>
 * nativo sin tocar las server actions que leen formData.get(name).
 */
export function ComboCampo({
  name,
  opciones,
  defaultValue,
  value,
  onValueChange,
  placeholder = "—",
  textoBuscar = "Escribe para buscar…",
  vacio = "Sin resultados.",
  /** Permite guardar lo que se escriba aunque no esté en la lista (sementales de fuera). */
  textoLibre = false,
  required,
  disabled,
  id,
  size = "default",
  className,
  contentClassName,
  /**
   * Enfocar el buscador al abrir. En listas cortas se deja apagado: en el
   * teléfono el teclado taparía las opciones que se querían leer.
   */
  autoEnfocar,
}: {
  name?: string;
  opciones: OpcionCombo[];
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (valor: string) => void;
  placeholder?: string;
  textoBuscar?: string;
  vacio?: string;
  textoLibre?: boolean;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  size?: "sm" | "default";
  className?: string;
  contentClassName?: string;
  autoEnfocar?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [interno, setInterno] = useState(defaultValue ?? "");

  const controlado = value !== undefined;
  const actual = controlado ? value : interno;

  const elegir = (v: string) => {
    if (!controlado) setInterno(v);
    onValueChange?.(v);
    setAbierto(false);
    setBusqueda("");
  };

  const seleccionada = useMemo(
    () => opciones.find((o) => o.valor === actual),
    [opciones, actual]
  );

  // Con texto libre el valor puede no estar en la lista: se muestra tal cual.
  const etiquetaActual = seleccionada?.etiqueta ?? (actual || "");
  const libreDisponible =
    textoLibre &&
    busqueda.trim() !== "" &&
    !opciones.some((o) => o.etiqueta.toLowerCase() === busqueda.trim().toLowerCase());

  return (
    <div className="relative">
      {name && (
        // No es type="hidden": así el navegador puede anclarle el aviso de
        // "completa este campo" cuando el campo es obligatorio.
        <input
          type="text"
          name={name}
          value={actual}
          required={required}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-3 h-0 w-0 border-0 p-0 opacity-0"
        />
      )}
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              size={size}
              className={cn(
                "w-full justify-between font-normal",
                !etiquetaActual && "text-muted-foreground",
                className
              )}
            />
          }
        >
          <span className="truncate">{etiquetaActual || placeholder}</span>
          <span className="flex shrink-0 items-center gap-1">
            {actual && !disabled && (
              <span
                role="button"
                aria-label="Quitar"
                className="rounded-sm p-0.5 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  elegir("");
                }}
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 opacity-50" />
          </span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn("w-(--anchor-width) min-w-64 p-0", contentClassName)}
        >
          <Command>
            <CommandInput
              autoFocus={autoEnfocar ?? opciones.length > LISTA_LARGA}
              placeholder={textoBuscar}
              value={busqueda}
              onValueChange={setBusqueda}
            />
            <CommandList>
              <CommandEmpty>
                {libreDisponible ? (
                  <button
                    type="button"
                    className="w-full px-2 text-left text-sm underline"
                    onClick={() => elegir(busqueda.trim())}
                  >
                    Usar «{busqueda.trim()}»
                  </button>
                ) : (
                  vacio
                )}
              </CommandEmpty>
              {libreDisponible && (
                <CommandItem
                  value={`__libre__ ${busqueda}`}
                  onSelect={() => elegir(busqueda.trim())}
                >
                  <span>
                    Usar «<span className="font-medium">{busqueda.trim()}</span>»
                  </span>
                </CommandItem>
              )}
              {opciones.map((o) => (
                <CommandItem
                  key={o.valor}
                  value={`${o.etiqueta} ${o.detalle ?? ""} ${o.busqueda ?? ""}`}
                  disabled={o.deshabilitada}
                  onSelect={() => elegir(o.valor)}
                >
                  <Check
                    className={cn(
                      "size-4",
                      o.valor === actual ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{o.etiqueta}</span>
                  {o.detalle && (
                    <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                      {o.detalle}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Etiqueta estándar de un animal en los combos: `#arete · SINIIGA`. */
export function opcionAnimal(a: {
  id: string;
  arete_control: string | null;
  siniga: string | null;
  nombre?: string | null;
  clase?: string;
}): OpcionCombo {
  return {
    valor: a.id,
    etiqueta: `#${a.arete_control ?? "s/n"}${a.nombre ? ` · ${a.nombre}` : ""}`,
    detalle: a.siniga ?? undefined,
    busqueda: [a.siniga, a.clase, a.nombre].filter(Boolean).join(" "),
  };
}
