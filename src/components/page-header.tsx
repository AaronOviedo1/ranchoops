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
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({
  emoji = "🌵",
  titulo,
  descripcion,
  children,
}: {
  emoji?: string;
  titulo: string;
  descripcion?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
      <span className="text-3xl">{emoji}</span>
      <p className="mt-3 font-medium">{titulo}</p>
      {descripcion && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{descripcion}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
