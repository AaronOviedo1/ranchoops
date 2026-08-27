import { CalendarClock } from "lucide-react";
import { Aviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { etiquetaClase } from "@/lib/catalogos";
import { edadTexto } from "@/lib/ciclo-vida";
import { reclasificarPorEdad } from "./acciones";

type Pendiente = {
  animal: { id: string; arete_control?: string | null; clase: string; fecha_nacimiento: string | null };
  sugerida: string;
};

/**
 * "Le puedo agregar una condicional y que solita se cambie de estatus" — sí,
 * pero se pregunta antes: la app enseña a quiénes les toca y el ganadero
 * decide. Nada cambia por su cuenta.
 */
export function AvisoReclasificar({ pendientes }: { pendientes: Pendiente[] }) {
  return (
    <Aviso tono="alerta" icono={CalendarClock} className="mb-4">
      <form action={reclasificarPorEdad} className="space-y-2">
        <p>
          <strong>{pendientes.length}</strong>{" "}
          {pendientes.length === 1 ? "animal ya debería cambiar" : "animales ya deberían cambiar"}{" "}
          de clase por su edad.
        </p>

        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver cuáles
          </summary>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {pendientes.map(({ animal, sugerida }) => (
              <li key={animal.id} className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">#{animal.arete_control ?? "s/n"}</span>
                <span className="text-muted-foreground">
                  {edadTexto(animal.fecha_nacimiento)} ·
                </span>
                <span>{etiquetaClase(animal.clase)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{etiquetaClase(sugerida)}</span>
              </li>
            ))}
          </ul>
        </details>

        {pendientes.map(({ animal }) => (
          <input key={animal.id} type="hidden" name="animal_id" value={animal.id} />
        ))}
        <Button type="submit" size="sm" variant="secondary">
          Actualizar {pendientes.length === 1 ? "el animal" : `los ${pendientes.length}`}
        </Button>
      </form>
    </Aviso>
  );
}
