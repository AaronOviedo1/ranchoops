import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TonoTile = "neutro" | "marca" | "exito" | "alerta" | "peligro" | "info";

// Franja superior de 3px: el color de un vistazo, sin leer la etiqueta.
const FRANJA: Record<TonoTile, string> = {
  neutro: "bg-border",
  marca: "bg-marca",
  exito: "bg-exito",
  alerta: "bg-alerta",
  peligro: "bg-peligro",
  info: "bg-info",
};

export function StatTile({
  etiqueta,
  valor,
  detalle,
  href,
  icono: Icono,
  tono = "neutro",
  destacado = false,
  accion,
  className,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  href?: string;
  icono?: LucideIcon;
  tono?: TonoTile;
  destacado?: boolean;
  accion?: React.ReactNode;
  className?: string;
}) {
  const contenido = (
    <Card
      className={cn(
        "relative h-full gap-0 transition-colors",
        href && "hover:bg-accent/50",
        className
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-[3px]", FRANJA[tono])}
      />
      <CardContent className="pt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {etiqueta}
          </p>
          {Icono && (
            <Icono className="size-4 shrink-0 text-muted-foreground" />
          )}
        </div>
        <p
          className={cn(
            "mt-1.5 font-heading font-semibold tracking-tight tabular-nums",
            destacado ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
          )}
        >
          {valor}
        </p>
        {detalle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>
        )}
        {accion && <div className="mt-3">{accion}</div>}
      </CardContent>
    </Card>
  );

  if (!href) return contenido;
  return (
    <Link href={href} className="block h-full">
      {contenido}
    </Link>
  );
}
