"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Beef, Fence, Home, Menu, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LogoRanchOps, Marca } from "@/components/marca";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  seccionesAlPie,
  seccionesPara,
  esActiva,
  pestanaActiva,
  seccionActiva,
  type Seccion,
} from "@/lib/secciones";

/** El menú angosto deja el ancho de la pantalla para la tabla de ganado. */
const CLAVE_COLAPSADO = "ranchops:menu-colapsado";

// La preferencia vive en localStorage, no en React: así aguanta el recargado
// y las pestañas abiertas se enteran unas de otras.
const oyentes = new Set<() => void>();

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

function leerColapsado() {
  return localStorage.getItem(CLAVE_COLAPSADO) === "1";
}

/** En el servidor no hay preferencia: el HTML sale siempre con el menú ancho. */
function leerEnServidor() {
  return false;
}

function guardarColapsado(colapsado: boolean) {
  localStorage.setItem(CLAVE_COLAPSADO, colapsado ? "1" : "0");
  for (const avisar of oyentes) avisar();
}

export function SidebarNav({
  nombreRancho,
  rol = "admin",
  children,
}: {
  nombreRancho: string;
  rol?: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const colapsado = useSyncExternalStore(suscribir, leerColapsado, leerEnServidor);

  useEffect(() => {
    const alAtajo = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== "b") return;
      e.preventDefault();
      guardarColapsado(!leerColapsado());
    };
    window.addEventListener("keydown", alAtajo);
    return () => window.removeEventListener("keydown", alAtajo);
  }, []);

  const secciones = seccionesPara(rol);
  const alPie = seccionesAlPie(rol);

  const renglon = (seccion: Seccion) => {
    const activa = esActiva(pathname, seccion);
    const Icono = seccion.icono;
    const enlace = (
      <Link
        href={seccion.href}
        aria-current={activa ? "page" : undefined}
        className={cn(
          "relative flex items-center rounded-lg text-sm transition-colors",
          colapsado ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
          activa
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-r-full before:bg-marca"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        )}
      >
        <Icono className={cn("size-4 shrink-0", activa && "text-primary")} />
        {colapsado ? <span className="sr-only">{seccion.etiqueta}</span> : seccion.etiqueta}
      </Link>
    );

    return (
      <li key={seccion.href}>
        {colapsado ? (
          <Tooltip>
            <TooltipTrigger render={enlace} />
            <TooltipContent side="right">{seccion.etiqueta}</TooltipContent>
          </Tooltip>
        ) : (
          enlace
        )}
      </li>
    );
  };

  return (
    <aside
      aria-label="Secciones"
      // Lo que el layout mete como children se acomoda solo con este dato.
      data-colapsado={colapsado ? "true" : "false"}
      className={cn(
        "group/sidebar hidden shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex md:flex-col",
        colapsado ? "w-[4.5rem]" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          colapsado ? "justify-center px-2" : "px-4"
        )}
      >
        {colapsado ? (
          <LogoRanchOps
            variante="duotono"
            className="size-7 text-primary"
            titulo={`RanchOps — ${nombreRancho}`}
          />
        ) : (
          <Marca nombreRancho={nombreRancho} tamano="md" />
        )}
      </div>

      <TooltipProvider delay={300}>
        <nav className="flex-1 overflow-y-auto p-2 pt-3">
          <ul className="space-y-0.5">{secciones.map(renglon)}</ul>

          {alPie.length > 0 && (
            <>
              <div className="mx-3 my-2 h-px bg-sidebar-border" />
              <ul className="space-y-0.5">{alPie.map(renglon)}</ul>
            </>
          )}
        </nav>
      </TooltipProvider>

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={() => guardarColapsado(!colapsado)}
          aria-expanded={!colapsado}
          aria-label={colapsado ? "Expandir el menú" : "Colapsar el menú"}
          title={`${colapsado ? "Expandir" : "Colapsar"} el menú (Ctrl+B)`}
          className={cn(
            "flex w-full items-center rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            colapsado ? "justify-center" : "gap-3 px-3"
          )}
        >
          {colapsado ? (
            <PanelLeftOpen className="size-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0" />
              Colapsar
            </>
          )}
        </button>
      </div>

      {children && (
        <div
          className={cn(
            "mt-auto border-t border-sidebar-border",
            colapsado ? "p-2" : "p-3"
          )}
        >
          {children}
        </div>
      )}
    </aside>
  );
}

/** Dónde estoy parado: "Tierra › Mapa" cuando la sección tiene pestañas. */
export function TituloSeccion() {
  const pathname = usePathname();
  const seccion = seccionActiva(pathname);
  if (!seccion) return null;
  const pestana = pestanaActiva(pathname);
  const Icono = seccion.icono;
  return (
    <div className="hidden items-center gap-2 md:flex">
      <Icono className="size-4 text-muted-foreground" />
      <span className="font-heading text-sm font-semibold">{seccion.etiqueta}</span>
      {pestana && pestana.etiqueta !== seccion.etiqueta && (
        <>
          <span aria-hidden className="text-muted-foreground">
            ›
          </span>
          <span className="text-sm text-muted-foreground">{pestana.etiqueta}</span>
        </>
      )}
    </div>
  );
}

const PRINCIPALES = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/ganado", etiqueta: "Ganado", icono: Beef },
  { href: "/potreros", etiqueta: "Potreros", icono: Fence },
] as const;

export function BottomNav({ rol = "admin" }: { rol?: string }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  const item = (
    href: string,
    etiqueta: string,
    Icono: (typeof PRINCIPALES)[number]["icono"]
  ) => {
    const seccion = seccionActiva(pathname);
    const activa = seccion ? esActiva(pathname, seccion) && seccion.href === href : false;
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
            <div className="grid grid-cols-3 gap-2 px-4">
              {[...seccionesPara(rol), ...seccionesAlPie(rol)].map((seccion) => {
                const Icono = seccion.icono;
                const activa = esActiva(pathname, seccion);
                return (
                  <Link
                    key={seccion.href}
                    href={seccion.href}
                    onClick={() => setAbierto(false)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 text-center text-xs transition-colors",
                      activa
                        ? "border-primary bg-primary/8 font-medium text-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <Icono className="size-5" />
                    {seccion.etiqueta}
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
