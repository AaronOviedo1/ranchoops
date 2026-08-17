"use client";

import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MenuUsuario({
  nombreRancho,
  email,
  cerrarSesion,
}: {
  nombreRancho: string;
  email?: string;
  cerrarSesion: () => Promise<void>;
}) {
  const iniciales = nombreRancho.trim().slice(0, 2).toUpperCase() || "R";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de la cuenta"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {iniciales}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2 py-1.5">
          <User className="size-4" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-heading text-sm font-semibold text-foreground">
              {nombreRancho}
            </span>
            {email && <span className="block truncate">{email}</span>}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/configuracion" />}>
          <Settings />
          Configuración
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/*
          Botón de submit plano, no un MenuItem: el popup se desmonta al hacer
          click y no queremos que eso compita con el envío de la server action.
        */}
        <form action={cerrarSesion}>
          <button
            type="submit"
            className="flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-destructive outline-hidden select-none hover:bg-destructive/10 focus-visible:bg-destructive/10"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
