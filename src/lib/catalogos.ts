// Catálogos del dominio (vocabulario de José Carlos)

export type TipoTrabajo = {
  valor: string;
  etiqueta: string;
  usaProducto: boolean;
  /** Exige foto tomada con la cámara para poder guardar (curaciones, tratamientos). */
  requiereFoto?: boolean;
  /** Captura un valor por animal en vez de uno general. */
  porAnimal?: "peso" | "resultado" | "condicion";
  /** Los `productos.tipo` que suelen usarse aquí: salen primero en el selector. */
  tiposProducto?: string[];
};

export const TIPOS_TRABAJO: TipoTrabajo[] = [
  { valor: "vacunacion", etiqueta: "Vacunación", usaProducto: true, tiposProducto: ["vacuna"] },
  { valor: "desparasitacion", etiqueta: "Desparasitación", usaProducto: true, tiposProducto: ["medicamento"] },
  { valor: "vitaminado", etiqueta: "Vitaminado", usaProducto: true, tiposProducto: ["medicamento", "suplemento"] },
  { valor: "tratamiento", etiqueta: "Tratamiento médico", usaProducto: true, requiereFoto: true, tiposProducto: ["medicamento"] },
  { valor: "curacion", etiqueta: "Curación", usaProducto: true, requiereFoto: true, tiposProducto: ["medicamento"] },
  { valor: "pesaje", etiqueta: "Pesaje", usaProducto: false, porAnimal: "peso" },
  { valor: "condicion_corporal", etiqueta: "Condición corporal", usaProducto: false, porAnimal: "condicion" },
  { valor: "aretado", etiqueta: "Aretado", usaProducto: false },
  { valor: "castracion", etiqueta: "Castración", usaProducto: false },
  { valor: "ia", etiqueta: "Inseminación artificial", usaProducto: true, tiposProducto: ["semen", "hormonal"] },
  { valor: "colocacion_cidr", etiqueta: "Colocación de CIDR", usaProducto: true, tiposProducto: ["hormonal"] },
  { valor: "retiro_cidr", etiqueta: "Retiro de CIDR", usaProducto: true, tiposProducto: ["hormonal"] },
  { valor: "aplicacion_hormonal", etiqueta: "Aplicación hormonal", usaProducto: true, tiposProducto: ["hormonal"] },
  { valor: "palpacion", etiqueta: "Palpación / Dx de gestación", usaProducto: false, porAnimal: "resultado" },
  { valor: "ultrasonido", etiqueta: "Ultrasonido", usaProducto: false, porAnimal: "resultado" },
  { valor: "parto", etiqueta: "Parto", usaProducto: false },
  { valor: "destete", etiqueta: "Destete / Desahije", usaProducto: false, porAnimal: "peso" },
  { valor: "alimentacion", etiqueta: "Alimentación", usaProducto: true, tiposProducto: ["alimento", "suplemento", "mineral"] },
  { valor: "muerte", etiqueta: "Muerte", usaProducto: false },
  { valor: "otro", etiqueta: "Otro", usaProducto: false },
];

/** Eventos que no se capturan como trabajo pero salen en los mismos listados. */
const OTRAS_ETIQUETAS: Record<string, string> = {
  cambio_grupo: "Cambio de grupo",
};

export function etiquetaTrabajo(tipo: string): string {
  return TIPOS_TRABAJO.find((t) => t.valor === tipo)?.etiqueta ?? OTRAS_ETIQUETAS[tipo] ?? tipo;
}

/**
 * Los productos en el orden en que conviene ofrecerlos para un trabajo: en una
 * vacunación primero las vacunas. No filtra en duro, porque siempre hay quien
 * desparasita con algo que dio de alta como "otro".
 */
export function ordenarProductosPara<P extends { tipo: string }>(
  tipo: string,
  productos: P[]
): P[] {
  const sugeridos = trabajo(tipo)?.tiposProducto ?? [];
  if (sugeridos.length === 0) return productos;
  return [
    ...productos.filter((p) => sugeridos.includes(p.tipo)),
    ...productos.filter((p) => !sugeridos.includes(p.tipo)),
  ];
}

