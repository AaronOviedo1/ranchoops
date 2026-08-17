// Tipos de fila de la base de datos (espejo de supabase/migrations)

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

export type AnimalClase =
  | "vaca"
  | "vaquilla"
  | "toro"
  | "torete"
  | "becerro"
  | "becerra"
  | "caballo"
  | "otro";

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
  clase: AnimalClase;
  raza: string | null;
  fecha_nacimiento: string | null;
  peso_nacimiento: number | null;
  procedencia: string | null;
  madre_id: string | null;
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
  creado_por: string | null;
  created_at: string;
};

export type EventoAnimal = {
  id: string;
  rancho_id: string;
  evento_id: string;
  animal_id: string;
  valores: { peso?: number; resultado?: string; obs?: string } | null;
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
