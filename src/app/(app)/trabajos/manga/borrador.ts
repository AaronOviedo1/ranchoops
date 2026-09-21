import { useMemo, useSyncExternalStore } from "react";
import type { EstadoJornada } from "./estado";

// La jornada vive en el teléfono hasta que se cierra: en el corral la señal va
// y viene, y un recargado no puede tirar doscientos animales ya capturados.
// Igual que el menú colapsado (navegacion.tsx), el dato vive en localStorage y
// React solo lo lee.

const clave = (ranchoId: string) => `manga:borrador:v1:${ranchoId}`;

const oyentes = new Set<() => void>();

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

function leer(ranchoId: string): string | null {
  try {
    return localStorage.getItem(clave(ranchoId));
  } catch {
    return null;
  }
}

export function guardarBorrador(ranchoId: string, estado: EstadoJornada | null) {
  try {
    if (estado) localStorage.setItem(clave(ranchoId), JSON.stringify(estado));
    else localStorage.removeItem(clave(ranchoId));
  } catch {
    // Sin espacio o en modo privado: la jornada sigue en pantalla, solo no
    // aguantaría un recargado.
  }
  for (const avisar of oyentes) avisar();
}

function parsear(crudo: string | null): EstadoJornada | null {
  if (!crudo) return null;
  try {
    const estado = JSON.parse(crudo) as EstadoJornada;
    return estado?.version === 1 && Array.isArray(estado.capturados) ? estado : null;
  } catch {
    return null;
  }
}

/**
 * La jornada guardada en este teléfono. `undefined` mientras no se sabe (en el
 * servidor y durante la hidratación), `null` si no hay ninguna.
 */
export function useBorrador(ranchoId: string): EstadoJornada | null | undefined {
  const crudo = useSyncExternalStore(
    suscribir,
    () => leer(ranchoId),
    () => undefined
  );
  return useMemo(() => (crudo === undefined ? undefined : parsear(crudo)), [crudo]);
}