export function trabajo(tipo: string): TipoTrabajo | undefined {
  return TIPOS_TRABAJO.find((t) => t.valor === tipo);
}

export const CATEGORIAS_GASTO = [
  "Alimento",
  "Minerales",
  "Medicamentos",
  "Vacunas",
  "Veterinario",
  "Mano de obra",
  "Combustible",
  "Maquinaria",
  "Mantenimiento",
  "Cercos",
  "Agua",
  "Inseminación",
  "Semen",
  "Toros",
  "Fletes",
  "Compra de ganado",
  "Renta de agostadero",
  "Servicios",
  "Otros",
] as const;

// ============================================================
// Especies y clases
//
// "En vez de clase deberías de poner especie, y dependiendo de la especie
//  pusieras la clase" — Miguel, junta del 18 de agosto.
// ============================================================

export type Especie =
  | "bovino"
  | "equino"
  | "ovino"
  | "caprino"
  | "cervido"
  | "asnal"
  | "otro";

export type ClaseAnimal = {
  valor: string;
  etiqueta: string;
  plural: string;
  /** Sexo implícito de la clase; sirve para autocompletar y para el ciclo de vida. */
  sexo?: "H" | "M";
  /** Es la clase de las crías de esa especie (antes del año). */
  cria?: boolean;
};

export const ESPECIES: {
  valor: Especie;
  etiqueta: string;
  plural: string;
  clases: ClaseAnimal[];
}[] = [
  {
    valor: "bovino",
    etiqueta: "Bovino",
    plural: "Bovinos",
    clases: [
      { valor: "vaca", etiqueta: "Vaca", plural: "Vacas", sexo: "H" },
      { valor: "vaquilla", etiqueta: "Vaquilla", plural: "Vaquillas", sexo: "H" },
      { valor: "toro", etiqueta: "Toro", plural: "Toros", sexo: "M" },
      { valor: "torete", etiqueta: "Torete", plural: "Toretes", sexo: "M" },
      { valor: "novillo", etiqueta: "Novillo (castrado)", plural: "Novillos", sexo: "M" },
      { valor: "becerro", etiqueta: "Becerro", plural: "Becerros", sexo: "M", cria: true },
      { valor: "becerra", etiqueta: "Becerra", plural: "Becerras", sexo: "H", cria: true },
    ],
  },
  {
    valor: "equino",
    etiqueta: "Equino",
    plural: "Equinos",
    clases: [
      { valor: "yegua", etiqueta: "Yegua", plural: "Yeguas", sexo: "H" },
      { valor: "garanon", etiqueta: "Garañón", plural: "Garañones", sexo: "M" },
      { valor: "capon", etiqueta: "Capón (castrado)", plural: "Capones", sexo: "M" },
      { valor: "potro", etiqueta: "Potro", plural: "Potros", sexo: "M", cria: true },
      { valor: "potranca", etiqueta: "Potranca", plural: "Potrancas", sexo: "H", cria: true },
      { valor: "caballo", etiqueta: "Caballo (sin especificar)", plural: "Caballos" },
    ],
  },
  {
    valor: "ovino",
    etiqueta: "Ovino",
    plural: "Ovinos",
    clases: [
      { valor: "borrega", etiqueta: "Borrega", plural: "Borregas", sexo: "H" },
      { valor: "borrego", etiqueta: "Borrego", plural: "Borregos", sexo: "M" },
      { valor: "cordero", etiqueta: "Cordero", plural: "Corderos", sexo: "M", cria: true },
      { valor: "cordera", etiqueta: "Cordera", plural: "Corderas", sexo: "H", cria: true },
    ],
  },
  {
    valor: "caprino",
    etiqueta: "Caprino",
    plural: "Caprinos",
    clases: [
      { valor: "chiva", etiqueta: "Chiva", plural: "Chivas", sexo: "H" },
      { valor: "chivo", etiqueta: "Chivo", plural: "Chivos", sexo: "M" },
      { valor: "cabrito", etiqueta: "Cabrito", plural: "Cabritos", sexo: "M", cria: true },
      { valor: "cabrita", etiqueta: "Cabrita", plural: "Cabritas", sexo: "H", cria: true },
    ],
  },
  {
    valor: "cervido",
    etiqueta: "Venado",
    plural: "Venados",
    clases: [
      { valor: "venado", etiqueta: "Venado", plural: "Venados", sexo: "M" },
      { valor: "cierva", etiqueta: "Cierva", plural: "Ciervas", sexo: "H" },
      { valor: "cervatillo", etiqueta: "Cervatillo", plural: "Cervatillos", cria: true },
    ],
  },
  {
    valor: "asnal",
    etiqueta: "Asnal",
    plural: "Asnales",
    clases: [
      { valor: "burra", etiqueta: "Burra", plural: "Burras", sexo: "H" },
      { valor: "burro", etiqueta: "Burro", plural: "Burros", sexo: "M" },
      { valor: "burrito", etiqueta: "Burrito", plural: "Burritos", cria: true },
    ],
  },
  {
    valor: "otro",
    etiqueta: "Otro",
    plural: "Otros",
    clases: [{ valor: "otro", etiqueta: "Otro", plural: "Otros" }],
  },
];

