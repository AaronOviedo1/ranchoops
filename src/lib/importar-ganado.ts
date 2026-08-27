// Qué significa cada columna del CSV y cómo se traduce a un animal.
//
// El archivo puede venir del Excel del rancho, de otro programa o de una
// exportación en inglés. Aquí se adivina a qué campo va cada columna y se
// normaliza lo que trae adentro ("HEMBRA" → "H", "12/03/2024" → "2024-03-12").

import { normalizar } from "@/lib/csv";
import {
  CLASES_ANIMAL,
  COLORES_PELAJE,
  ESPECIES,
  especieDeClase,
  normalizarReproductivo,
} from "@/lib/catalogos";
import { RAZAS } from "@/lib/razas";

export type CampoImportable =
  | "arete_control"
  | "siniga"
  | "nombre"
  | "sexo"
  | "especie"
  | "clase"
  | "raza"
  | "color_pelaje"
  | "fecha_nacimiento"
  | "peso_nacimiento"
  | "peso_destete"
  | "fecha_destete"
  | "procedencia"
  | "status_reproductivo"
  | "grupo"
  | "division"
  | "notas";

export const CAMPOS: { valor: CampoImportable; etiqueta: string; alias: string[] }[] = [
  {
    valor: "arete_control",
    etiqueta: "Arete control",
    alias: ["arete", "arete control", "arete de control", "numero", "no", "num", "id", "tag", "vid", "identificador", "caravana"],
  },
  {
    valor: "siniga",
    etiqueta: "Arete SINIIGA",
    alias: ["siniga", "siniiga", "arete siniiga", "arete siniga", "eid", "rfid", "arete electronico"],
  },
  { valor: "nombre", etiqueta: "Nombre", alias: ["nombre", "name", "alias"] },
  { valor: "sexo", etiqueta: "Sexo", alias: ["sexo", "sex", "genero", "gender"] },
  { valor: "especie", etiqueta: "Especie", alias: ["especie", "species"] },
  {
    valor: "clase",
    etiqueta: "Clase",
    alias: ["clase", "categoria", "tipo", "class", "category", "tipo de animal"],
  },
  { valor: "raza", etiqueta: "Raza", alias: ["raza", "breed"] },
  {
    valor: "color_pelaje",
    etiqueta: "Color de pelaje",
    alias: ["color", "color de pelaje", "pelaje", "capa", "colour", "coat"],
  },
  {
    valor: "fecha_nacimiento",
    etiqueta: "Fecha de nacimiento",
    alias: ["fecha de nacimiento", "nacimiento", "f nacimiento", "fecha nac", "dob", "birth date", "date of birth", "nacio"],
  },
  {
    valor: "peso_nacimiento",
    etiqueta: "Peso al nacer",
    alias: ["peso al nacer", "peso nacimiento", "peso nac", "birth weight", "kg al nacer"],
  },
  {
    valor: "peso_destete",
    etiqueta: "Peso al destete",
    alias: ["peso al destete", "peso destete", "weaning weight", "kg al destete"],
  },
  {
    valor: "fecha_destete",
    etiqueta: "Fecha de destete",
    alias: ["fecha de destete", "destete", "f destete", "weaning date"],
  },
  {
    valor: "procedencia",
    etiqueta: "Procedencia",
    alias: ["procedencia", "origen", "rancho de origen", "proveedor", "origin", "source"],
  },
  {
    valor: "status_reproductivo",
    etiqueta: "Estado reproductivo",
    alias: ["estado reproductivo", "status reproductivo", "reproductivo", "gestacion", "prenez", "estado"],
  },
  { valor: "grupo", etiqueta: "Grupo", alias: ["grupo", "lote", "hato", "group", "mob"] },
  {
    valor: "division",
    etiqueta: "División",
    alias: ["division", "seccion", "sistema productivo", "enterprise"],
  },
  {
    valor: "notas",
    etiqueta: "Notas",
    alias: ["notas", "nota", "observaciones", "obs", "comentarios", "notes", "comments"],
  },
];

/**
 * A qué campo apunta cada encabezado del archivo. `null` = no se importa.
 *
 * Primero busca el alias exacto y luego uno contenido, para que "Fecha de
 * nacimiento (dd/mm)" siga cayendo en su lugar. Ningún campo se asigna dos
 * veces: si dos columnas se llaman parecido, gana la primera.
 */
