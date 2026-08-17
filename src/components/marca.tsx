import { cn } from "@/lib/utils";

// Contorno del arete de ganado: cabeza redondeada, punta en V abajo.
const ARETE =
  "M8.5 3.25h7A3.25 3.25 0 0 1 18.75 6.5v6.75c0 .9-.36 1.75-.99 2.38l-5.06 5.06a1 1 0 0 1-1.4 0L6.24 15.63a3.36 3.36 0 0 1-.99-2.38V6.5A3.25 3.25 0 0 1 8.5 3.25Z";

/**
 * Logotipo de RanchOps: un arete de ganado con el ojal arriba y, dentro,
 * dos trazos de lomerío que sugieren el potrero. Todo en currentColor.
 */
export function LogoRanchOps({
  className,
  variante = "monocromo",
  titulo = "RanchOps",
}: {
  className?: string;
  variante?: "monocromo" | "duotono";
  titulo?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={titulo}
      className={cn("size-6", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d={ARETE}
        fill={variante === "duotono" ? "var(--color-marca)" : "none"}
      />
      <circle cx="12" cy="6.9" r="1.1" />
      <path d="M8.6 10.6c1.2-.9 2.1-.9 3.4 0s2.2.9 3.4 0" />
      <path d="M8.6 13.4c1.2-.9 2.1-.9 3.4 0s2.2.9 3.4 0" />
    </svg>
  );
}

const TAMANOS = {
  sm: { logo: "size-5", nombre: "text-sm", rancho: "text-xs" },
  md: { logo: "size-7", nombre: "text-base", rancho: "text-xs" },
  lg: { logo: "size-12", nombre: "text-2xl", rancho: "text-sm" },
} as const;

export function Marca({
  nombreRancho,
  tamano = "md",
  orientacion = "horizontal",
  tono = "marca",
  className,
}: {
  nombreRancho?: string;
  tamano?: "sm" | "md" | "lg";
  orientacion?: "horizontal" | "apilada";
  /** "claro" para fondos oscuros, donde el verde de marca no contrasta. */
  tono?: "marca" | "claro";
  className?: string;
}) {
  const t = TAMANOS[tamano];
  const claro = tono === "claro";
  return (
    <div
      className={cn(
        "flex min-w-0",
        orientacion === "apilada"
          ? "flex-col items-center gap-2 text-center"
          : "items-center gap-2.5",
        className
      )}
    >
      <LogoRanchOps
        variante="duotono"
        className={cn(t.logo, claro ? "text-primary-foreground" : "text-primary")}
      />
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-heading leading-tight font-semibold tracking-tight",
            t.nombre
          )}
        >
          RanchOps
        </p>
        {nombreRancho && (
          <p
            className={cn(
              "truncate",
              t.rancho,
              claro ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {nombreRancho}
          </p>
        )}
      </div>
    </div>
  );
}