/** Todas las clases de todas las especies. Espejo del check de `animales.clase`. */
export const CLASES_ANIMAL: ClaseAnimal[] = ESPECIES.flatMap((e) => e.clases);

export function clasesDe(especie: string): ClaseAnimal[] {
  return ESPECIES.find((e) => e.valor === especie)?.clases ?? [];
}

export function claseAnimal(clase: string): ClaseAnimal | undefined {
  return CLASES_ANIMAL.find((c) => c.valor === clase);
}

export function etiquetaClase(clase: string): string {
  return claseAnimal(clase)?.etiqueta ?? clase;
}

/** Especie a la que pertenece una clase (para migrar datos viejos sin especie). */
export function especieDeClase(clase: string): Especie {
  return ESPECIES.find((e) => e.clases.some((c) => c.valor === clase))?.valor ?? "otro";
}

// ============================================================
// Estado reproductivo
//
// Era texto libre ("C3", "vacía", "parida"). Ahora es catálogo, pero
// `etiquetaReproductivo` sigue devolviendo lo capturado antes tal cual.
// ============================================================

export const ESTADOS_REPRODUCTIVOS: { valor: string; etiqueta: string }[] = [
  { valor: "vacia", etiqueta: "Vacía" },
  { valor: "vacia_ciclando", etiqueta: "Vacía ciclando" },
  { valor: "vacia_horra", etiqueta: "Vacía horra (sin cría)" },
  ...Array.from({ length: 9 }, (_, i) => ({
    valor: `cargada_${i + 1}`,
    etiqueta: `Cargada ${i + 1} ${i === 0 ? "mes" : "meses"}`,
  })),
  { valor: "parida", etiqueta: "Parida" },
  { valor: "parida_cargada", etiqueta: "Parida y cargada" },
  { valor: "malparto", etiqueta: "Malparió" },
];

export function etiquetaReproductivo(valor: string | null | undefined): string {
  if (!valor) return "—";
  return ESTADOS_REPRODUCTIVOS.find((e) => e.valor === valor)?.etiqueta ?? valor;
}

/** Meses de gestación si está cargada; null si no aplica. */
export function mesesGestacion(valor: string | null | undefined): number | null {
  const m = valor?.match(/^cargada_(\d)$/);
  return m ? Number(m[1]) : null;
}

/**
 * Traduce lo que se escribía a mano ("C3", "vacia", "parida") al catálogo.
 * Lo usan el importador de Excel y la captura de palpación.
 */
export function normalizarReproductivo(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const t = texto.trim().toLowerCase();
  if (!t) return null;
  if (ESTADOS_REPRODUCTIVOS.some((e) => e.valor === t)) return t;

  const cargada = t.match(/^c\s*(\d)$/) ?? t.match(/^cargada\s*(\d)/);
  if (cargada) return `cargada_${cargada[1]}`;
  if (t.startsWith("horra") || t.includes("horra")) return "vacia_horra";
  if (t.includes("ciclando")) return "vacia_ciclando";
  if (t.startsWith("vac")) return "vacia";
  if (t.includes("malpart")) return "malparto";
  if (t.startsWith("parida")) return "parida";
  return texto.trim();
}