export function adivinarColumnas(encabezados: string[]): (CampoImportable | null)[] {
  const usados = new Set<CampoImportable>();

  const buscar = (encabezado: string): CampoImportable | null => {
    const h = normalizar(encabezado);
    if (!h) return null;

    for (const campo of CAMPOS) {
      if (usados.has(campo.valor)) continue;
      if (campo.alias.some((a) => normalizar(a) === h)) return campo.valor;
    }
    for (const campo of CAMPOS) {
      if (usados.has(campo.valor)) continue;
      if (campo.alias.some((a) => h.includes(normalizar(a)))) return campo.valor;
    }
    return null;
  };

  return encabezados.map((e) => {
    const campo = buscar(e);
    if (campo) usados.add(campo);
    return campo;
  });
}

// ============================================================
// Normalización de valores
// ============================================================

export function leerSexo(valor: string): "H" | "M" | null {
  const v = normalizar(valor);
  if (!v) return null;
  if (["h", "hembra", "f", "female", "hem", "vaca"].includes(v)) return "H";
  if (["m", "macho", "male", "mac", "toro"].includes(v)) return "M";
  return null;
}

/** Acepta el valor del catálogo o su etiqueta ("Vaquilla", "vaquilla"). */
export function leerClase(valor: string): string | null {
  const v = normalizar(valor);
  if (!v) return null;
  return (
    CLASES_ANIMAL.find((c) => normalizar(c.valor) === v)?.valor ??
    CLASES_ANIMAL.find((c) => normalizar(c.etiqueta) === v)?.valor ??
    CLASES_ANIMAL.find((c) => normalizar(c.plural) === v)?.valor ??
    null
  );
}

export function leerEspecie(valor: string): string | null {
  const v = normalizar(valor);
  if (!v) return null;
  return (
    ESPECIES.find((e) => normalizar(e.valor) === v)?.valor ??
    ESPECIES.find((e) => normalizar(e.etiqueta) === v)?.valor ??
    ESPECIES.find((e) => normalizar(e.plural) === v)?.valor ??
    null
  );
}

/** Devuelve el nombre del catálogo si coincide; si no, lo capturado tal cual. */
export function leerRaza(valor: string): string | null {
  const v = normalizar(valor);
  if (!v) return null;
  return RAZAS.find((r) => normalizar(r.nombre) === v)?.nombre ?? valor.trim();
}

export function leerColor(valor: string): string | null {
  const v = normalizar(valor);
  if (!v) return null;
  return (
    COLORES_PELAJE.find((c) => normalizar(c.valor) === v)?.valor ??
    COLORES_PELAJE.find((c) => c.busqueda.split(" ").includes(v))?.valor ??
    valor.trim()
  );
}

/**
 * Números en cualquiera de los dos formatos que escupe Excel según el idioma
 * del equipo: "1,234.5" y "1.234,5".
 *
 * La coma es ambigua. Se resuelve por lo que la sigue: con tres dígitos justos
 * al final es separador de miles ("1,234" son mil doscientos treinta y cuatro);
 * con uno o dos, es el decimal ("38,5" son 38 kilos y medio).
 */
export function leerNumero(valor: string): number | null {
  if (!valor) return null;
  const limpio = valor.replace(/\s|kgs?/gi, "");
  if (!limpio) return null;

  const comaDecimal =
    /,\d{1,2}$/.test(limpio) || /^\d{1,3}(\.\d{3})+,\d+$/.test(limpio);
  const n = Number(
    comaDecimal ? limpio.replace(/\./g, "").replace(",", ".") : limpio.replace(/,/g, "")
  );
  return Number.isFinite(n) ? n : null;
}

/**
 * Fechas a "YYYY-MM-DD".
 *
 * Con barras se asume día primero, que es como se escribe aquí: 03/12/2024 es
 * el 3 de diciembre. Solo cuando el primer número pasa de 12 se invierte.
 */
