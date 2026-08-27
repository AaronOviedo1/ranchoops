"use client";

import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { aISO, alMediodia, fechaHoy } from "@/lib/fechas";
import { cn } from "@/lib/utils";

/** "2026-08-19" → "19 ago 2026". El input nativo mostraba mm/dd/yyyy. */
function etiqueta(iso: string): string {
  if (!iso) return "";
  const d = alMediodia(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Campo de fecha con el calendario de la app.
 *
 * Sustituye a <Input type="date">: emite el mismo "YYYY-MM-DD" con el mismo
 * `name`, así que las server actions que leen formData.get("fecha") no
 * cambian. El año se elige con el desplegable del encabezado: capturar el
 * nacimiento de una vaca de 8 años no debe costar 96 clics de flecha.
 */
export function CampoFecha({
  name,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Elige la fecha",
  required,
  disabled,
  id,
  className,
  /** Años hacia atrás que ofrece el desplegable. */
  aniosAtras = 25,
  /** Años hacia adelante (por default solo el que corre y el siguiente). */
  aniosAdelante = 1,
}: {
  name?: string;
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (iso: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  aniosAtras?: number;
  aniosAdelante?: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [interno, setInterno] = useState(defaultValue ?? "");

  const controlado = value !== undefined;
  const actual = controlado ? value : interno;

  const elegir = (iso: string) => {
    if (!controlado) setInterno(iso);
    onValueChange?.(iso);
  };

  const hoy = fechaHoy();
  const anioActual = Number(hoy.slice(0, 4));
  const seleccionada = actual ? alMediodia(actual) : undefined;

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
              className={cn(
                "w-full justify-between font-normal",
                !actual && "text-muted-foreground",
                className
              )}
            />
          }
        >
          <span className="truncate">{etiqueta(actual) || placeholder}</span>
          <span className="flex shrink-0 items-center gap-1">
            {actual && !disabled && (
              <span
                role="button"
                aria-label="Quitar la fecha"
                className="rounded-sm p-0.5 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  elegir("");
                }}
              >
                <X className="size-3.5" />
              </span>
            )}
            <CalendarIcon className="size-4 opacity-50" />
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            // Celdas más grandes que el default (28px): con 28 los números
            // quedaban apretados y era fácil errarle al día en el teléfono.
            className="[--cell-size:--spacing(9)] p-3"
            mode="single"
            locale={es}
            captionLayout="dropdown"
            startMonth={new Date(anioActual - aniosAtras, 0)}
            endMonth={new Date(anioActual + aniosAdelante, 11)}
            defaultMonth={seleccionada}
            selected={seleccionada}
            onSelect={(d) => {
              if (!d) return;
              elegir(aISO(d));
              setAbierto(false);
            }}
            autoFocus
          />
          <div className="flex items-center justify-between border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                elegir("");
                setAbierto(false);
              }}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                elegir(hoy);
                setAbierto(false);
              }}
            >
              Hoy
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
