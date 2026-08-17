// Estados del dominio traducidos a tono visual. Sin JSX: lo consumen
// tanto los componentes de React como el mapa (que necesita hex).

import type { AnimalStatus } from "@/lib/tipos";
import type { ClaveSemaforo } from "@/lib/colores";

export type Tono = "exito" | "alerta" | "peligro" | "neutro" | "info" | "marca";

const ANIMAL: Record<AnimalStatus, { tono: Tono; etiqueta: string }> = {
  activo: { tono: "exito", etiqueta: "Activo" },
  vendido: { tono: "info", etiqueta: "Vendido" },
  muerto: { tono: "peligro", etiqueta: "Muerto" },
  desecho: { tono: "alerta", etiqueta: "Desecho" },
  transferido: { tono: "neutro", etiqueta: "Transferido" },
};

export function estadoAnimal(status: string): { tono: Tono; etiqueta: string } {
  return ANIMAL[status as AnimalStatus] ?? { tono: "neutro", etiqueta: status };
}

export function estadoPotrero(
  diasDescanso: number | null,
  meta: number,
  ocupado: boolean
): { clave: ClaveSemaforo; tono: Tono; etiqueta: string } {
  if (ocupado) return { clave: "ocupado", tono: "peligro", etiqueta: "Ocupado" };
  if (diasDescanso == null)
    return { clave: "sinDatos", tono: "neutro", etiqueta: "Sin historial" };
  if (diasDescanso >= meta)
    return { clave: "listo", tono: "exito", etiqueta: "Listo" };
  return { clave: "descansando", tono: "alerta", etiqueta: "Descansando" };
}