export function leerFecha(valor: string): string | null {
  const v = valor.trim();
  if (!v) return null;

  const iso = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return armar(iso[1], iso[2], iso[3]);

  const partes = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (partes) {
    let [, a, b, anio] = partes;
    if (Number(a) > 12) {
      // día/mes
    } else if (Number(b) > 12) {
      [a, b] = [b, a];
    }
    if (anio.length === 2) anio = Number(anio) > 50 ? `19${anio}` : `20${anio}`;
    return armar(anio, b, a);
  }

  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    return armar(String(d.getFullYear()), String(d.getMonth() + 1), String(d.getDate()));
  }
  return null;
}

function armar(anio: string, mes: string, dia: string): string | null {
  const a = Number(anio);
  const m = Number(mes);
  const d = Number(dia);
  if (!a || m < 1 || m > 12 || d < 1) return null;

  // Que el día exista de verdad: el 31 de febrero no es una fecha.
  const fecha = new Date(a, m - 1, d);
  if (fecha.getFullYear() !== a || fecha.getMonth() !== m - 1 || fecha.getDate() !== d) {
    return null;
  }
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export type FilaImportada = {
  /** Número de renglón del archivo, para poder señalarlo. */
  linea: number;
  arete_control: string | null;
  siniga: string | null;
  nombre: string | null;
  sexo: "H" | "M" | null;
  especie: string;
  clase: string;
  raza: string | null;
  color_pelaje: string | null;
  fecha_nacimiento: string | null;
  peso_nacimiento: number | null;
  peso_destete: number | null;
  fecha_destete: string | null;
  procedencia: string | null;
  status_reproductivo: string | null;
  /** Nombre tal como viene en el archivo; se resuelve a id al importar. */
  grupo: string | null;
  division: string | null;
  notas: string | null;
  /** Lo que no se pudo entender de este renglón. */
  avisos: string[];
};

/**
 * Arma un animal por renglón, con la clase y la especie ya resueltas.
 *
 * Nunca falla: lo que no se entiende se anota en `avisos` y se deja vacío,
 * para que el rancho decida si lo importa así o corrige el archivo.
 */
export function armarFilas(
  filas: string[][],
  columnas: (CampoImportable | null)[],
  claseFallback: string
): FilaImportada[] {
  return filas.map((celdas, i) => {
    const avisos: string[] = [];
    const valor = (campo: CampoImportable): string => {
      const idx = columnas.indexOf(campo);
      return idx === -1 ? "" : (celdas[idx] ?? "").trim();
    };

    const textoClase = valor("clase");
    let clase = leerClase(textoClase);
    if (textoClase && !clase) {
      avisos.push(`No se reconoce la clase "${textoClase}"`);
    }

    const textoSexo = valor("sexo");
    const sexo = leerSexo(textoSexo);
    if (textoSexo && !sexo) avisos.push(`No se reconoce el sexo "${textoSexo}"`);

    // Sin clase en el archivo se usa la que eligió el rancho para todo el lote.
    if (!clase) clase = claseFallback;

    const textoEspecie = valor("especie");
    const especie = leerEspecie(textoEspecie) ?? especieDeClase(clase);
    if (textoEspecie && !leerEspecie(textoEspecie)) {
      avisos.push(`No se reconoce la especie "${textoEspecie}"`);
    }

    const fecha = (campo: CampoImportable, etiqueta: string) => {
      const bruto = valor(campo);
      const leida = leerFecha(bruto);
      if (bruto && !leida) avisos.push(`No se entiende la ${etiqueta} "${bruto}"`);
      return leida;
    };

    return {
      linea: i + 2, // +1 por el encabezado, +1 porque los renglones cuentan desde 1
      arete_control: valor("arete_control") || null,
      siniga: valor("siniga").replace(/\s/g, "") || null,
      nombre: valor("nombre") || null,
      sexo,
      especie,
      clase,
      raza: leerRaza(valor("raza")),
      color_pelaje: leerColor(valor("color_pelaje")),
      fecha_nacimiento: fecha("fecha_nacimiento", "fecha de nacimiento"),
      peso_nacimiento: leerNumero(valor("peso_nacimiento")),
      peso_destete: leerNumero(valor("peso_destete")),
      fecha_destete: fecha("fecha_destete", "fecha de destete"),
      procedencia: valor("procedencia") || null,
      status_reproductivo: normalizarReproductivo(valor("status_reproductivo")),
      grupo: valor("grupo") || null,
      division: valor("division") || null,
      notas: valor("notas") || null,
      avisos,
    };
  });
}