// ============================================================
// Color de pelaje
//
// Solo se pregunta en bovinos y equinos: es como se identifica al animal a
// ojo ("la colorada", "el tordillo") cuando no se alcanza a leer el arete.
// El nombre se guarda en inglés, como viene el catálogo; `busqueda` trae
// cómo se le dice en el rancho para poder encontrarlo escribiendo.
// ============================================================

/** Especies a las que se les pregunta el color. */
export const ESPECIES_CON_PELAJE: Especie[] = ["bovino", "equino"];

export function usaColorPelaje(especie: string): boolean {
  return ESPECIES_CON_PELAJE.includes(especie as Especie);
}

export const COLORES_PELAJE: { valor: string; busqueda: string }[] = [
  { valor: "Apricot", busqueda: "albaricoque durazno melocoton bayo claro" },
  { valor: "Black", busqueda: "negro negra prieto prieta" },
  { valor: "Black And White", busqueda: "negro con blanco pinto negra holstein" },
  { valor: "Blue", busqueda: "azul azulejo" },
  { valor: "Blue And White", busqueda: "azul con blanco pinto azulejo" },
  { valor: "Brindle", busqueda: "barcino atigrado brindle" },
  { valor: "Brown", busqueda: "cafe castano marron" },
  { valor: "Brown And White", busqueda: "cafe con blanco pinto castano" },
  { valor: "Cream", busqueda: "crema cremoso palomino" },
  { valor: "Dun", busqueda: "bayo gateado" },
  { valor: "Dun And White", busqueda: "bayo con blanco pinto" },
  { valor: "Grey", busqueda: "gris tordillo tordo plomo" },
  { valor: "Red", busqueda: "colorado colorada rojo alazan" },
  { valor: "Red And White", busqueda: "colorado con blanco pinto hereford cara blanca" },
  { valor: "Roan", busqueda: "ruano rosillo moro" },
  { valor: "Silver", busqueda: "plateado plata" },
  { valor: "Unknown", busqueda: "desconocido no se sabe sin color" },
  { valor: "White", busqueda: "blanco blanca" },
  { valor: "Yellow", busqueda: "amarillo bayo hosco" },
];

/** Opciones para <ComboCampo name="color_pelaje">. */
export const OPCIONES_PELAJE = COLORES_PELAJE.map((c) => ({
  valor: c.valor,
  etiqueta: c.valor,
  busqueda: c.busqueda,
}));

// ============================================================
// Aretes y pesajes
// ============================================================

/**
 * Clase de arete que trae puesto el animal. El SINIIGA no está aquí: ese es
 * el oficial y vive en su propia columna.
 */
export const TIPOS_ARETE: { valor: string; etiqueta: string; detalle?: string }[] = [
  { valor: "visual", etiqueta: "Arete visual (VID)" },
  { valor: "electronico", etiqueta: "Arete electrónico (EID)" },
  { valor: "manejo", etiqueta: "Arete de manejo" },
  {
    valor: "lote",
    etiqueta: "Arete de lote",
    detalle: "Identificación grupal: año, prefijo o número de lote",
  },
];

export function etiquetaArete(valor: string | null | undefined): string {
  if (!valor) return "—";
  return TIPOS_ARETE.find((t) => t.valor === valor)?.etiqueta ?? valor;
}

/**
 * Papeles que se le guardan a un animal. Esta lista tiene que coincidir con el
 * check de `animal_documentos.tipo` (migración 0014).
 */
export const TIPOS_DOCUMENTO: { valor: string; etiqueta: string }[] = [
  { valor: "genomica", etiqueta: "Prueba de genómica" },
  { valor: "registro", etiqueta: "Certificado de registro" },
  { valor: "ultrasonido", etiqueta: "Ultrasonido" },
  { valor: "laboratorio", etiqueta: "Laboratorio" },
  { valor: "factura", etiqueta: "Factura" },
  { valor: "otro", etiqueta: "Otro" },
];

