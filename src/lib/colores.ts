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
  // Verde claro: ni el gris arena de la marca ni el azul pizarra se veían
  // sobre la foto satelital del desierto, y el mezquite quedaba muy apagado.
  // Es más claro y más amarillento que el verde de "listo" para que los dos
  // se sigan distinguiendo.
  sinDatos: { hex: "#8CC06B", etiqueta: "Sin datos" },
};

/** Paleta categórica de gráficas: pasto, maíz, terracota, cielo, ciruela. */
export const GRAFICAS_HEX = [
  "#4B8B5A",
  "#E0A626",
  "#C2612D",
  "#458FB7",
  "#8A5578",
] as const;

/**
 * Color de cada cosa que se dibuja en el mapa además de los potreros:
 * corrales, feedlot, área agrícola, tubería… El semáforo es solo para
 * potreros, así que estos van por tipo, no por estado.
 */
export const MAPA_HEX: Record<string, string> = {
  // Manejo y construcciones
  corral: "#C2612D",
  manga: "#C2612D",
  feedlot: "#8A5578",
  construccion: "#C2612D",
  deposito_quimicos: "#8A5578",
  henera: "#C2612D",
  silo: "#C2612D",
  // Agua
  bebedero: "#458FB7",
  pila: "#458FB7",
  tanque: "#458FB7",
  pozo: "#458FB7",
  perforacion: "#458FB7",
  papalote: "#458FB7",
  tuberia: "#458FB7",
  drenaje: "#458FB7",
  canal_agua: "#458FB7",
  bomba: "#458FB7",
  bomba_solar: "#458FB7",
  llave_agua: "#458FB7",
  laguna: "#2E7D8B",
  cuerpo_agua: "#2E7D8B",
  // Vegetación y suelo
  agricola: "#4B8B5A",
  pivote: "#4B8B5A",
  humedal: "#2E7D8B",
  erosion: "#A0522D",
  maleza: "#6E7F4B",
  // Alimento y energía
  comedero: "#E0A626",
  bloque_mineral: "#E0A626",
  panel_solar: "#E0A626",
  generador: "#E0A626",
  cerco_electrico: "#E0A626",
  linea_electrica: "#E0A626",
  // Peligros: el rojo se reserva para lo que puede matar un animal.
  cebo: "#B3402B",
  fosa_mortandad: "#B3402B",
  peligro: "#B3402B",
  area_peligro: "#B3402B",
  botiquin: "#B3402B",
  // Accesos
  camino: "#A79E8C",
  cerco: "#A79E8C",
  tranquera: "#A79E8C",
  otro: "#A79E8C",
};

export function colorMapa(tipo: string): string {
  return MAPA_HEX[tipo] ?? MAPA_HEX.otro;
}
