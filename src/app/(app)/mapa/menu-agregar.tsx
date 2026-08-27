"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ClipboardList, Fence, Plus, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CATEGORIAS_INFRA,
  tipoInfra,
  tiposInfraDe,
  type TipoInfra,
} from "@/lib/catalogos";
import { colorPin, iconoInfra } from "./pines";

/**
 * Un solo botón para todo lo que se le agrega al mapa.
 *
 * Antes había un botón por herramienta de dibujo ("Potrero", "Área", "Tubería
 * o cerco"), que obliga a saber de antemano si una henera se dibuja como punto
 * o como polígono. Ahora se elige la cosa y la herramienta sale sola.
 */
export function MenuAgregar({
  onPotrero,
  onTipo,
}: {
  onPotrero: () => void;
  onTipo: (tipo: TipoInfra) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [catalogo, setCatalogo] = useState(false);
  const pivote = tipoInfra("pivote");
  const areas = tiposInfraDe("area").filter((t) => t.valor !== "pivote");

  const elegir = (tipo: TipoInfra) => {
    setCatalogo(false);
    onTipo(tipo);
  };

  return (
    <>
      <DropdownMenu open={menu} onOpenChange={setMenu}>
        <DropdownMenuTrigger
          render={
            <Button size="sm">
              <Plus className="size-4" />
              Agregar
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={onPotrero}>
            <Fence className="size-4" />
            Potrero
          </DropdownMenuItem>
          {pivote && (
            <DropdownMenuItem onClick={() => elegir(pivote)}>
              <RotateCw className="size-4" />
              Pivote
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href="/trabajos/nuevo" />}>
            <ClipboardList className="size-4" />
            Tarea
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Área</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {areas.map((t) => {
                const Icono = iconoInfra(t.valor);
                return (
                  <DropdownMenuItem key={t.valor} onClick={() => elegir(t)}>
                    <Icono className="size-4" />
                    {t.etiqueta}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* El catálogo se abre cuando el menú ya se cerró, para que no se
              peleen por el foco. */}
          <DropdownMenuItem
            closeOnClick={false}
            onClick={() => {
              setMenu(false);
              setTimeout(() => setCatalogo(true), 0);
            }}
          >
            Mejoras
            <ChevronRight className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={catalogo} onOpenChange={setCatalogo}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mejoras</DialogTitle>
            <DialogDescription>
              Elige qué vas a marcar; el mapa te pide el trazo que le toca a cada
              cosa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {CATEGORIAS_INFRA.map((categoria) => (
              <div key={categoria.clave}>
                <p className="pb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {categoria.etiqueta}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {tiposInfraDe(categoria.clave).map((t) => {
                    const Icono = iconoInfra(t.valor);
                    return (
                      <button
                        key={t.valor}
                        type="button"
                        onClick={() => elegir(t)}
                        className="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs transition-colors hover:bg-accent"
                      >
                        <Icono
                          className="size-5 shrink-0"
                          style={{ color: colorPin(t.valor) }}
                        />
                        <span className="leading-tight">{t.etiqueta}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