export function etiquetaDocumento(valor: string | null | undefined): string {
  if (!valor) return "—";
  return TIPOS_DOCUMENTO.find((t) => t.valor === valor)?.etiqueta ?? valor;
}

/** Por qué se subió el animal a la báscula. */
export const EVENTOS_PESAJE: { valor: string; etiqueta: string }[] = [
  { valor: "control", etiqueta: "Control" },
  { valor: "nacimiento", etiqueta: "Nacimiento" },
  { valor: "destete", etiqueta: "Destete" },
  { valor: "induccion", etiqueta: "Inducción" },
  { valor: "salida", etiqueta: "Salida" },
];

export function etiquetaEventoPesaje(valor: string | null | undefined): string {
  if (!valor) return "—";
  return EVENTOS_PESAJE.find((e) => e.valor === valor)?.etiqueta ?? valor;
}

/** Condición corporal: escala de 1 (flaca) a 5 (gorda). */
export const CONDICION_CORPORAL = { min: 1, max: 5, paso: 0.5 } as const;

export const TIPOS_PRODUCTO = [
  { valor: "alimento", etiqueta: "Alimento" },
  { valor: "mineral", etiqueta: "Mineral" },
  { valor: "suplemento", etiqueta: "Suplemento" },
  { valor: "medicamento", etiqueta: "Medicamento" },
  { valor: "vacuna", etiqueta: "Vacuna" },
  { valor: "hormonal", etiqueta: "Hormonal" },
  { valor: "semen", etiqueta: "Semen" },
  { valor: "combustible", etiqueta: "Combustible" },
  { valor: "otro", etiqueta: "Otro" },
];

export function etiquetaTipoProducto(tipo: string): string {
  return TIPOS_PRODUCTO.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
}

export type CategoriaInventario = {
  /** Segmento de la URL: /inventario/<slug>. */
  slug: "alimentos" | "minerales" | "medicinas" | "semen" | "otros";
  etiqueta: string;
  /** Los `productos.tipo` que caen en esta pestaña. */
  tipos: string[];
  unidadSugerida: string;
  /** Qué campos tienen sentido aquí: el semen no pesa ni tiene retiro. */
  campos: {
    contenidoKg: boolean;
    diasRetiro: boolean;
    controlado: boolean;
    caducidad: boolean;
  };
};

/**
 * Las pestañas del inventario. "Salía todo junto": el alimento se cuenta en
 * sacos y kilos, la medicina en frascos con caducidad y retiro, y el semen en
 * pajillas, así que cada cosa va en su cajón con sus propias columnas.
 */
export const CATEGORIAS_INVENTARIO: CategoriaInventario[] = [
  {
    slug: "alimentos",
    etiqueta: "Alimentos",
    tipos: ["alimento", "suplemento"],
    unidadSugerida: "saco",
    campos: { contenidoKg: true, diasRetiro: false, controlado: false, caducidad: false },
  },
  {
    slug: "minerales",
    etiqueta: "Minerales",
    tipos: ["mineral"],
    unidadSugerida: "saco",
    campos: { contenidoKg: true, diasRetiro: false, controlado: false, caducidad: false },
  },
  {
    slug: "medicinas",
    etiqueta: "Medicamentos y vacunas",
    tipos: ["medicamento", "vacuna", "hormonal"],
    unidadSugerida: "frasco",
    campos: { contenidoKg: false, diasRetiro: true, controlado: true, caducidad: true },
  },
  {
    slug: "semen",
    etiqueta: "Semen",
    tipos: ["semen"],
    unidadSugerida: "pajilla",
    campos: { contenidoKg: false, diasRetiro: false, controlado: false, caducidad: false },
  },
  {
    slug: "otros",
    etiqueta: "Otros",
    tipos: ["combustible", "otro"],
    unidadSugerida: "litro",
    campos: { contenidoKg: false, diasRetiro: false, controlado: false, caducidad: false },
  },
];

export function categoriaInventario(slug: string | null | undefined) {
  return CATEGORIAS_INVENTARIO.find((c) => c.slug === slug);
}

