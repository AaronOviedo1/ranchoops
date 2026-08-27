"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Columns3, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SelectCampo } from "@/components/ui/select-campo";
import { COOKIE_TABLA, type PreferenciasTabla } from "@/lib/preferencias-tabla";

type ColumnaControl = {
  clave: string;
  etiqueta: string;
  fija: boolean;
  visible: boolean;
};

/** Escribe (o borra) la cookie de preferencias de una tabla. */
function escribirCookieTabla(nombre: string, prefs: PreferenciasTabla | null) {
  document.cookie = prefs
    ? `${nombre}=${encodeURIComponent(JSON.stringify(prefs))}; path=/; max-age=31536000; samesite=lax`
    : `${nombre}=; path=/; max-age=0`;
}

/**
 * Barra de controles de una TablaPro: columnas, agrupar y exportar.
 *
 * Solo recibe datos serializables (nada de funciones `celda`): la verdad de
 * qué se ve la tiene el servidor; aquí nomás se escribe la cookie y se pide
 * `router.refresh()` para que la página se vuelva a armar.
 */
export function TablaProControles({
  id,
  columnas,
  agrupables,
  grupo,
  exportarHref,
}: {
  id: string;
  columnas: ColumnaControl[];
  agrupables: { clave: string; etiqueta: string }[];
  grupo: string;
  exportarHref?: string;
}) {
  const router = useRouter();
  const [cargando, empezar] = useTransition();

  const guardar = (prefs: PreferenciasTabla | null) => {
    escribirCookieTabla(COOKIE_TABLA(id), prefs);
    empezar(() => router.refresh());
  };

  const visibles = columnas.filter((c) => c.visible).map((c) => c.clave);

  const alternarColumna = (clave: string, prender: boolean) => {
    const c = prender
      ? [...visibles, clave]
      : visibles.filter((v) => v !== clave);
    guardar({ c, g: grupo || undefined });
  };

  const urlExportar = (formato: "csv" | "xlsx") => {
    // Filtros vigentes de la página + los fijos que traiga el href.
    const [base, fijos] = (exportarHref ?? "").split("?");
    const p = new URLSearchParams(window.location.search);
    if (fijos) for (const [k, v] of new URLSearchParams(fijos)) p.set(k, v);
    p.set("formato", formato);
    return `${base}?${p}`;
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm">
              <Columns3 className="size-4" /> Columnas ({visibles.length})
            </Button>
          }
        />
        <PopoverContent align="start" className="w-60">
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {columnas.map((c) => (
              <Label
                key={c.clave}
                className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm font-normal hover:bg-accent/50"
              >
                <Checkbox
                  checked={c.visible}
                  disabled={c.fija}
                  onCheckedChange={(v) => alternarColumna(c.clave, v === true)}
                />
                {c.etiqueta}
              </Label>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => guardar(null)}
          >
            Restablecer
          </Button>
        </PopoverContent>
      </Popover>

      {agrupables.length > 0 && (
        <SelectCampo
          value={grupo}
          placeholder="Sin agrupar"
          opcionVacia="Sin agrupar"
          size="sm"
          className="w-44"
          opciones={agrupables.map((a) => ({
            valor: a.clave,
            etiqueta: `Agrupar: ${a.etiqueta}`,
          }))}
          onValueChange={(v) =>
            guardar({ c: visibles, g: v || undefined })
          }
        />
      )}

      {exportarHref && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <Download className="size-4" /> Exportar
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => (window.location.href = urlExportar("xlsx"))}
            >
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => (window.location.href = urlExportar("csv"))}
            >
              CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {cargando && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
