"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { pestanasPara, seccionActiva } from "@/lib/secciones";

/**
 * Las pantallas hermanas de la sección donde estás parado.
 *
 * Vive en el layout y no en cada página: así la tierra se recorre por potrero,
 * pastoreo, mapa y lluvia sin volver al menú, y el menú se ahorra un renglón
 * por cada una.
 */
export function PestanasSeccion({ rol = "admin" }: { rol?: string }) {
  const pathname = usePathname();
  const seccion = seccionActiva(pathname);
  if (!seccion) return null;

  const pestanas = pestanasPara(seccion, rol);
  if (pestanas.length < 2) return null;

  return (
    <nav
      aria-label={`Secciones de ${seccion.etiqueta}`}
      className="sticky top-16 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div className="mx-auto flex w-full max-w-[1400px] gap-1 overflow-x-auto px-4 md:px-8">
        {pestanas.map(({ href, etiqueta, icono: Icono }) => {
          const activa =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activa ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
                activa
                  ? "border-marca font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icono className={cn("size-4", activa && "text-primary")} />
              {etiqueta}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
