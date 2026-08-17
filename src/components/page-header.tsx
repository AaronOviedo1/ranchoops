import type { LucideIcon } from "lucide-react";
import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  titulo,
  descripcion,
  children,
  className,
}: {
  titulo: string;
  descripcion?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-start justify-between gap-3",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-heading text-xl font-semibold tracking-[-0.01em] md:text-2xl">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      )}
    </div>
  );
}

export function EmptyState({
  icono: Icono = Sprout,
  titulo,
  descripcion,
  children,
  className,
}: {
  icono?: LucideIcon;
  titulo: string;
  descripcion?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10 text-center",
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-primary">
        <Icono className="size-6" />
      </span>
      <p className="mt-3 font-heading font-semibold">{titulo}</p>
      {descripcion && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {descripcion}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
