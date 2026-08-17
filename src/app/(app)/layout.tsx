import { requireRancho } from "@/lib/auth";
import { BottomNav, SidebarNav, TituloSeccion } from "@/components/navegacion";
import { LogoRanchOps } from "@/components/marca";
import { BotonSalir } from "@/components/boton-salir";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rancho = await requireRancho();
  const iniciales = rancho.nombre.trim().slice(0, 2).toUpperCase() || "R";

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav nombreRancho={rancho.nombre}>
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 px-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {iniciales}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {rancho.nombre}
            </span>
          </div>
          <BotonSalir />
        </div>
      </SidebarNav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-8">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <LogoRanchOps variante="duotono" className="size-6 shrink-0 text-primary" />
            <span className="truncate font-heading text-sm font-semibold">
              {rancho.nombre}
            </span>
          </div>
          <TituloSeccion />
          {/* En escritorio el botón vive en el pie del menú lateral */}
          <div className="shrink-0 md:hidden">
            <BotonSalir variante="icono" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 pb-28 md:p-8 md:pb-8">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
