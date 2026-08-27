"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { bandera, campo, fecha as fechaDe, lista, subirArchivo } from "@/lib/formulario";
import { normalizarReproductivo, trabajo } from "@/lib/catalogos";
import { gananciaDiaria, type Pesaje } from "@/lib/pesos";
import type { EventoAnimal } from "@/lib/tipos";

/** Una acción de la jornada: qué se hace y con qué. */
export type AccionSesion = {
  tipo: string;
  producto_id?: string | null;
  cantidad?: number | null;
  dosis?: string | null;
  costo_total?: number | null;
  resultado?: string | null;
  receta_folio?: string | null;
  mvz?: string | null;
};

type ValoresPorAnimal = Record<string, NonNullable<EventoAnimal["valores"]>>;

function leerJson<T>(formData: FormData, nombre: string, porDefecto: T): T {
  try {
    const crudo = formData.get(nombre);
    return crudo ? (JSON.parse(String(crudo)) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

/**
 * Registra una jornada de manejo completa.
 *
 * "Puedo vacunar, desparasitar, vitaminar y pesar… todo al mismo tiempo": cada
 * acción sigue siendo su propio evento (para que inventario y costos no
 * cambien de lógica), pero todas comparten un `sesion_id` y la misma lista de
 * animales, así que solo se capturan una vez.
 */
export async function registrarSesion(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Declarada con `never` para que TypeScript sepa que aquí se corta el flujo.
  function volver(mensaje: string): never {
    redirect(`/trabajos/nuevo?error=${encodeURIComponent(mensaje)}`);
  }

  const acciones = leerJson<AccionSesion[]>(formData, "acciones", []);
  if (acciones.length === 0) volver("Elige al menos un trabajo.");

  const animalIds = lista(formData, "animal_id");
  if (animalIds.length === 0) volver("Elige al menos un animal.");

  const fecha = fechaDe(formData);
  const grupoId = campo(formData, "grupo_id");
  const responsable = campo(formData, "responsable");
  const obs = campo(formData, "obs");
  const valores = leerJson<ValoresPorAnimal>(formData, "valores", {});

  // Los productos controlados (xilacina, ketamina) piden MVZ y folio de receta.
  const idsProducto = acciones.map((a) => a.producto_id).filter((id): id is string => !!id);
  const { data: productos } = idsProducto.length
    ? await supabase
        .from("productos")
        .select("id, nombre, costo_unitario, controlado")
        .in("id", idsProducto)
        .eq("rancho_id", rancho.id)
    : { data: [] };
  const porId = new Map((productos ?? []).map((p) => [p.id, p]));

  for (const a of acciones) {
    const p = a.producto_id ? porId.get(a.producto_id) : null;
    if (p?.controlado && !(a.mvz && a.receta_folio)) {
      volver(`${p.nombre} es controlado: falta el MVZ responsable y el folio de receta.`);
    }
    if (trabajo(a.tipo)?.requiereFoto && !(formData.get("foto") instanceof File)) {
      volver(`${trabajo(a.tipo)?.etiqueta} necesita una foto.`);
    }
  }

  const fotoUrl = await subirArchivo(supabase, formData, "foto", "trabajos", rancho.id);

  // Para la ganancia diaria hace falta con qué comparar: el pesaje anterior.
  const hayPesaje = acciones.some((a) => trabajo(a.tipo)?.porAnimal === "peso");
  const pesoPrevio = new Map<string, Pesaje>();
  if (hayPesaje) {
    const { data: previos } = await supabase
      .from("evento_animales")
      .select("animal_id, valores, eventos!inner(fecha, tipo)")
      .in("animal_id", animalIds)
      .eq("rancho_id", rancho.id)
      .in("eventos.tipo", ["pesaje", "destete"]);

    for (const fila of (previos ?? []) as unknown as {
      animal_id: string;
      valores: { peso?: number } | null;
      eventos: { fecha: string };
    }[]) {
      const peso = fila.valores?.peso;
      if (peso == null || fila.eventos.fecha > fecha) continue;
      const guardado = pesoPrevio.get(fila.animal_id);
      if (!guardado || fila.eventos.fecha > guardado.fecha) {
        pesoPrevio.set(fila.animal_id, { fecha: fila.eventos.fecha, peso });
      }
    }
  }

  const sesionId = crypto.randomUUID();
  // Desde la manga siempre hay jornada, aunque solo se haya pesado: es lo que
  // permite armar la nota de venta con lo que se acaba de marcar.
  const irAVenta = bandera(formData, "ir_a_venta");
  const unaSola = acciones.length === 1 && !irAVenta;

  for (const accion of acciones) {
    const definicion = trabajo(accion.tipo);
    const producto = accion.producto_id ? porId.get(accion.producto_id) : null;
    const cantidad = accion.cantidad ?? null;

    const costoTotal =
      accion.costo_total ??
      (producto?.costo_unitario != null && cantidad
        ? producto.costo_unitario * cantidad
        : null);

    const { data: evento, error } = await supabase
      .from("eventos")
      .insert({
        rancho_id: rancho.id,
        tipo: accion.tipo,
        fecha,
        grupo_id: grupoId,
        producto_id: accion.producto_id ?? null,
        cantidad,
        dosis: accion.dosis ?? null,
        responsable,
        resultado: accion.resultado ?? null,
        costo_total: costoTotal,
        obs,
        // Con una sola acción no hay jornada que agrupar.
        sesion_id: unaSola ? null : sesionId,
        foto_url: definicion?.requiereFoto ? fotoUrl : null,
        receta_folio: accion.receta_folio ?? null,
        mvz: accion.mvz ?? null,
        creado_por: user?.id,
      })
      .select("id")
      .single();

    if (error || !evento) volver(error?.message ?? "No se pudo guardar el trabajo.");

    // Los valores individuales solo van en la acción que los captura.
    const campoIndividual = definicion?.porAnimal;
    await supabase.from("evento_animales").insert(
      animalIds.map((animalId) => {
        const v = valores[animalId] ?? {};
        if (!campoIndividual) {
          return { rancho_id: rancho.id, evento_id: evento.id, animal_id: animalId, valores: null };
        }
        const propios: NonNullable<EventoAnimal["valores"]> = {};
        if (campoIndividual === "peso" && v.peso != null) {
          propios.peso = v.peso;
          const previo = pesoPrevio.get(animalId);
          const gdp = gananciaDiaria(previo ?? null, { fecha, peso: v.peso });
          if (gdp != null) propios.gdp = Number(gdp.toFixed(3));
        }
        if (campoIndividual === "condicion" && v.condicion != null) {
          propios.condicion = v.condicion;
        }
        if (campoIndividual === "resultado" && v.resultado) propios.resultado = v.resultado;
        if (v.obs) propios.obs = v.obs;
        if (v.destino) propios.destino = v.destino;
        return {
          rancho_id: rancho.id,
          evento_id: evento.id,
          animal_id: animalId,
          valores: Object.keys(propios).length > 0 ? propios : null,
        };
      })
    );

    if (accion.producto_id && cantidad && cantidad > 0) {
      await supabase.from("inventario_movimientos").insert({
        rancho_id: rancho.id,
        producto_id: accion.producto_id,
        tipo: "salida",
        cantidad,
        costo_unitario: producto?.costo_unitario ?? null,
        costo_total: costoTotal,
        fecha,
        evento_id: evento.id,
        obs: `Trabajo: ${definicion?.etiqueta ?? accion.tipo}`,
      });
    }

    await aplicarEfectos(supabase, rancho.id, accion.tipo, animalIds, valores, fecha);
  }

  if (bandera(formData, "guardar_plantilla")) {
    const nombre = campo(formData, "nombre_plantilla");
    if (nombre) {
      await supabase.from("plantillas_trabajo").insert({
        rancho_id: rancho.id,
        nombre,
        // La plantilla guarda el qué y con qué, nunca los animales ni la fecha.
        pasos: acciones.map((a) => ({
          tipo: a.tipo,
          producto_id: a.producto_id ?? null,
          dosis: a.dosis ?? null,
          cantidad_por_animal:
            a.cantidad && animalIds.length ? a.cantidad / animalIds.length : null,
        })),
        creado_por: user?.id,
      });
    }
  }

  revalidatePath("/trabajos");
  revalidatePath("/ganado");
  revalidatePath("/inventario");
  // "Haces una nota de venta y te lo descuenta del inventario": los animales
  // marcados en la manga llegan a la venta con su peso ya capturado.
  redirect(irAVenta ? `/ventas/nueva?sesion=${sesionId}` : "/trabajos?ok=1");
}

/** Lo que cada tipo de trabajo cambia en la ficha del animal. */
async function aplicarEfectos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ranchoId: string,
  tipo: string,
  animalIds: string[],
  valores: ValoresPorAnimal,
  fecha: string
) {
  if (tipo === "palpacion" || tipo === "ultrasonido") {
    for (const animalId of animalIds) {
      const resultado = normalizarReproductivo(valores[animalId]?.resultado);
      if (!resultado) continue;
      await supabase
        .from("animales")
        .update({ status_reproductivo: resultado })
        .eq("id", animalId)
        .eq("rancho_id", ranchoId);
    }
    return;
  }

  // El destete deja el peso en la ficha: es el dato que se pidió en la junta.
  if (tipo === "destete") {
    for (const animalId of animalIds) {
      const peso = valores[animalId]?.peso;
      await supabase
        .from("animales")
        .update({
          fecha_destete: fecha,
          ...(peso != null ? { peso_destete: peso } : {}),
        })
        .eq("id", animalId)
        .eq("rancho_id", ranchoId);
    }
  }
}
