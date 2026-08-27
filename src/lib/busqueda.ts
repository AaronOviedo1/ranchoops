// Búsqueda de texto contra PostgREST.
//
// Dos cosas rompían el buscador del ganado:
//   1. Comas y paréntesis en la consulta rompen el parseo de `.or(...)`.
//   2. El SINIIGA se lee del arete con espacios ("65 902") pero se guarda
//      sin ellos, así que la coincidencia literal nunca daba.

/** Variantes por las que vale la pena buscar: lo tecleado y lo tecleado sin espacios. */
export function terminosBusqueda(q: string): string[] {
  const limpio = q.replace(/[,()"'\\%*]/g, " ").replace(/\s+/g, " ").trim();
  if (!limpio) return [];
  const sinEspacios = limpio.replace(/\s/g, "");
  return [...new Set([limpio, sinEspacios])];
}

/** Arma el filtro `or` de PostgREST: cada término contra cada columna. */
export function filtroOr(columnas: string[], terminos: string[]): string {
  return terminos
    .flatMap((t) => columnas.map((c) => `${c}.ilike.%${t}%`))
    .join(",");
}

/**
 * Orden natural para aretes: "2" antes que "10" (el orden de texto de la base
 * los deja como 1, 10, 100, 11…).
 */
export function comparaArete(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  if (!a) return b ? 1 : 0;
  if (!b) return -1;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, "es", { numeric: true });
}
