"use client";

import Link from "next/link";
import { FileUp, PenLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Las dos formas de meter ganado, en un solo botón.
 *
 * Un animal se captura a mano; un hato entero llega en un CSV. Como las dos
 * cosas son "dar de alta", cuelgan del mismo botón en vez de competir por
 * espacio en el encabezado.
 */
export function BotonNuevoAnimal({ variant }: { variant?: "default" | "outline" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant={variant}>
            <Plus className="h-4 w-4" /> Nuevo animal
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem render={<Link href="/ganado/nuevo" />}>
          <PenLine className="size-4" />
          <span>
            Capturar uno
            <span className="block text-xs text-muted-foreground">
              Lo das de alta paso a paso
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/ganado/importar" />}>
          <FileUp className="size-4" />
          <span>
            Importar un CSV
            <span className="block text-xs text-muted-foreground">
              Sube el inventario completo de un jalón
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
