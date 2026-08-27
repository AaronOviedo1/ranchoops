// Pesos y ganancia diaria.
//
// No hay columna de peso en `animales`: el peso vive en los eventos de pesaje
// (`evento_animales.valores.peso`). Estas funciones leen ese historial.
//
// "8 meses tantos días… el peso que al día supuestamente gana .5 kilos" — la
// ganancia diaria (GDP) es lo que se mira en la báscula para decidir si un
// animal se queda o se va.

import { alMediodia } from "@/lib/fechas";

export type Pesaje = { fecha: string; peso: number };

export function diasEntre(desde: string, hasta: string): number {
  return Math.round(
    (alMediodia(hasta).getTime() - alMediodia(desde).getTime()) / 86_400_000
  );
}

/** El pesaje más reciente, o null si nunca se ha pesado. */
export function ultimoPeso(pesajes: Pesaje[]): Pesaje | null {
  if (pesajes.length === 0) return null;
  return [...pesajes].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
}

/**
 * Ganancia diaria (kg/día) entre dos pesajes. Devuelve null si no hay con qué
 * comparar o si los pesajes son del mismo día.
 */
export function gananciaDiaria(anterior: Pesaje | null, actual: Pesaje): number | null {
  if (!anterior) return null;
  const dias = diasEntre(anterior.fecha, actual.fecha);
  if (dias <= 0) return null;
  return (actual.peso - anterior.peso) / dias;
}

/**
 * GDP desde el nacimiento: sirve cuando es el primer pesaje y solo tenemos el
 * peso al nacer (nacen de 40 kg y se destetan de 200).
 */
export function gananciaDesdeNacimiento(
  animal: { fecha_nacimiento: string | null; peso_nacimiento: number | null },
  actual: Pesaje
): number | null {
  if (!animal.fecha_nacimiento || animal.peso_nacimiento == null) return null;
  return gananciaDiaria(
    { fecha: animal.fecha_nacimiento, peso: animal.peso_nacimiento },
    actual
  );
}

export function formatoGdp(gdp: number | null | undefined): string {
  if (gdp == null) return "—";
  const signo = gdp > 0 ? "+" : "";
  return `${signo}${gdp.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg/día`;
}
