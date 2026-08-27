// Cómo cambia de clase un animal conforme cumple años.
//
// Regla de la junta, para bovinos:
//   antes del año  → becerro / becerra
//   al año         → vaquilla (H) · novillo (M castrado) · torete (M entero)
//   a los 3 años   → vaca (H) · toro (M entero); el castrado sigue de novillo
//
// El sistema NUNCA cambia la clase solo: la sugiere y alguien confirma.

import { claseAnimal, type Especie } from "@/lib/catalogos";
import { alMediodia, fechaHoy } from "@/lib/fechas";

/** Escalera de clases por especie: cría → año → adulto. */
const ESCALERA: Partial<
  Record<
    Especie,
    { cria: { H: string; M: string }; anio: { H: string; M: string }; adulto: { H: string; M: string } }
  >
> = {
  bovino: {
    cria: { H: "becerra", M: "becerro" },
    anio: { H: "vaquilla", M: "torete" },
    adulto: { H: "vaca", M: "toro" },
  },
  equino: {
    cria: { H: "potranca", M: "potro" },
    anio: { H: "yegua", M: "garanon" },
    adulto: { H: "yegua", M: "garanon" },
  },
  ovino: {
    cria: { H: "cordera", M: "cordero" },
    anio: { H: "borrega", M: "borrego" },
    adulto: { H: "borrega", M: "borrego" },
  },
  caprino: {
    cria: { H: "cabrita", M: "cabrito" },
    anio: { H: "chiva", M: "chivo" },
    adulto: { H: "chiva", M: "chivo" },
  },
  cervido: {
    cria: { H: "cervatillo", M: "cervatillo" },
    anio: { H: "cierva", M: "venado" },
    adulto: { H: "cierva", M: "venado" },
  },
  asnal: {
    cria: { H: "burrito", M: "burrito" },
    anio: { H: "burra", M: "burro" },
    adulto: { H: "burra", M: "burro" },
  },
};

/** Clases de machos castrados: nunca ascienden a semental. */
const CASTRADOS = new Set(["novillo", "capon"]);

export function mesesDeEdad(
  fechaNacimiento: string | null | undefined,
  hasta: Date = alMediodia(fechaHoy())
): number | null {
  if (!fechaNacimiento) return null;
  const n = alMediodia(fechaNacimiento);
  if (Number.isNaN(n.getTime())) return null;
  const meses =
    (hasta.getFullYear() - n.getFullYear()) * 12 + (hasta.getMonth() - n.getMonth());
  return hasta.getDate() < n.getDate() ? meses - 1 : meses;
}

export function edadTexto(fechaNacimiento: string | null | undefined): string {
  const m = mesesDeEdad(fechaNacimiento);
  if (m == null || m < 0) return "—";
  if (m < 24) return `${m} ${m === 1 ? "mes" : "meses"}`;
  const anios = Math.floor(m / 12);
  const resto = m % 12;
  return resto === 0 ? `${anios} años` : `${anios} años ${resto} m`;
}

/**
 * Meses y días completos entre dos fechas "YYYY-MM-DD".
 * null si falta alguna, no se entienden, o la segunda es anterior a la primera.
 */
export function mesesYDias(
  desde: string | null | undefined,
  hasta: string | null | undefined
): { meses: number; dias: number } | null {
  if (!desde || !hasta) return null;
  const a = alMediodia(desde);
  const b = alMediodia(hasta);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return null;

  let meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  let dias = b.getDate() - a.getDate();
  if (dias < 0) {
    meses -= 1;
    // Días del mes que cerró justo antes de `b` (28, 30 o 31 según cuál sea).
    dias += new Date(b.getFullYear(), b.getMonth(), 0).getDate();
  }
  return { meses, dias };
}

/** "6 meses 12 días", "12 días", "6 meses". */
export function mesesYDiasTexto(d: { meses: number; dias: number }): string {
  const partes = [];
  if (d.meses > 0) partes.push(`${d.meses} ${d.meses === 1 ? "mes" : "meses"}`);
  if (d.dias > 0 || d.meses === 0) partes.push(`${d.dias} ${d.dias === 1 ? "día" : "días"}`);
  return partes.join(" ");
}

/**
 * Qué clase le tocaría hoy a este animal. Devuelve null cuando no se puede
 * saber (sin fecha de nacimiento, sin sexo, o especie sin escalera).
 */
export function claseSugerida(animal: {
  especie: string;
  clase: string;
  sexo: "H" | "M" | null;
  fecha_nacimiento: string | null;
}): string | null {
  // Un castrado se queda donde está: la edad no lo vuelve semental.
  if (CASTRADOS.has(animal.clase)) return null;

  const escalera = ESCALERA[animal.especie as Especie];
  if (!escalera) return null;

  // Si la clase actual ya implica un sexo, ese manda sobre el campo vacío.
  const sexo = animal.sexo ?? claseAnimal(animal.clase)?.sexo ?? null;
  if (!sexo) return null;

  const meses = mesesDeEdad(animal.fecha_nacimiento);
  if (meses == null || meses < 0) return null;

  const etapa = meses < 12 ? "cria" : meses < 36 ? "anio" : "adulto";
  return escalera[etapa][sexo];
}

/** Animales cuya clase ya no corresponde a su edad. */
export function paraReclasificar<
  T extends { especie: string; clase: string; sexo: "H" | "M" | null; fecha_nacimiento: string | null }
>(animales: T[]): { animal: T; sugerida: string }[] {
  return animales.flatMap((a) => {
    const sugerida = claseSugerida(a);
    return sugerida && sugerida !== a.clase ? [{ animal: a, sugerida }] : [];
  });
}
