// Catálogos del dominio (vocabulario de José Carlos)

export const TIPOS_TRABAJO: { valor: string; etiqueta: string; usaProducto: boolean }[] = [
  { valor: "vacunacion", etiqueta: "Vacunación", usaProducto: true },
  { valor: "desparasitacion", etiqueta: "Desparasitación", usaProducto: true },
  { valor: "vitaminado", etiqueta: "Vitaminado", usaProducto: true },
  { valor: "tratamiento", etiqueta: "Tratamiento médico", usaProducto: true },
  { valor: "curacion", etiqueta: "Curación", usaProducto: true },
  { valor: "pesaje", etiqueta: "Pesaje", usaProducto: false },
  { valor: "aretado", etiqueta: "Aretado", usaProducto: false },
  { valor: "castracion", etiqueta: "Castración", usaProducto: false },
  { valor: "ia", etiqueta: "Inseminación artificial", usaProducto: true },
  { valor: "colocacion_cidr", etiqueta: "Colocación de CIDR", usaProducto: true },
  { valor: "retiro_cidr", etiqueta: "Retiro de CIDR", usaProducto: true },
  { valor: "aplicacion_hormonal", etiqueta: "Aplicación hormonal", usaProducto: true },
  { valor: "palpacion", etiqueta: "Palpación / Dx de gestación", usaProducto: false },
  { valor: "ultrasonido", etiqueta: "Ultrasonido", usaProducto: false },
  { valor: "parto", etiqueta: "Parto", usaProducto: false },
  { valor: "destete", etiqueta: "Destete / Desahije", usaProducto: false },
  { valor: "alimentacion", etiqueta: "Alimentación", usaProducto: true },
  { valor: "muerte", etiqueta: "Muerte", usaProducto: false },
  { valor: "otro", etiqueta: "Otro", usaProducto: false },
];

export function etiquetaTrabajo(tipo: string): string {
  return TIPOS_TRABAJO.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
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

export const CLASES_ANIMAL: { valor: string; etiqueta: string; plural: string }[] = [
  { valor: "vaca", etiqueta: "Vaca", plural: "Vacas" },
  { valor: "vaquilla", etiqueta: "Vaquilla", plural: "Vaquillas" },
  { valor: "toro", etiqueta: "Toro", plural: "Toros" },
  { valor: "torete", etiqueta: "Torete", plural: "Toretes" },
  { valor: "becerro", etiqueta: "Becerro", plural: "Becerros" },
  { valor: "becerra", etiqueta: "Becerra", plural: "Becerras" },
  { valor: "caballo", etiqueta: "Caballo", plural: "Caballos" },
  { valor: "otro", etiqueta: "Otro", plural: "Otros" },
];

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

export const TIPOS_INFRAESTRUCTURA = [
  { valor: "corral", etiqueta: "Corral" },
  { valor: "bebedero", etiqueta: "Bebedero" },
  { valor: "pila", etiqueta: "Pila" },
  { valor: "pozo", etiqueta: "Pozo" },
  { valor: "papalote", etiqueta: "Papalote" },
  { valor: "tanque", etiqueta: "Tanque" },
  { valor: "camino", etiqueta: "Camino" },
  { valor: "cerco", etiqueta: "Cerco" },
  { valor: "otro", etiqueta: "Otro" },
];

export const RESIDUOS = ["muy bajo", "bajo", "medio", "alto", "muy alto"];

// Divisiones iniciales al crear un rancho
export const DIVISIONES_INICIALES = ["Pie de cría", "Repasto", "Engorda"];

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
