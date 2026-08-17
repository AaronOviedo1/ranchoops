import { requireRancho } from "@/lib/auth";
import { BottomNav, SidebarNav } from "@/components/navegacion";
import { cerrarSesion } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rancho = await requireRancho();

  return (
    <div className="flex min-h-screen">
      <SidebarNav nombreRancho={rancho.nombre} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:justify-end">
          <div className="flex items-center gap-2 md:hidden">
            <span>🐄</span>
            <span className="text-sm font-semibold">{rancho.nombre}</span>
          </div>
          <form action={cerrarSesion}>
            <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </form>
        </header>
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
