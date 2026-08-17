import { requireRancho } from "@/lib/auth";
import { BottomNav, SidebarNav, TituloSeccion } from "@/components/navegacion";
import { cerrarSesion } from "@/app/(auth)/login/actions";
import { LogoRanchOps } from "@/components/marca";
import { MenuUsuario } from "@/components/menu-usuario";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rancho = await requireRancho();

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav nombreRancho={rancho.nombre}>
        <MenuUsuario nombreRancho={rancho.nombre} cerrarSesion={cerrarSesion} />
      </SidebarNav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <LogoRanchOps variante="duotono" className="size-6 text-primary" />
            <span className="truncate font-heading text-sm font-semibold">
              {rancho.nombre}
            </span>
          </div>
          <TituloSeccion />
          <div className="md:hidden">
            <MenuUsuario
              nombreRancho={rancho.nombre}
              cerrarSesion={cerrarSesion}
            />
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
