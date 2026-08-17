import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TonoAviso = "exito" | "alerta" | "peligro" | "info";

const ESTILO: Record<TonoAviso, string> = {
  exito: "bg-exito-suave text-exito-fuerte border-exito/30",
  alerta: "bg-alerta-suave text-alerta-fuerte border-alerta/40",
  peligro: "bg-peligro-suave text-peligro-fuerte border-peligro/30",
  info: "bg-info-suave text-info-fuerte border-info/30",
};

const ICONO_POR_DEFECTO: Record<TonoAviso, LucideIcon> = {
  exito: CheckCircle2,
  alerta: AlertTriangle,
  peligro: XCircle,
  info: Info,
};

export function Aviso({
  tono,
  children,
  icono,
  titulo,
  className,
}: {
  tono: TonoAviso;
  children?: React.ReactNode;
  icono?: LucideIcon | false;
  titulo?: string;
  className?: string;
}) {
  const Icono = icono === false ? null : (icono ?? ICONO_POR_DEFECTO[tono]);
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
        ESTILO[tono],
        className
      )}
    >
      {Icono && <Icono className="mt-0.5 size-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-heading font-semibold">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}
