import { LogOut } from "lucide-react";
import { cerrarSesion } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

/**
 * Cerrar sesión, siempre a la vista.
 *
 * Es un form con server action, no un item de menú: no depende de que un
 * popup siga montado al hacer clic.
 */
export function BotonSalir({
  variante = "completo",
  className,
}: {
  /** "completo" muestra la etiqueta; "icono" solo el símbolo (headers estrechos). */
  variante?: "completo" | "icono";
  className?: string;
}) {
  return (
    <form action={cerrarSesion} className={className}>
      {variante === "icono" ? (
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          aria-label="Cerrar sesión"
          className="text-muted-foreground"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      ) : (
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="w-full justify-start text-muted-foreground"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
      )}
    </form>
  );
}
