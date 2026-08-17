/**
 * Espejo en hex de los tokens OKLCH de src/app/globals.css.
 *
 * Existe porque Mapbox GL usa su propio parser de color y no entiende oklch().
 * Si cambias un valor aquí, cámbialo también en globals.css (y al revés).
 */

export const MARCA = {
  mezquite: "#2E5A3E",
  maiz: "#E0A526",
  hueso: "#FAF7F0",
  tinta: "#22201B",
  adobe: "#E5DDCC",
} as const;

export type ClaveSemaforo = "ocupado" | "descansando" | "listo" | "sinDatos";

export const SEMAFORO: Record<ClaveSemaforo, { hex: string; etiqueta: string }> = {
  listo: { hex: "#4C8B4F", etiqueta: "Listo" },
  descansando: { hex: "#E0A526", etiqueta: "Descansando" },
  ocupado: { hex: "#C4622D", etiqueta: "Ocupado" },
  sinDatos: { hex: "#A79E8C", etiqueta: "Sin datos" },
};

/** Paleta categórica de gráficas: pasto, maíz, terracota, cielo, ciruela. */
export const GRAFICAS_HEX = [
  "#4B8B5A",
  "#E0A626",
  "#C2612D",
  "#458FB7",
  "#8A5578",
] as const;
