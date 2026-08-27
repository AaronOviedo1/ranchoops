// Tipos de fila de la base de datos (espejo de supabase/migrations)

import type { Especie } from "@/lib/catalogos";

export type Rancho = {
  id: string;
  nombre: string;
  upp: string | null;
  unidad_lluvia: "in" | "mm";
  meta_dias_descanso: number;
};

export type Division = {
  id: string;
  rancho_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

export type Potrero = {
  id: string;
  rancho_id: string;
  nombre: string;
  superficie_has: number | null;
  geom: GeoJSON.Feature | null;
  tipo_vegetacion: string | null;
  capacidad_estimada: number | null;
  activo: boolean;
  notas: string | null;
};

export type Infraestructura = {
  id: string;
  rancho_id: string;
  tipo: string;
  nombre: string;
  geom: GeoJSON.Feature | null;
  capacidad: number | null;
  capacidad_actual: number | null;
  notas: string | null;
};

export type Pluviometro = {
  id: string;
  rancho_id: string;
  nombre: string;
  geom: GeoJSON.Feature | null;
  activo: boolean;
};

export type Lluvia = {
  id: string;
  rancho_id: string;
  pluviometro_id: string;
  fecha: string;
  cantidad: number;
  obs: string | null;
};

export type Grupo = {
  id: string;
  rancho_id: string;
  nombre: string;
  division_id: string | null;
  potrero_actual_id: string | null;
  activo: boolean;
  notas: string | null;
};

export type GrupoMovimiento = {
  id: string;
  rancho_id: string;
  grupo_id: string;
  potrero_id: string;
  fecha_entrada: string;
  fecha_salida: string | null;
  num_animales_entrada: number | null;
  num_animales_salida: number | null;
  calif_buniga: number | null;
  residuo: string | null;
  obs: string | null;
};

/**
 * La lista viva de clases está en `CLASES_ANIMAL` (src/lib/catalogos.ts), que
 * es el espejo del check de `animales.clase`. Aquí es `string` porque depende
 * de la especie y crece con cada especie que se agrega.
 */
export type AnimalClase = string;

export type AnimalStatus =
  | "activo"
  | "vendido"
  | "muerto"
  | "desecho"
  | "transferido";

export type Animal = {
  id: string;
  rancho_id: string;
  arete_control: string | null;
  siniga: string | null;
  nombre: string | null;
  sexo: "H" | "M" | null;
  especie: Especie;
  clase: AnimalClase;
  /** Categoría fina del catálogo DSE; null = se usa la que da su clase. */
  categoria_dse: string | null;
  raza: string | null;
  /** Solo en bovinos y equinos; el nombre viene del catálogo en inglés. */
  color_pelaje: string | null;
  /** Clase del arete de control: visual, electronico, manejo, lote. */
  tipo_arete: string | null;
  fecha_identificacion: string | null;
  /**
   * Desde cuándo cuenta en el inventario del rancho. Vacía = desde que nació.
   */
  fecha_en_campo: string | null;
  fecha_ingreso_grupo: string | null;
  fecha_nacimiento: string | null;
  peso_nacimiento: number | null;
  peso_destete: number | null;
  fecha_destete: string | null;
  /** Meta de peso para la proyección: a cuánto y para cuándo. */
  peso_objetivo: number | null;
  fecha_objetivo: string | null;
  procedencia: string | null;
  madre_id: string | null;
  padre_id: string | null;
  padre_texto: string | null;
  division_id: string | null;
  grupo_id: string | null;
  status: AnimalStatus;
  status_reproductivo: string | null;
  fecha_salida: string | null;
  causa_salida: string | null;
  foto_url: string | null;
  notas: string | null;
  created_at: string;
};

export type Producto = {
  id: string;
  rancho_id: string;
  nombre: string;
  tipo: string;
  unidad: string;
  contenido_kg: number | null;
  costo_unitario: number | null;
  stock_minimo: number | null;
  proveedor: string | null;
  /** Controlado (xilacina, ketamina): exige MVZ y folio de receta al usarse. */
  controlado: boolean;
  /** Días de retiro (carencia): la carne no se vende hasta que pasen. */
  dias_retiro: number | null;
  activo: boolean;
};

export type InventarioMovimiento = {
  id: string;
  rancho_id: string;
  producto_id: string;
  tipo: "entrada" | "salida" | "ajuste";
  cantidad: number;
  costo_unitario: number | null;
  costo_total: number | null;
  fecha: string;
  proveedor: string | null;
  evento_id: string | null;
  lote: string | null;
  caducidad: string | null;
  obs: string | null;
};

export type Evento = {
  id: string;
  rancho_id: string;
  tipo: string;
  fecha: string;
  grupo_id: string | null;
  potrero_id: string | null;
  producto_id: string | null;
  cantidad: number | null;
  dosis: string | null;
  responsable: string | null;
  resultado: string | null;
  costo_total: number | null;
  obs: string | null;
  detalle: Record<string, unknown> | null;
  /** Agrupa los eventos de una misma jornada de manga. */
  sesion_id: string | null;
  foto_url: string | null;
  receta_folio: string | null;
  mvz: string | null;
  creado_por: string | null;
  created_at: string;
};

/** Un paso de una plantilla: qué se hace y con qué. */
export type PasoPlantilla = {
  tipo: string;
  producto_id: string | null;
  dosis: string | null;
  cantidad_por_animal: number | null;
};

export type PlantillaTrabajo = {
  id: string;
  rancho_id: string;
  nombre: string;
  pasos: PasoPlantilla[];
  activo: boolean;
};

export type EventoAnimal = {
  id: string;
  rancho_id: string;
  evento_id: string;
  animal_id: string;
  valores: {
    peso?: number;
    resultado?: string;
    obs?: string;
    /** Ganancia diaria de peso (kg/día) contra el pesaje anterior. */
    gdp?: number;
    /** Condición corporal, de 1 a 5. */
    condicion?: number;
    /** Marcado en la manga: a dónde va el animal al terminar la jornada. */
    destino?: "venta" | "desecho";
  } | null;
};

export type Gasto = {
  id: string;
  rancho_id: string;
  fecha: string;
  concepto: string;
  proveedor: string | null;
  monto: number;
  categoria: string;
  division_id: string | null;
  potrero_id: string | null;
  grupo_id: string | null;
  num_animales: number | null;
  comprobante_url: string | null;
  obs: string | null;
};

export type Venta = {
  id: string;
  rancho_id: string;
  fecha: string;
  comprador: string | null;
  guia: string | null;
  reemo: string | null;
  division_id: string | null;
  obs: string | null;
};

export type VentaRenglon = {
  id: string;
  rancho_id: string;
  venta_id: string;
  clase: string;
  cabezas: number;
  kilos_salida: number | null;
  kilos_venta: number | null;
  precio_kg: number | null;
  precio_cabeza: number | null;
  total: number;
};

export type Existencia = {
  producto_id: string;
  rancho_id: string;
  nombre: string;
  tipo: string;
  unidad: string;
  stock_minimo: number | null;
  costo_unitario: number | null;
  existencia: number;
};

export type PotreroEstado = {
  potrero_id: string;
  rancho_id: string;
  nombre: string;
  superficie_has: number | null;
  grupo_actual_id: string | null;
  ocupado_desde: string | null;
  dias_ocupado: number | null;
  ultima_salida: string | null;
  dias_descanso: number | null;
};

// Vista v_potrero_carga: carga actual de cada potrero (migración 0009)
export type PotreroCarga = {
  potrero_id: string;
  rancho_id: string;
  cabezas: number;
  ua: number;
  ua_por_ha: number | null;
  pct_capacidad: number | null;
};

// Vista v_pastoreo_mensual: historia de ocupación por potrero y mes
export type PastoreoMes = {
  rancho_id: string;
  potrero_id: string;
  grupo_id: string;
  mes: string;
  dias_ocupado: number;
  cabezas_dia: number;
};

// Compras de ganado: espejo de ventas (migración 0010)
export type Compra = {
  id: string;
  rancho_id: string;
  fecha: string;
  proveedor: string | null;
  guia: string | null;
  reemo: string | null;
  division_id: string | null;
  obs: string | null;
};

export type CompraRenglon = {
  id: string;
  rancho_id: string;
  compra_id: string;
  clase: string;
  cabezas: number;
  kilos: number | null;
  precio_kg: number | null;
  precio_cabeza: number | null;
  total: number;
};

// Vista v_animales_en_retiro: tratamientos cuyo período de retiro sigue vivo
export type AnimalEnRetiro = {
  rancho_id: string;
  animal_id: string;
  fecha_tratamiento: string;
  producto: string;
  dias_retiro: number;
  retiro_hasta: string;
};

// Tareas: lo que hay que hacer (migración 0011). El evento es lo ya hecho.
export type Tarea = {
  id: string;
  rancho_id: string;
  nombre: string;
  descripcion: string | null;
  prioridad: "baja" | "media" | "alta";
  categoria: string;
  fecha_inicio: string | null;
  fecha_vence: string | null;
  responsable_id: string | null;
  potrero_id: string | null;
  grupo_id: string | null;
  estado: "pendiente" | "en_curso" | "hecha" | "cancelada";
  hecha_at: string | null;
  created_at: string;
};
