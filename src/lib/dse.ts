// Equivalencias DSE (Dry Sheep Equivalent).
//
// Un DSE es lo que come una oveja seca en un día. Todo lo demás se mide
// contra ella: una vaca son 12.6 ovejas, un toro 19.1. Así la carga de un
// potrero cabe en un solo número aunque adentro haya ganado revuelto.
//
// La UA (unidad animal mexicana) vive junto: una vaca adulta de ~450 kg
// con su cría al pie. Es la unidad en la que se habla el agostadero en
// Sonora ("tantas hectáreas por UA"), así que la interfaz enseña UA y el
// DSE se queda para el export y la compatibilidad.
//
// Espejo de la tabla `categorias_dse` (migraciones 0006_dse y
// 0009_carga_animal).
// El catálogo es más fino que las clases de la app: separa castrados,
// espayadas y destetados. Cuando el animal no tiene categoría asignada,
// `claseDefault` dice qué equivalencia le toca por su clase.

import type { Especie } from "@/lib/catalogos";

export type CategoriaDSE = {
  valor: string;
  etiqueta: string;
  dse: number;
  /** Unidades animal (1 UA = vaca de ~450 kg; la cría al pie va en 0). */
  ua: number;
  sexo?: "H" | "M";
  /** Clase de la app que cae en esta categoría por default. */
  claseDefault?: string;
};

export const CATEGORIAS_DSE: Partial<Record<Especie, CategoriaDSE[]>> = {
  bovino: [
    { valor: "ternero", etiqueta: "Ternero", dse: 1.91, ua: 0, sexo: "M", claseDefault: "becerro" },
    { valor: "ternera", etiqueta: "Ternera", dse: 1.91, ua: 0, sexo: "H", claseDefault: "becerra" },
    { valor: "ternero_novillo", etiqueta: "Ternero novillo", dse: 1.91, ua: 0, sexo: "M" },
    { valor: "ternero_toro", etiqueta: "Ternero toro", dse: 5, ua: 0.3, sexo: "M" },
    { valor: "destetado", etiqueta: "Destetado", dse: 4.39, ua: 0.6, sexo: "M" },
    { valor: "ternera_destetada", etiqueta: "Ternera destetada", dse: 4.39, ua: 0.6, sexo: "H" },
    { valor: "ternera_espayada_destetada", etiqueta: "Ternera espayada destetada", dse: 4.39, ua: 0.6, sexo: "H" },
    { valor: "destetado_novillo", etiqueta: "Destetado novillo", dse: 4.39, ua: 0.6, sexo: "M" },
    { valor: "destetado_toro", etiqueta: "Destetado toro", dse: 9.1, ua: 0.7, sexo: "M", claseDefault: "torete" },
    { valor: "anial", etiqueta: "Añal", dse: 9.55, ua: 0.7 },
    { valor: "vaquillona", etiqueta: "Vaquillona", dse: 9.55, ua: 0.7, sexo: "H", claseDefault: "vaquilla" },
    { valor: "vaquillona_espayada", etiqueta: "Vaquillona espayada", dse: 9.55, ua: 0.7, sexo: "H" },
    { valor: "vaca", etiqueta: "Vaca", dse: 12.6, ua: 1, sexo: "H", claseDefault: "vaca" },
    { valor: "vaca_espayada", etiqueta: "Vaca espayada", dse: 9.55, ua: 1, sexo: "H" },
    { valor: "novillo", etiqueta: "Novillo", dse: 9.55, ua: 0.7, sexo: "M", claseDefault: "novillo" },
    { valor: "toro", etiqueta: "Toro", dse: 19.1, ua: 1.25, sexo: "M", claseDefault: "toro" },
  ],
  ovino: [
    // Los corderos van en 0: todavía comen a través de la madre.
    { valor: "cordero", etiqueta: "Cordero", dse: 0, ua: 0, sexo: "M", claseDefault: "cordero" },
    { valor: "cordera", etiqueta: "Cordera", dse: 0, ua: 0, sexo: "H", claseDefault: "cordera" },
    { valor: "cordero_carnero", etiqueta: "Cordero carnero", dse: 0, ua: 0, sexo: "M" },
    { valor: "cordero_capon", etiqueta: "Cordero capón", dse: 0, ua: 0, sexo: "M" },
    { valor: "destetado", etiqueta: "Destetado", dse: 1.1, ua: 0.15, sexo: "M" },
    { valor: "destetada_hembra", etiqueta: "Destetada hembra", dse: 1.1, ua: 0.15, sexo: "H" },
    { valor: "destetado_carnero", etiqueta: "Destetado carnero", dse: 1.1, ua: 0.15, sexo: "M" },
    { valor: "destetado_capon", etiqueta: "Destetado capón", dse: 1.1, ua: 0.15, sexo: "M" },
    { valor: "borreguillo", etiqueta: "Borreguillo", dse: 1, ua: 0.2, sexo: "M" },
    { valor: "borreguilla", etiqueta: "Borreguilla", dse: 1, ua: 0.2, sexo: "H" },
    { valor: "borreguillo_carnero", etiqueta: "Borreguillo carnero", dse: 1, ua: 0.2, sexo: "M" },
    { valor: "borreguillo_capon", etiqueta: "Borreguillo capón", dse: 1, ua: 0.2, sexo: "M" },
    { valor: "oveja_borreguilla", etiqueta: "Oveja borreguilla", dse: 1, ua: 0.2, sexo: "H" },
    { valor: "oveja", etiqueta: "Oveja", dse: 1, ua: 0.2, sexo: "H", claseDefault: "borrega" },
    { valor: "capon", etiqueta: "Capón", dse: 1, ua: 0.2, sexo: "M" },
    { valor: "carnero", etiqueta: "Carnero", dse: 3.4, ua: 0.25, sexo: "M", claseDefault: "borrego" },
  ],
};

