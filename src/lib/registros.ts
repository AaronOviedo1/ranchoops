// Catálogo de la sección Registros: la consulta de todo lo capturado,
// organizada en las tres familias que se manejan en el rancho.
//
// Cada tipo agrupa uno o varios `eventos.tipo` (que es texto libre: lo que
// no caiga en ningún grupo se va a la cubeta "Otros"), o lee otra fuente
// (ventas por animal, compras, movimientos de potrero).

export type FamiliaRegistro = "produccion" | "ciclo_vida" | "movimientos";

export const FAMILIAS_REGISTRO: { clave: FamiliaRegistro; etiqueta: string }[] = [
  { clave: "produccion", etiqueta: "Producción" },
  { clave: "ciclo_vida", etiqueta: "Ciclo de vida" },
  { clave: "movimientos", etiqueta: "Movimientos" },
];

export type TipoRegistro = {
  /** Va en la URL: /registros/pesajes */
  slug: string;
  etiqueta: string;
  familia: FamiliaRegistro;
  /** Tipos de evento que caen aquí (fuente `eventos`/`evento_animales`). */
  tiposEvento?: string[];
  /** Fuente distinta de eventos. */
  fuente?: "venta_animales" | "compras" | "grupo_movimientos";
  descripcion: string;
};

export const TIPOS_REGISTRO: TipoRegistro[] = [
  // ── Producción ──
  {
    slug: "pesajes",
    etiqueta: "Pesajes",
    familia: "produccion",
    tiposEvento: ["pesaje"],
    descripcion: "Cada báscula con su GDP contra el pesaje anterior",
  },
  {
    slug: "condicion",
    etiqueta: "Condición corporal",
    familia: "produccion",
    tiposEvento: ["condicion_corporal"],
    descripcion: "Calificaciones de 1 a 5",
  },
  {
    slug: "tratamientos",
    etiqueta: "Tratamientos",
    familia: "produccion",
    tiposEvento: [
      "tratamiento",
      "curacion",
      "vacunacion",
      "desparasitacion",
      "vitaminado",
    ],
    descripcion: "Vacunas, desparasitaciones y curaciones, con su retiro",
  },
  {
    slug: "alimentacion",
    etiqueta: "Alimentación",
    familia: "produccion",
    tiposEvento: ["alimentacion"],
    descripcion: "Suplemento y alimento repartido",
  },
  // ── Ciclo de vida ──
  {
    slug: "nacimientos",
    etiqueta: "Nacimientos",
    familia: "ciclo_vida",
    tiposEvento: ["parto"],
    descripcion: "Partos con madre y cría",
  },
  {
    slug: "destetes",
    etiqueta: "Destetes",
    familia: "ciclo_vida",
    tiposEvento: ["destete"],
    descripcion: "Desahijes con el peso al destete",
  },
  {
    slug: "reproduccion",
    etiqueta: "Palpación y ultrasonido",
    familia: "ciclo_vida",
    tiposEvento: ["palpacion", "ultrasonido"],
    descripcion: "Diagnósticos de gestación con parición estimada",
  },
  {
    slug: "servicios",
    etiqueta: "IA y hormonales",
    familia: "ciclo_vida",
    tiposEvento: ["ia", "colocacion_cidr", "retiro_cidr", "aplicacion_hormonal"],
    descripcion: "Inseminación y protocolos hormonales",
  },
  {
    slug: "identificacion",
    etiqueta: "Aretado y castración",
    familia: "ciclo_vida",
    tiposEvento: ["aretado", "castracion"],
    descripcion: "Identificación y manejo",
  },
  {
    slug: "muertes",
    etiqueta: "Muertes",
    familia: "ciclo_vida",
    tiposEvento: ["muerte"],
    descripcion: "Bajas con su causa",
  },
  // ── Movimientos ──
  {
    slug: "ventas-animal",
    etiqueta: "Ventas por animal",
    familia: "movimientos",
    fuente: "venta_animales",
    descripcion: "Qué animal salió en qué venta",
  },
  {
    slug: "compras",
    etiqueta: "Compras",
    familia: "movimientos",
    fuente: "compras",
    descripcion: "Ganado comprado, por lote",
  },
  {
    slug: "potreros",
    etiqueta: "Movimientos de potrero",
    familia: "movimientos",
    fuente: "grupo_movimientos",
    descripcion: "Entradas y salidas del pastoreo rotacional",
  },
  // ── Cubeta ──
  {
    slug: "otros",
    etiqueta: "Otros trabajos",
    familia: "produccion",
    tiposEvento: ["otro"],
    descripcion: "Lo que no cae en ninguna familia",
  },
];

export function tipoRegistro(slug: string): TipoRegistro | undefined {
  return TIPOS_REGISTRO.find((t) => t.slug === slug);
}

/** Tipos de evento ya repartidos; lo demás cae en "otros". */
export const TIPOS_EVENTO_CONOCIDOS = new Set(
  TIPOS_REGISTRO.flatMap((t) => t.tiposEvento ?? [])
);

/** Análisis del hato: se calculan en src/lib/analisis.ts y tienen ruta propia. */
export const ANALISIS: { slug: string; etiqueta: string; descripcion: string }[] = [
  {
    slug: "madres",
    etiqueta: "Rendimiento de las madres",
    descripcion: "Crías, destetes, eficiencia e intervalo entre partos por vaca",
  },
  {
    slug: "rendimiento",
    etiqueta: "Rendimiento por animal",
    descripcion: "Días en el campo, GDP, peso estimado, costos y resultado",
  },
  {
    slug: "hato",
    etiqueta: "Reconciliación del hato",
    descripcion: "Iniciales + nacimientos + compras − ventas − muertes = cierre",
  },
];
