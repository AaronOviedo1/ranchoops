import { cn } from "@/lib/utils";
import type { Tono } from "@/lib/estados";

// Clases literales: Tailwind v4 no escanea `bg-${tono}-suave`.
const SUAVE: Record<Tono, string> = {
  exito: "bg-exito-suave text-exito-fuerte",
  alerta: "bg-alerta-suave text-alerta-fuerte",
  peligro: "bg-peligro-suave text-peligro-fuerte",
  neutro: "bg-neutro-suave text-neutro-fuerte",
  info: "bg-info-suave text-info-fuerte",
  marca: "bg-marca-suave text-marca-fuerte",
};

const CONTORNO: Record<Tono, string> = {
  exito: "border border-exito/40 text-exito-fuerte",
  alerta: "border border-alerta/50 text-alerta-fuerte",
  peligro: "border border-peligro/40 text-peligro-fuerte",
  neutro: "border border-neutro/40 text-neutro-fuerte",
  info: "border border-info/40 text-info-fuerte",
  marca: "border border-marca/50 text-marca-fuerte",
};

const PUNTO: Record<Tono, string> = {
  exito: "bg-exito",
  alerta: "bg-alerta",
  peligro: "bg-peligro",
  neutro: "bg-neutro",
  info: "bg-info",
  marca: "bg-marca",
};

export function EstadoBadge({
  tono,
  children,
  punto = true,
  variante = "suave",
  className,
}: {
  tono: Tono;
  children: React.ReactNode;
  punto?: boolean;
  variante?: "suave" | "contorno";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        variante === "suave" ? SUAVE[tono] : CONTORNO[tono],
        className
      )}
    >
      {punto && (
        <span className={cn("size-1.5 shrink-0 rounded-full", PUNTO[tono])} />
      )}
      {children}
    </span>
  );
}
