"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Beef,
  Boxes,
  CloudRain,
  Fence,
  HandCoins,
  Home,
  Map,
  Menu,
  NotebookPen,
  Package,
  Plus,
  Receipt,
  Settings,
  Syringe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const SECCIONES = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/ganado", etiqueta: "Ganado", icono: Beef },
  { href: "/grupos", etiqueta: "Grupos", icono: Boxes },
  { href: "/trabajos", etiqueta: "Trabajos", icono: Syringe },
  { href: "/bitacora", etiqueta: "Bitácora", icono: NotebookPen },
  { href: "/potreros", etiqueta: "Potreros", icono: Fence },
  { href: "/mapa", etiqueta: "Mapa", icono: Map },
  { href: "/lluvias", etiqueta: "Lluvias", icono: CloudRain },
  { href: "/inventario", etiqueta: "Inventario", icono: Package },
  { href: "/costos", etiqueta: "Costos", icono: Receipt },
  { href: "/ventas", etiqueta: "Ventas", icono: HandCoins },
  { href: "/reportes", etiqueta: "Reportes", icono: BarChart3 },
  { href: "/configuracion", etiqueta: "Configuración", icono: Settings },
] as const;

function esActiva(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarNav({ nombreRancho }: { nombreRancho: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="text-lg">🐄</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">RanchOps</p>
          <p className="truncate text-xs text-muted-foreground">{nombreRancho}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {SECCIONES.map(({ href, etiqueta, icono: Icono }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              esActiva(pathname, href)
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icono className="h-4 w-4" />
            {etiqueta}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const principales = SECCIONES.filter((s) =>
    ["/", "/ganado", "/potreros"].includes(s.href)
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {principales.slice(0, 2).map(({ href, etiqueta, icono: Icono }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px]",
              esActiva(pathname, href) ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icono className="h-5 w-5" />
            {etiqueta}
          </Link>
        ))}
        <Link
          href="/trabajos/nuevo"
          className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
        >
          <span className="flex h-8 w-8 -mt-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Plus className="h-5 w-5" />
          </span>
          Capturar
        </Link>
        {principales.slice(2).map(({ href, etiqueta, icono: Icono }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px]",
              esActiva(pathname, href) ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icono className="h-5 w-5" />
            {etiqueta}
          </Link>
        ))}
        <Sheet open={abierto} onOpenChange={setAbierto}>
          <SheetTrigger className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground">
            <Menu className="h-5 w-5" />
            Más
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-8">
            <SheetHeader>
              <SheetTitle>Secciones</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2 px-4">
              {SECCIONES.map(({ href, etiqueta, icono: Icono }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setAbierto(false)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs",
                    esActiva(pathname, href) && "border-primary bg-accent"
                  )}
                >
                  <Icono className="h-5 w-5" />
                  {etiqueta}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
