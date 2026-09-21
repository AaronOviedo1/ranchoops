"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { bandera, campo, fecha as fechaDe, lista, subirArchivo } from "@/lib/formulario";
import { normalizarReproductivo, trabajo } from "@/lib/catalogos";
import { moverAGrupo } from "@/lib/movimientos-grupo";
import { gananciaDiaria, type Pesaje } from "@/lib/pesos";
import type { EventoAnimal } from "@/lib/tipos";
import { revalidarInventario } from "../inventario/revalidar";

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
  /**
   * Solo estos animales recibieron la acción (manga: "no a todos se les hace
   * lo mismo"). Sin esto, la acción es para todos los de la jornada (wizard).
   */
  animal_ids?: string[];
  /** Foto ya subida al bucket desde la manga. Se valida que sea del rancho. */
  foto_ruta?: string | null;
};

type ValoresPorAnimal = Record<string, NonNullable<EventoAnimal["valores"]>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function leerJson<T>(formData: FormData, nombre: string, porDefecto: T): T {
  try {
    const crudo = formData.get(nombre);
    return crudo ? (JSON.parse(String(crudo)) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

/**
 * ¿Ya se guardó esta jornada? La manga lo pregunta al abrir un borrador: si la
 * señal se cayó justo al cerrar, el servidor pudo haber guardado aunque la
 * respuesta nunca llegara al teléfono.
 */
export async function existeJornada(sesionId: string): Promise<boolean> {
  if (!UUID.test(sesionId)) return false;
  const rancho = await requireRancho();
  const supabase = await createClient();
  const { data } = await supabase
    .from("eventos")
    .select("id")
    .eq("rancho_id", rancho.id)
    .eq("sesion_id", sesionId)
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * Registra una jornada de manejo completa.
 *
 * "Puedo vacunar, desparasitar, vitaminar y pesar… todo al mismo tiempo": cada
 * acción sigue siendo su propio evento (para que inventario y costos no
 * cambien de lógica), pero todas comparten un `sesion_id`. Desde el wizard
 * todas las acciones van a la misma lista de animales; desde la manga cada
 * acción trae los suyos.
 */
export async function registrarSesion(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const desdeManga = campo(formData, "origen") === "manga";

  // Declarada con `never` para que TypeScript sepa que aquí se corta el flujo.
  function volver(mensaje: string): never {
    redirect(
      `${desdeManga ? "/trabajos/manga" : "/trabajos/nuevo"}?error=${encodeURIComponent(mensaje)}`
    );
  }

  // La manga manda su propio id de jornada: así un reintento con mala señal
  // no la guarda dos veces.
  const sesionCliente = campo(formData, "sesion_id");
  if (sesionCliente && !UUID.test(sesionCliente)) volver("La jornada no es válida.");
  const sesionId = sesionCliente ?? crypto.randomUUID();
  const irAVenta = bandera(formData, "ir_a_venta");
  const exito = irAVenta ? `/ventas/nueva?sesion=${sesionId}` : "/trabajos?ok=1";
  if (sesionCliente && (await existeJornada(sesionCliente))) redirect(exito);

  const acciones = leerJson<AccionSesion[]>(formData, "acciones", []);
  const separar = leerJson<Record<string, string>>(formData, "separar", {});
  if (acciones.length === 0 && Object.keys(separar).length === 0) {
    volver("Elige al menos un trabajo.");
  }

  const animalIds = lista(formData, "animal_id");
  if (animalIds.length === 0) volver("Elige al menos un animal.");
  const enJornada = new Set(animalIds);
  const idsDe = (accion: AccionSesion) =>
    accion.animal_ids ? accion.animal_ids.filter((id) => enJornada.has(id)) : animalIds;

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

  const hayFotoGeneral = formData.get("foto") instanceof File;
  for (const a of acciones) {
    const p = a.producto_id ? porId.get(a.producto_id) : null;
    if (p?.controlado && !(a.mvz && a.receta_folio)) {
      volver(`${p.nombre} es controlado: falta el MVZ responsable y el folio de receta.`);
    }
    // La ruta viene del cliente: solo vale si apunta a la carpeta del rancho.
    if (a.foto_ruta && !a.foto_ruta.startsWith(`${rancho.id}/trabajos/`)) {
      volver("La foto no es de este rancho.");
    }
    if (trabajo(a.tipo)?.requiereFoto && !a.foto_ruta && !hayFotoGeneral) {
      volver(`${trabajo(a.tipo)?.etiqueta} necesita una foto.`);
    }
  }

  // El grupo destino también viene del cliente: tiene que ser del rancho.
  const gruposDestino = [...new Set(Object.values(separar))];
  if (gruposDestino.length > 0) {
    const { data: validos } = await supabase
      .from("grupos")
      .select("id")
      .in("id", gruposDestino)
      .eq("rancho_id", rancho.id);
    if ((validos ?? []).length !== gruposDestino.length) {
      volver("Uno de los grupos para separar ya no existe.");
    }
  }

  const fotoUrl = await subirArchivo(supabase, formData, "foto", "trabajos", rancho.id);

  // Para la ganancia diaria hace falta con qué comparar: el pesaje anterior.
  const pesados = [
    ...new Set(
      acciones.filter((a) => trabajo(a.tipo)?.porAnimal === "peso").flatMap(idsDe)
    ),
  ];
  const pesoPrevio = new Map<string, Pesaje>();
  if (pesados.length > 0) {
    const { data: previos } = await supabase
      .from("evento_animales")
      .select("animal_id, valores, eventos!inner(fecha, tipo)")
      .in("animal_id", pesados)
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

  // Desde la manga siempre hay jornada, aunque solo se haya pesado: es lo que
  // permite armar la nota de venta con lo que se acaba de marcar, y lo que
  // hace que un reintento no se guarde dos veces.
  const unaSola = acciones.length === 1 && !irAVenta && !desdeManga;

  // La observación y el destino del animal se guardan una sola vez: en su
  // pesaje si lo tiene, y si no en el primer trabajo que se le hizo. Si no, la
  // misma nota saldría repetida en cada renglón de su historial.
  const filaPrincipal = new Map<string, number>();
  acciones.forEach((accion, i) => {
    const esPeso = trabajo(accion.tipo)?.porAnimal === "peso";
    for (const id of idsDe(accion)) {
      const previa = filaPrincipal.get(id);
      const previaEsPeso =
        previa != null && trabajo(acciones[previa].tipo)?.porAnimal === "peso";
      if (previa == null || (esPeso && !previaEsPeso)) filaPrincipal.set(id, i);
    }
  });

  // Todo se arma primero y se guarda en tres inserts: con 200 animales por la
  // manga, ir acción por acción eran cientos de viajes al servidor.
  const filasEvento: Record<string, unknown>[] = [];
  const filasAnimal: Record<string, unknown>[] = [];
  const filasInventario: Record<string, unknown>[] = [];

  acciones.forEach((accion, i) => {
    const ids = idsDe(accion);
    if (ids.length === 0) return;

    const definicion = trabajo(accion.tipo);
    const producto = accion.producto_id ? porId.get(accion.producto_id) : null;
    const cantidad = accion.cantidad ?? null;
    const eventoId = crypto.randomUUID();

    const costoTotal =
      accion.costo_total ??
      (producto?.costo_unitario != null && cantidad
        ? producto.costo_unitario * cantidad
        : null);

    filasEvento.push({
      id: eventoId,
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
      // Con una sola acción del wizard no hay jornada que agrupar.
      sesion_id: unaSola ? null : sesionId,
      foto_url: definicion?.requiereFoto ? (accion.foto_ruta ?? fotoUrl) : null,
      receta_folio: accion.receta_folio ?? null,
      mvz: accion.mvz ?? null,
      creado_por: user?.id,
    });

    // Los valores individuales solo van en la acción que los captura.
    const campoIndividual = definicion?.porAnimal;
    for (const animalId of ids) {
      const v = valores[animalId] ?? {};
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
      if (filaPrincipal.get(animalId) === i) {
        if (v.obs) propios.obs = v.obs;
        if (v.destino) propios.destino = v.destino;
      }
      filasAnimal.push({
        rancho_id: rancho.id,
        evento_id: eventoId,
        animal_id: animalId,
        valores: Object.keys(propios).length > 0 ? propios : null,
      });
    }

    if (accion.producto_id && cantidad && cantidad > 0) {
      filasInventario.push({
        rancho_id: rancho.id,
        producto_id: accion.producto_id,
        tipo: "salida",
        cantidad,
        costo_unitario: producto?.costo_unitario ?? null,
        costo_total: costoTotal,
        fecha,
        evento_id: eventoId,
        obs: `Trabajo: ${definicion?.etiqueta ?? accion.tipo}`,
      });
    }
  });

  if (filasEvento.length > 0) {
    const { error } = await supabase.from("eventos").insert(filasEvento);
    if (error) volver(error.message);

    // Si algo falla después, se deshace la jornada entera: los renglones por
    // animal se van en cascada con su evento.
    const deshacer = async (mensaje: string): Promise<never> => {
      await supabase
        .from("eventos")
        .delete()
        .in("id", filasEvento.map((f) => f.id as string))
        .eq("rancho_id", rancho.id);
      return volver(mensaje);
    };

    const { error: errorAnimales } = await supabase.from("evento_animales").insert(filasAnimal);
    if (errorAnimales) await deshacer(errorAnimales.message);

    if (filasInventario.length > 0) {
      const { error: errorInventario } = await supabase
        .from("inventario_movimientos")
        .insert(filasInventario);
      if (errorInventario) await deshacer(errorInventario.message);
    }
  }

  for (const accion of acciones) {
    await aplicarEfectos(supabase, rancho.id, accion.tipo, idsDe(accion), valores, fecha);
  }

  // "Y lo mismo para separarlo": los apartados en la manga se pasan a su grupo
  // al cerrar, y el cambio queda como parte de la misma jornada.
  const porGrupo = new Map<string, string[]>();
  for (const [animalId, destino] of Object.entries(separar)) {
    if (!enJornada.has(animalId)) continue;
    const ids = porGrupo.get(destino);
    if (ids) ids.push(animalId);
    else porGrupo.set(destino, [animalId]);
  }
  for (const [destino, ids] of porGrupo) {
    await moverAGrupo(supabase, {
      ranchoId: rancho.id,
      animalIds: ids,
      grupoId: destino,
      fecha,
      usuarioId: user?.id,
      sesionId,
    });
  }

  if (bandera(formData, "guardar_plantilla")) {
    const nombre = campo(formData, "nombre_plantilla");
    if (nombre) {
      await supabase.from("plantillas_trabajo").insert({
        rancho_id: rancho.id,
        nombre,
        // La plantilla guarda el qué y con qué, nunca los animales ni la fecha.
        pasos: acciones.map((a) => {
          const cabezas = idsDe(a).length;
          return {
            tipo: a.tipo,
            producto_id: a.producto_id ?? null,
            dosis: a.dosis ?? null,
            cantidad_por_animal: a.cantidad && cabezas ? a.cantidad / cabezas : null,
          };
        }),
        creado_por: user?.id,
      });
    }
  }

  revalidatePath("/trabajos");
  revalidatePath("/ganado");
  if (porGrupo.size > 0) revalidatePath("/grupos");
  revalidarInventario();
  // "Haces una nota de venta y te lo descuenta del inventario": los animales
  // marcados en la manga llegan a la venta con su peso ya capturado.
  redirect(exito);
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
    // Un update por resultado, no por animal.
    const porResultado = new Map<string, string[]>();
    for (const animalId of animalIds) {
      const resultado = normalizarReproductivo(valores[animalId]?.resultado);
      if (!resultado) continue;
      const ids = porResultado.get(resultado);
      if (ids) ids.push(animalId);
      else porResultado.set(resultado, [animalId]);
    }
    for (const [resultado, ids] of porResultado) {
      await supabase
        .from("animales")
        .update({ status_reproductivo: resultado })
        .in("id", ids)
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
