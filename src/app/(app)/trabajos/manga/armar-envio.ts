import { trabajo } from "@/lib/catalogos";
import type { AccionSesion } from "../sesion";
import type { EstadoJornada } from "./estado";

export type Envio = {
  acciones: AccionSesion[];
  animalIds: string[];
  valores: Record<
    string,
    { peso?: number; condicion?: number; resultado?: string; obs?: string; destino?: string }
  >;
  separar: Record<string, string>;
};

const normalizar = (texto: string | null | undefined) => (texto ?? "").trim().toLowerCase();

/**
 * De "qué se le hizo a cada animal" a "qué acciones hubo y a quiénes": los que
 * recibieron lo mismo (mismo trabajo, producto y dosis) comparten un evento,
 * para que el inventario y los costos sigan colgando de él. Lo que lleva foto
 * o nota propia no se junta con nadie.
 */
export function armarEnvio(
  estado: EstadoJornada,
  controlados: Set<string>
): Envio {
  const porClave = new Map<string, AccionSesion & { animal_ids: string[] }>();

  const sumar = (claveAccion: string, animalId: string, nueva: AccionSesion, cantidad: number | null) => {
    const accion = porClave.get(claveAccion);
    if (!accion) {
      porClave.set(claveAccion, { ...nueva, cantidad, animal_ids: [animalId] });
      return;
    }
    // Un animal va una sola vez por evento aunque el trabajo se le repita.
    if (!accion.animal_ids.includes(animalId)) accion.animal_ids.push(animalId);
    if (cantidad != null) accion.cantidad = (accion.cantidad ?? 0) + cantidad;
  };

  for (const c of estado.capturados) {
    for (const t of c.trabajos) {
      const propio = trabajo(t.tipo)?.requiereFoto || !!t.nota || !!t.foto_ruta;
      const claveAccion = [
        t.tipo,
        t.producto_id ?? "",
        normalizar(t.dosis),
        propio ? `${c.animalId}:${t.id}` : "",
      ].join("|");
      const controlado = !!t.producto_id && controlados.has(t.producto_id);
      sumar(
        claveAccion,
        c.animalId,
        {
          tipo: t.tipo,
          producto_id: t.producto_id,
          dosis: t.dosis?.trim() || null,
          resultado: t.nota?.trim() || null,
          foto_ruta: t.foto_ruta ?? null,
          mvz: controlado ? estado.mvz.trim() || null : null,
          receta_folio: controlado ? estado.receta_folio.trim() || null : null,
        },
        t.cantidad
      );
    }

    // Sin ningún trabajo pero con nota o destino: que quede en su historial.
    if (c.trabajos.length === 0 && (c.obs || c.destino)) {
      sumar(
        "otro|||manga",
        c.animalId,
        { tipo: "otro", resultado: "Pasó por la manga" },
        null
      );
    }
  }

  const valores: Envio["valores"] = {};
  const separar: Envio["separar"] = {};
  for (const c of estado.capturados) {
    valores[c.animalId] = {
      ...(c.peso != null ? { peso: c.peso } : {}),
      ...(c.condicion != null ? { condicion: c.condicion } : {}),
      ...(c.resultado ? { resultado: c.resultado } : {}),
      ...(c.obs ? { obs: c.obs } : {}),
      ...(c.destino ? { destino: c.destino } : {}),
    };
    if (c.separarA) separar[c.animalId] = c.separarA;
  }

  return {
    acciones: [...porClave.values()],
    animalIds: estado.capturados.map((c) => c.animalId),
    valores,
    separar,
  };
}
