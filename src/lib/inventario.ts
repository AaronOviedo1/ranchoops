import { alMediodia, fechaHoy } from "@/lib/fechas";

export type EntradaConCaducidad = { fecha: string; cantidad: number; caducidad: string };

/**
 * La caducidad más cercana de lo que queda en la bodega.
 *
 * Es una estimación: las salidas no registran de qué lote salió el producto,
 * así que se supone que lo primero que entra es lo primero que sale. Lo que
 * queda son las entradas más recientes, hasta cubrir la existencia; de esas,
 * la que vence antes.
 */
export function caducidadProxima(
  entradas: EntradaConCaducidad[],
  existencia: number
): string | null {
  if (!(existencia > 0)) return null;
  const recientes = [...entradas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  let cubierto = 0;
  let proxima: string | null = null;
  for (const e of recientes) {
    if (cubierto >= existencia) break;
    cubierto += e.cantidad;
    if (!proxima || e.caducidad < proxima) proxima = e.caducidad;
  }
  return proxima;
}

/** A partir de cuántos días se avisa que un producto está por vencer. */
export const DIAS_POR_VENCER = 60;

export function estadoCaducidad(
  caducidad: string | null,
  hoy: string = fechaHoy()
): "vencido" | "por_vencer" | null {
  if (!caducidad) return null;
  if (caducidad < hoy) return "vencido";
  const dias = (alMediodia(caducidad).getTime() - alMediodia(hoy).getTime()) / 86_400_000;
  return dias <= DIAS_POR_VENCER ? "por_vencer" : null;
}
