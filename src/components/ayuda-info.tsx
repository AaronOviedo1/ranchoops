"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * La "i" que explica un campo.
 *
 * Va con Popover y no con Tooltip a propósito: esto se usa en el teléfono,
 * dentro de la manga, y ahí no hay hover — el dato se lee tocando.
 */
export function AyudaInfo({
  titulo,
  children,
  className,
}: {
  titulo?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            // Dentro de un <form> un botón sin type manda el formulario.
            type="button"
            aria-label={titulo ? `Información: ${titulo}` : "Más información"}
            className={cn(
              "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              className
            )}
          />
        }
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="gap-1.5">
        {titulo && <PopoverTitle>{titulo}</PopoverTitle>}
        <PopoverDescription className="leading-relaxed">{children}</PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
