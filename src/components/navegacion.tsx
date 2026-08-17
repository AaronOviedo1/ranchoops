"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Beef, Fence, Home, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { Marca } from "@/components/marca";
import {
  GRUPOS,
  SECCIONES,
  esActiva,
  seccionActiva,
  seccionesPorGrupo,
} from "@/lib/secciones";

export function SidebarNav({
  nombreRancho,
  children,
}: {
  nombreRancho: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Secciones"
      className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col"
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Marca nombreRancho={nombreRancho} tamano="md" />
      </div>

      <nav className="flex-1 overflow-y-auto p-2 pb-4">
        {GRUPOS.map((grupo) => {
          const items = seccionesPorGrupo(grupo.clave);
          if (items.length === 0) return null;
          return (
            <div key={grupo.clave} className="mb-1">
              <p className="px-3 pt-4 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                {grupo.etiqueta}
              </p>
              <ul className="space-y-0.5">
                {items.map(({ href, etiqueta, icono: Icono }) => {
                  const activa = esActiva(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={activa ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          activa
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-r-full before:bg-marca"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icono
                          className={cn(
                            "size-4 shrink-0",
                            activa && "text-primary"
                          )}
                        />
                        {etiqueta}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {children && (
        <div className="mt-auto border-t border-sidebar-border p-3">
          {children}
        </div>
      )}
    </aside>
  );
}

/** Título de la sección actual: llena el header de escritorio, hoy vacío. */
export function TituloSeccion() {
  const pathname = usePathname();
  const seccion = seccionActiva(pathname);
  if (!seccion) return null;
  const Icono = seccion.icono;
  return (
    <div className="hidden items-center gap-2 md:flex">
      <Icono className="size-4 text-muted-foreground" />
      <span className="font-heading text-sm font-semibold">
        {seccion.etiqueta}
      </span>
    </div>
  );
}

const PRINCIPALES = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/ganado", etiqueta: "Ganado", icono: Beef },
  { href: "/potreros", etiqueta: "Potreros", icono: Fence },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  const item = (
    href: string,
    etiqueta: string,
    Icono: (typeof PRINCIPALES)[number]["icono"]
  ) => {
    const activa = esActiva(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={activa ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
          activa ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Icono className="size-5" />
        {etiqueta}
        <span
          aria-hidden
          className={cn("size-1 rounded-full", activa ? "bg-marca" : "bg-transparent")}
        />
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-5">
        {PRINCIPALES.slice(0, 2).map((s) => item(s.href, s.etiqueta, s.icono))}

        <Link
          href="/trabajos/nuevo"
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground"
        >
          <span className="-mt-5 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
            <Plus className="size-5" />
          </span>
          Capturar
        </Link>

        {PRINCIPALES.slice(2).map((s) => item(s.href, s.etiqueta, s.icono))}

        <Sheet open={abierto} onOpenChange={setAbierto}>
          <SheetTrigger className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground">
            <Menu className="size-5" />
            Más
            <span aria-hidden className="size-1 rounded-full bg-transparent" />
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-8">
            <SheetHeader>
              <SheetTitle>Secciones</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-4">
              {GRUPOS.map((grupo) => {
                const items = SECCIONES.filter((s) => s.grupo === grupo.clave);
                if (items.length === 0) return null;
                return (
                  <div key={grupo.clave}>
                    <p className="pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      {grupo.etiqueta}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {items.map(({ href, etiqueta, icono: Icono }) => {
                        const activa = esActiva(pathname, href);
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setAbierto(false)}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                              activa
                                ? "border-primary bg-primary/8 font-medium text-primary"
                                : "hover:bg-accent"
                            )}
                          >
                            <Icono className="size-5" />
                            {etiqueta}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