/** Un tipo que no esté en ninguna pestaña cae en "Otros". */
export function categoriaDeTipo(tipo: string): CategoriaInventario {
  return (
    CATEGORIAS_INVENTARIO.find((c) => c.tipos.includes(tipo)) ??
    CATEGORIAS_INVENTARIO[CATEGORIAS_INVENTARIO.length - 1]
  );
}

/**
 * A qué categoría de gasto se va la compra de un insumo. No es el mismo mapa
 * que las pestañas: vacunas y medicamentos comparten pestaña pero son gastos
 * distintos.
 */
export const CATEGORIA_GASTO_POR_TIPO: Record<string, string> = {
  alimento: "Alimento",
  suplemento: "Alimento",
  mineral: "Minerales",
  vacuna: "Vacunas",
  semen: "Semen",
  combustible: "Combustible",
};

/**
 * Qué se puede poner en el mapa. `geometria` decide con qué herramienta se
 * dibuja: punto, línea (tubería, cercos) o polígono (corral, feedlot, agrícola),
 * y `categoria` es el cajón donde aparece en el menú de agregar.
 */
export type TipoInfra = {
  valor: string;
  etiqueta: string;
  geometria: "punto" | "linea" | "poligono";
  categoria: "area" | "construcciones" | "agua" | "infraestructura" | "peligros";
  /** Guarda capacidad y capacidad actual (tanques, pilas). */
  capacidad?: boolean;
  /** El pluviómetro tiene tabla propia porque de él cuelgan las lluvias. */
  capa?: "pluviometro";
};

export const CATEGORIAS_INFRA: { clave: TipoInfra["categoria"]; etiqueta: string }[] = [
  { clave: "construcciones", etiqueta: "Construcciones" },
  { clave: "agua", etiqueta: "Fuentes de agua" },
  { clave: "infraestructura", etiqueta: "Infraestructura" },
  { clave: "peligros", etiqueta: "Peligros" },
];