export function categoriasDSE(especie: string): CategoriaDSE[] {
  return CATEGORIAS_DSE[especie as Especie] ?? [];
}

export function categoriaDSE(especie: string, valor: string | null | undefined): CategoriaDSE | undefined {
  if (!valor) return undefined;
  return categoriasDSE(especie).find((c) => c.valor === valor);
}

/** Categoría que le toca a una clase de la app cuando nadie la asignó a mano. */
export function categoriaPorClase(especie: string, clase: string): CategoriaDSE | undefined {
  return categoriasDSE(especie).find((c) => c.claseDefault === clase);
}

/**
 * DSE que consume un animal: el de su categoría si la tiene, si no el de su
 * clase. 0 en las especies sin tabla (equinos, venados: no están en el DSE).
 */
export function dseAnimal(animal: {
  especie: string;
  clase: string;
  categoria_dse?: string | null;
}): number {
  const categoria =
    categoriaDSE(animal.especie, animal.categoria_dse) ??
    categoriaPorClase(animal.especie, animal.clase);
  return categoria?.dse ?? 0;
}

/** Carga total de un hato en DSE. */
export function dseTotal(
  animales: { especie: string; clase: string; categoria_dse?: string | null }[]
): number {
  return animales.reduce((suma, a) => suma + dseAnimal(a), 0);
}

/** Peso de referencia de 1 UA (vaca adulta), en kilos. */
export const UA_REFERENCIA_KG = 450;

/**
 * UA que consume un animal: las de su categoría si la tiene, si no las de su
 * clase. 0 en las especies sin tabla (equinos, venados) y en las crías al pie.
 */
export function uaAnimal(animal: {
  especie: string;
  clase: string;
  categoria_dse?: string | null;
}): number {
  const categoria =
    categoriaDSE(animal.especie, animal.categoria_dse) ??
    categoriaPorClase(animal.especie, animal.clase);
  return categoria?.ua ?? 0;
}

/** Carga total de un hato en UA. */
export function uaTotal(
  animales: { especie: string; clase: string; categoria_dse?: string | null }[]
): number {
  return animales.reduce((suma, a) => suma + uaAnimal(a), 0);
}
