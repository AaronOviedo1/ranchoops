/**
 * Preferencias de una TablaPro (columnas visibles y agrupación).
 *
 * Viven en una cookie por tabla (`tp_ganado`, `tp_potreros`…) porque las
 * tablas son server components: el servidor la lee con `cookies()` (en
 * tabla-pro.tsx) —el mismo truco que `rancho_activo` en auth.ts— y el
 * cliente la escribe con `document.cookie` + `router.refresh()`.
 *
 * Este módulo no toca next/headers para poder importarse de los dos lados.
 */
export type PreferenciasTabla = {
  /** Claves de columnas visibles; ausente = las visibles por default. */
  c?: string[];
  /** Clave de la columna por la que se agrupa; ausente = sin agrupar. */
  g?: string;
};

export const COOKIE_TABLA = (id: string) => `tp_${id}`;

/** Parsea el valor crudo de la cookie; corrupta o vieja = sin preferencias. */
export function parsearPreferenciasTabla(
  crudo: string | undefined
): PreferenciasTabla {
  try {
    if (!crudo) return {};
    const valor = JSON.parse(decodeURIComponent(crudo));
    return {
      c: Array.isArray(valor.c)
        ? valor.c.filter((x: unknown) => typeof x === "string")
        : undefined,
      g: typeof valor.g === "string" && valor.g ? valor.g : undefined,
    };
  } catch {
    return {};
  }
}