export const TIPOS_INFRAESTRUCTURA: TipoInfra[] = [
  // Áreas de manejo y de suelo: lo que se traza como polígono en el potrero.
  { valor: "corral", etiqueta: "Corral", geometria: "poligono", categoria: "area" },
  { valor: "manga", etiqueta: "Manga", geometria: "poligono", categoria: "area" },
  { valor: "feedlot", etiqueta: "Feedlot", geometria: "poligono", categoria: "area" },
  { valor: "agricola", etiqueta: "Área agrícola", geometria: "poligono", categoria: "area" },
  { valor: "pivote", etiqueta: "Pivote", geometria: "poligono", categoria: "area" },
  { valor: "humedal", etiqueta: "Humedal", geometria: "poligono", categoria: "area" },
  { valor: "erosion", etiqueta: "Zona de erosión", geometria: "poligono", categoria: "area" },

  // Construcciones
  { valor: "construccion", etiqueta: "Construcción", geometria: "poligono", categoria: "construcciones" },
  { valor: "deposito_quimicos", etiqueta: "Depósito de químicos", geometria: "punto", categoria: "construcciones" },
  { valor: "henera", etiqueta: "Henera", geometria: "punto", categoria: "construcciones" },
  { valor: "silo", etiqueta: "Silo", geometria: "punto", categoria: "construcciones", capacidad: true },

  // Fuentes de agua
  { valor: "pozo", etiqueta: "Pozo", geometria: "punto", categoria: "agua" },
  { valor: "perforacion", etiqueta: "Perforación", geometria: "punto", categoria: "agua" },
  { valor: "laguna", etiqueta: "Laguna", geometria: "poligono", categoria: "agua" },
  { valor: "cuerpo_agua", etiqueta: "Cuerpo de agua", geometria: "poligono", categoria: "agua" },
  { valor: "drenaje", etiqueta: "Drenaje", geometria: "linea", categoria: "agua" },
  { valor: "tuberia", etiqueta: "Tubería", geometria: "linea", categoria: "agua" },
  { valor: "canal_agua", etiqueta: "Canal de agua", geometria: "linea", categoria: "agua" },
  { valor: "bomba", etiqueta: "Bomba", geometria: "punto", categoria: "agua" },
  { valor: "bomba_solar", etiqueta: "Bomba solar", geometria: "punto", categoria: "agua" },
  { valor: "papalote", etiqueta: "Papalote (molino)", geometria: "punto", categoria: "agua" },
  { valor: "llave_agua", etiqueta: "Llave de agua", geometria: "punto", categoria: "agua" },
  { valor: "bebedero", etiqueta: "Bebedero", geometria: "punto", categoria: "agua" },
  { valor: "pila", etiqueta: "Pila", geometria: "punto", categoria: "agua", capacidad: true },
  { valor: "tanque", etiqueta: "Tanque de agua", geometria: "punto", categoria: "agua", capacidad: true },
  {
    valor: "pluviometro",
    etiqueta: "Pluviómetro",
    geometria: "punto",
    categoria: "agua",
    capa: "pluviometro",
  },

  // Infraestructura
  { valor: "cerco", etiqueta: "Cerco", geometria: "linea", categoria: "infraestructura" },
  { valor: "cerco_electrico", etiqueta: "Cerco eléctrico", geometria: "linea", categoria: "infraestructura" },
  { valor: "comedero", etiqueta: "Comedero", geometria: "punto", categoria: "infraestructura" },
  { valor: "bloque_mineral", etiqueta: "Bloque mineral", geometria: "punto", categoria: "infraestructura" },
  { valor: "botiquin", etiqueta: "Primeros auxilios", geometria: "punto", categoria: "infraestructura" },
  { valor: "tranquera", etiqueta: "Tranquera", geometria: "punto", categoria: "infraestructura" },
  { valor: "generador", etiqueta: "Generador", geometria: "punto", categoria: "infraestructura" },
  { valor: "linea_electrica", etiqueta: "Línea eléctrica", geometria: "linea", categoria: "infraestructura" },
  { valor: "camino", etiqueta: "Camino", geometria: "linea", categoria: "infraestructura" },
  { valor: "panel_solar", etiqueta: "Panel solar", geometria: "punto", categoria: "infraestructura" },

  // Peligros
  { valor: "cebo", etiqueta: "Cebo", geometria: "punto", categoria: "peligros" },
  { valor: "fosa_mortandad", etiqueta: "Fosa de mortandad", geometria: "punto", categoria: "peligros" },
  { valor: "maleza", etiqueta: "Maleza", geometria: "poligono", categoria: "peligros" },
  { valor: "peligro", etiqueta: "Peligro", geometria: "punto", categoria: "peligros" },
  { valor: "area_peligro", etiqueta: "Área de peligro", geometria: "poligono", categoria: "peligros" },

  { valor: "otro", etiqueta: "Otro", geometria: "punto", categoria: "infraestructura" },
];

export function tiposInfraPor(geometria: TipoInfra["geometria"]): TipoInfra[] {
  return TIPOS_INFRAESTRUCTURA.filter((t) => t.geometria === geometria);
}

/** Lo que va en cada cajón del menú de agregar del mapa. */
export function tiposInfraDe(categoria: TipoInfra["categoria"]): TipoInfra[] {
  return TIPOS_INFRAESTRUCTURA.filter(
    (t) => t.categoria === categoria && t.valor !== "otro"
  );
}

export function tipoInfra(valor: string): TipoInfra | undefined {
  return TIPOS_INFRAESTRUCTURA.find((t) => t.valor === valor);
}

export const RESIDUOS = ["muy bajo", "bajo", "medio", "alto", "muy alto"];

// Divisiones iniciales al crear un rancho.
// Preacondicionamiento: el corral de 30 días entre el destete y el repasto.
export const DIVISIONES_INICIALES = [
  "Pie de cría",
  "Preacondicionamiento",
  "Repasto",
  "Engorda",
];

