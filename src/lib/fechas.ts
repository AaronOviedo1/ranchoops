// La fecha "de hoy" en el rancho.
//
// `new Date().toISOString()` da la fecha en UTC: en Sonora (UTC−7) todo lo que
// se capture después de las 5 de la tarde se guardaba con la fecha del día
// siguiente, y en el servidor de producción (que corre en UTC) siempre.
// Aquí la fecha se calcula en la zona del rancho.

export const ZONA_RANCHO = "America/Hermosillo";

const FORMATO = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_RANCHO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Hoy en el rancho, como "YYYY-MM-DD". */
export function fechaHoy(momento: Date = new Date()): string {
  return FORMATO.format(momento);
}

/** Una fecha "YYYY-MM-DD" al mediodía, para comparar sin líos de zona. */
export function alMediodia(fecha: string): Date {
  return new Date(fecha + (fecha.length === 10 ? "T12:00:00" : ""));
}

/** Un Date a "YYYY-MM-DD" con la fecha que se ve en pantalla, no la de UTC. */
export function aISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}
