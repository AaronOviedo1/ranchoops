import { trabajo } from "@/lib/catalogos";

// El estado de una jornada de manga. Es serializable a propósito: es el mismo
// objeto que se guarda como borrador en el teléfono (ver borrador.ts).

export type Destino = "venta" | "desecho" | null;

/** Lo que se le hace a todos, salvo que en el animal se diga otra cosa. */
export type TrabajoBase = {
  tipo: string;
  producto_id: string | null;
  cantidad_por_animal: number | null;
  dosis: string | null;
};

/** Lo que de veras se le hizo a un animal. */
export type TrabajoAnimal = {
  id: string;
  tipo: string;
  producto_id: string | null;
  cantidad: number | null;
  dosis: string | null;
  /** Solo en los extras: "herida en la pata izquierda". */
  nota?: string | null;
  /** Ruta de la foto ya subida (tratamientos y curaciones). */
  foto_ruta?: string | null;
  /** No viene de los trabajos base: se le agregó solo a este animal. */
  extra: boolean;
};

export type Capturado = {
  animalId: string;
  trabajos: TrabajoAnimal[];
  peso: number | null;
  condicion: number | null;
  resultado: string | null;
  obs: string | null;
  destino: Destino;
  /** Grupo al que se aparta al cerrar la jornada. */
  separarA: string | null;
};

export type EstadoJornada = {
  version: 1;
  /** Lo genera el teléfono: con él un reintento no se guarda dos veces. */
  sesionId: string;
  fase: "preparar" | "captura";
  fecha: string;
  responsable: string;
  mvz: string;
  receta_folio: string;
  base: TrabajoBase[];
  capturados: Capturado[];
  /** Cuándo se mandó a guardar; si está, puede que el servidor ya la tenga. */
  enviadoEn?: string;
};

export function jornadaNueva(fecha: string): EstadoJornada {
  return {
    version: 1,
    sesionId: crypto.randomUUID(),
    fase: "preparar",
    fecha,
    responsable: "",
    mvz: "",
    receta_folio: "",
    // Lo de siempre en la manga: pesar. Lo demás se agrega al preparar.
    base: [{ tipo: "pesaje", producto_id: null, cantidad_por_animal: null, dosis: null }],
    capturados: [],
  };
}

/** Los trabajos con los que arranca cada animal que entra a la trampa. */
export function trabajosDeBase(base: TrabajoBase[]): TrabajoAnimal[] {
  return base.map((b) => ({
    id: `base:${b.tipo}`,
    tipo: b.tipo,
    producto_id: b.producto_id,
    cantidad: b.cantidad_por_animal,
    dosis: b.dosis,
    extra: false,
  }));
}

/** Qué datos propios del animal piden sus trabajos (peso, condición, resultado). */
export function camposPorAnimal(trabajos: { tipo: string }[]) {
  const pide = (campo: "peso" | "condicion" | "resultado") =>
    trabajos.some((t) => trabajo(t.tipo)?.porAnimal === campo);
  return { peso: pide("peso"), condicion: pide("condicion"), resultado: pide("resultado") };
}

/** Las fotos que ya se subieron para esta jornada (para borrarlas si se descarta). */
export function fotosDe(estado: EstadoJornada): string[] {
  return estado.capturados.flatMap((c) =>
    c.trabajos.map((t) => t.foto_ruta).filter((r): r is string => !!r)
  );
}