// Productos iniciales (del Presupuesto JC: catálogo real de insumos)
export const PRODUCTOS_INICIALES: {
  nombre: string;
  tipo: string;
  unidad: string;
  contenido_kg?: number;
  costo_unitario?: number;
}[] = [
  { nombre: "Prospector 12", tipo: "mineral", unidad: "saco", contenido_kg: 20, costo_unitario: 454.2 },
  { nombre: "Range Booster 100", tipo: "mineral", unidad: "saco", contenido_kg: 20, costo_unitario: 665 },
  { nombre: "Range Tub 60", tipo: "suplemento", unidad: "tina", contenido_kg: 35, costo_unitario: 970 },
  { nombre: "Protelick-30", tipo: "suplemento", unidad: "tina", contenido_kg: 25, costo_unitario: 512.93 },
  { nombre: "Protelick-40", tipo: "suplemento", unidad: "tina", contenido_kg: 25 },
  { nombre: "Vimicalf", tipo: "alimento", unidad: "saco", contenido_kg: 25, costo_unitario: 270 },
  { nombre: "HP 22", tipo: "alimento", unidad: "saco", contenido_kg: 25, costo_unitario: 275 },
  { nombre: "HP 16", tipo: "alimento", unidad: "saco", contenido_kg: 25, costo_unitario: 238 },
  { nombre: "Milk Choice 18", tipo: "alimento", unidad: "saco", contenido_kg: 25, costo_unitario: 208 },
  { nombre: "Alfalfa", tipo: "alimento", unidad: "paca", contenido_kg: 50, costo_unitario: 280 },
  { nombre: "Ranch Cube", tipo: "alimento", unidad: "saco", contenido_kg: 25, costo_unitario: 343 },
  { nombre: "Sal", tipo: "mineral", unidad: "saco", contenido_kg: 25 },
  { nombre: "CIDR", tipo: "hormonal", unidad: "pieza", costo_unitario: 241 },
  { nombre: "Benzoato de estradiol", tipo: "hormonal", unidad: "frasco", costo_unitario: 15.82 },
  { nombre: "Lutalyse (prostaglandina)", tipo: "hormonal", unidad: "frasco", costo_unitario: 42.3 },
  { nombre: "Novormon", tipo: "hormonal", unidad: "frasco", costo_unitario: 123.36 },
  { nombre: "GnRH (Ovalyze)", tipo: "hormonal", unidad: "frasco", costo_unitario: 20 },
  { nombre: "Multimin", tipo: "medicamento", unidad: "frasco", costo_unitario: 43 },
  { nombre: "Semen Festus", tipo: "semen", unidad: "pajilla", costo_unitario: 400 },
  { nombre: "Semen Elemental", tipo: "semen", unidad: "pajilla", costo_unitario: 750 },
  { nombre: "Bovilis Vista Once", tipo: "vacuna", unidad: "frasco" },
  { nombre: "Bobact 8", tipo: "vacuna", unidad: "frasco" },
  { nombre: "Clostrigen P", tipo: "vacuna", unidad: "frasco" },
  { nombre: "Bovigen Total Se", tipo: "vacuna", unidad: "frasco" },
  { nombre: "Fosfosan", tipo: "medicamento", unidad: "frasco" },
  { nombre: "Modivitasan", tipo: "medicamento", unidad: "frasco" },
  { nombre: "Napzin", tipo: "medicamento", unidad: "frasco" },
  { nombre: "Gorban", tipo: "medicamento", unidad: "frasco" },
  { nombre: "Penicilina", tipo: "medicamento", unidad: "frasco" },
  { nombre: "Oxitocina", tipo: "medicamento", unidad: "frasco" },
];

export function formatoMoneda(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}

export function formatoNumero(n: number | null | undefined, decimales = 0): string {
  if (n == null) return "—";
  return n.toLocaleString("es-MX", { maximumFractionDigits: decimales });
}

export function formatoFecha(f: string | Date | null | undefined): string {
  if (!f) return "—";
  const d = typeof f === "string" ? new Date(f + (f.length === 10 ? "T12:00:00" : "")) : f;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

// ── Tareas ──

export const CATEGORIAS_TAREA = [
  "General",
  "Manejo de ganado",
  "Agua",
  "Cercos",
  "Alimentación",
  "Sanidad",
  "Maquinaria",
  "Compras",
  "Papeles",
] as const;

export const PRIORIDADES_TAREA = [
  { valor: "baja", etiqueta: "Baja" },
  { valor: "media", etiqueta: "Media" },
  { valor: "alta", etiqueta: "Alta" },
] as const;
