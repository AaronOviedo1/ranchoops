"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { fechaHoy } from "@/lib/fechas";
import { bandera, campo, fecha as fechaDe, lista, numero, subirArchivo } from "@/lib/formulario";
import { borrarArchivo } from "@/lib/archivos";
import {
  clasesDe,
  especieDeClase,
  etiquetaArete,
  normalizarReproductivo,
} from "@/lib/catalogos";
import { claseSugerida } from "@/lib/ciclo-vida";
import type { EventoAnimal } from "@/lib/tipos";
import type { FilaImportada } from "@/lib/importar-ganado";

function datosAnimal(formData: FormData) {
  const clase = campo(formData, "clase") ?? "vaca";
  return {
    arete_control: campo(formData, "arete_control"),
    siniga: campo(formData, "siniga"),
    nombre: campo(formData, "nombre"),
    sexo: campo(formData, "sexo"),
    especie: campo(formData, "especie") ?? especieDeClase(clase),
    clase,
    raza: campo(formData, "raza"),
    color_pelaje: campo(formData, "color_pelaje"),
    fecha_en_campo: campo(formData, "fecha_en_campo"),
    fecha_ingreso_grupo: campo(formData, "fecha_ingreso_grupo"),
    // El arete solo se captura en el bloque del alta. Al editar el animal esos
    // campos no vienen en el formulario, y lo que no viene no se toca.
    ...(formData.has("tipo_arete") ? { tipo_arete: campo(formData, "tipo_arete") } : {}),
    ...(formData.has("fecha_identificacion")
      ? { fecha_identificacion: campo(formData, "fecha_identificacion") }
      : {}),
    fecha_nacimiento: campo(formData, "fecha_nacimiento"),
    peso_nacimiento: numero(formData, "peso_nacimiento"),
    peso_destete: numero(formData, "peso_destete"),
    fecha_destete: campo(formData, "fecha_destete"),
    peso_objetivo: numero(formData, "peso_objetivo"),
    fecha_objetivo: campo(formData, "fecha_objetivo"),
    procedencia: campo(formData, "procedencia"),
    madre_id: campo(formData, "madre_id"),
    padre_id: campo(formData, "padre_id"),
    padre_texto: campo(formData, "padre_texto"),
    division_id: campo(formData, "division_id"),
    grupo_id: campo(formData, "grupo_id"),
    status_reproductivo: normalizarReproductivo(campo(formData, "status_reproductivo")),
    notas: campo(formData, "notas"),
  };
}

/**
 * Convierte en eventos los bloques que se abrieron en el alta.
 *
 * Cada bloque trae su propia fecha: el arete se le puso el martes, se pesó el
 * jueves. Se guardan como eventos normales para que salgan en la bitácora y
 * en el historial del animal, igual que si se hubieran capturado en la manga.
 */
async function registrosDeAlta(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ranchoId: string,
  animalId: string,
  formData: FormData,
  creadoPor?: string
) {
  const evento = async (
    tipo: string,
    fecha: string,
    extra: Record<string, unknown>,
    valores: EventoAnimal["valores"] = null
  ) => {
    const { data } = await supabase
      .from("eventos")
      .insert({ rancho_id: ranchoId, tipo, fecha, creado_por: creadoPor, ...extra })
      .select("id")
      .single();
    if (!data) return;
    await supabase.from("evento_animales").insert({
      rancho_id: ranchoId,
      evento_id: data.id,
      animal_id: animalId,
      valores,
    });
  };

  const fechaArete = campo(formData, "fecha_identificacion");
  const tipoArete = campo(formData, "tipo_arete");
  if (fechaArete && tipoArete) {
    await evento("aretado", fechaArete, { resultado: etiquetaArete(tipoArete) });
  }

  const fechaMovimiento = campo(formData, "fecha_movimiento");
  if (fechaMovimiento) {
    await evento("movimiento_potrero", fechaMovimiento, {
      potrero_id: campo(formData, "potrero_movimiento"),
    });
  }

  const fechaPesaje = campo(formData, "fecha_pesaje");
  const peso = numero(formData, "peso");
  if (fechaPesaje && peso != null) {
    await evento(
      "pesaje",
      fechaPesaje,
      { detalle: { evento_pesaje: campo(formData, "evento_pesaje") ?? "control" } },
      { peso }
    );
  }

  const fechaCondicion = campo(formData, "fecha_condicion");
  const condicion = numero(formData, "condicion");
  if (fechaCondicion && condicion != null) {
    await evento("condicion_corporal", fechaCondicion, {}, { condicion });
  }
}

export async function crearAnimal(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const foto_url = await subirArchivo(supabase, formData, "foto", "animales", rancho.id);

  const { data, error } = await supabase
    .from("animales")
    .insert({ rancho_id: rancho.id, ...datosAnimal(formData), foto_url })
    .select("id")
    .single();

  if (error) {
    redirect(`/ganado/nuevo?error=${encodeURIComponent(error.message)}`);
  }

  await registrosDeAlta(supabase, rancho.id, data.id, formData, user?.id);

  // Alta que viene de una compra: se liga y se regresa a la compra, que
  // lleva la cuenta de cuántos van dados de alta.
  const compraId = campo(formData, "compra_id");
  if (compraId) {
    await supabase.from("compra_animales").insert({
      compra_id: compraId,
      animal_id: data.id,
      rancho_id: rancho.id,
    });
    revalidatePath("/ganado");
    revalidatePath(`/compras/${compraId}`);
    redirect(`/compras/${compraId}`);
  }

  revalidatePath("/ganado");
  revalidatePath("/bitacora");
  redirect(`/ganado/${data.id}`);
}

export async function actualizarAnimal(id: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { data: previo } = await supabase
    .from("animales")
    .select("foto_url")
    .eq("id", id)
    .eq("rancho_id", rancho.id)
    .single();

  // Foto nueva reemplaza a la anterior; el botón de quitar la borra.
  const subida = await subirArchivo(supabase, formData, "foto", "animales", rancho.id);
  const quitar = bandera(formData, "foto_quitar");
  const foto_url = subida ?? (quitar ? null : previo?.foto_url ?? null);
  if (previo?.foto_url && foto_url !== previo.foto_url) {
    await borrarArchivo(supabase, previo.foto_url);
  }

  const { error } = await supabase
    .from("animales")
    .update({ ...datosAnimal(formData), foto_url })
    .eq("id", id)
    .eq("rancho_id", rancho.id);

  if (error) {
    redirect(`/ganado/${id}/editar?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/ganado/${id}`);
  revalidatePath("/ganado");
  redirect(`/ganado/${id}`);
}

/**
 * Aplica la clase que le toca por edad a los animales indicados.
 *
 * La app nunca lo hace sola: `/ganado` muestra cuántos van y alguien confirma.
 */
export async function reclasificarPorEdad(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const ids = lista(formData, "animal_id");
  if (ids.length === 0) redirect("/ganado");

  const { data: animales } = await supabase
    .from("animales")
    .select("id, especie, clase, sexo, fecha_nacimiento")
    .eq("rancho_id", rancho.id)
    .eq("status", "activo")
    .in("id", ids);

  // Se recalcula del lado del servidor: el formulario solo dice a quiénes.
  for (const a of animales ?? []) {
    const sugerida = claseSugerida(a);
    if (!sugerida || sugerida === a.clase) continue;
    await supabase
      .from("animales")
      .update({ clase: sugerida })
      .eq("id", a.id)
      .eq("rancho_id", rancho.id);
  }

  revalidatePath("/ganado");
  redirect("/ganado");
}

/** Mueve varios animales a otro grupo o división de una sola pasada. */
export async function moverAnimales(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ids = lista(formData, "animal_id");
  const grupoId = campo(formData, "grupo_id");
  const divisionId = campo(formData, "division_id");
  const destino = campo(formData, "destino"); // "grupo" | "division"
  if (ids.length === 0) redirect("/ganado");

  const cambios =
    destino === "division" ? { division_id: divisionId } : { grupo_id: grupoId };

  const { error } = await supabase
    .from("animales")
    .update(cambios)
    .in("id", ids)
    .eq("rancho_id", rancho.id);

  if (error) redirect(`/ganado?error=${encodeURIComponent(error.message)}`);

  if (destino !== "division") {
    const { data: evento } = await supabase
      .from("eventos")
      .insert({
        rancho_id: rancho.id,
        tipo: "cambio_grupo",
        fecha: fechaDe(formData),
        grupo_id: grupoId,
        resultado: `${ids.length} animales`,
        creado_por: user?.id,
      })
      .select("id")
      .single();

    if (evento) {
      await supabase.from("evento_animales").insert(
        ids.map((animal_id) => ({
          rancho_id: rancho.id,
          evento_id: evento.id,
          animal_id,
        }))
      );
    }
  }

  revalidatePath("/ganado");
  revalidatePath("/grupos");
  redirect("/ganado");
}

/** Registra el parto de una vaca: crea la cría y el evento en el historial de ambas. */
export async function registrarParto(vacaId: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fecha = campo(formData, "fecha") ?? fechaHoy();
  const sexo = campo(formData, "sexo_cria");
  const dificultad = campo(formData, "dificultad");
  const obs = campo(formData, "obs");
  const malparto = formData.get("malparto") === "on";

  const { data: vaca } = await supabase
    .from("animales")
    .select("id, grupo_id, division_id, padre_id, padre_texto, especie")
    .eq("id", vacaId)
    .eq("rancho_id", rancho.id)
    .single();
  if (!vaca) redirect("/ganado");

  // La cría nace de la especie de la madre, con la clase de cría que le toca.
  const especie = vaca.especie ?? "bovino";
  const claseCria =
    clasesDe(especie).find((c) => c.cria && (!c.sexo || c.sexo === sexo))?.valor ??
    (sexo === "M" ? "becerro" : "becerra");

  let criaId: string | null = null;
  if (!malparto) {
    const { data: cria, error } = await supabase
      .from("animales")
      .insert({
        rancho_id: rancho.id,
        arete_control: campo(formData, "arete_cria"),
        sexo,
        especie,
        clase: claseCria,
        fecha_nacimiento: fecha,
        peso_nacimiento: numero(formData, "peso_cria"),
        madre_id: vacaId,
        padre_id: campo(formData, "padre_id") ?? vaca.padre_id,
        padre_texto: campo(formData, "padre_texto"),
        grupo_id: vaca.grupo_id,
        division_id: vaca.division_id,
      })
      .select("id")
      .single();
    if (error) {
      redirect(`/ganado/${vacaId}?error=${encodeURIComponent(error.message)}`);
    }
    criaId = cria.id;
  }

  const { data: evento } = await supabase
    .from("eventos")
    .insert({
      rancho_id: rancho.id,
      tipo: "parto",
      fecha,
      grupo_id: vaca.grupo_id,
      resultado: malparto ? "malparto" : `cría ${sexo ?? ""}`.trim(),
      obs,
      detalle: { cria_id: criaId, dificultad, malparto },
      creado_por: user?.id,
    })
    .select("id")
    .single();

  if (evento) {
    const filas = [{ rancho_id: rancho.id, evento_id: evento.id, animal_id: vacaId, valores: { resultado: malparto ? "malparto" : "parida" } }];
    if (criaId) {
      filas.push({ rancho_id: rancho.id, evento_id: evento.id, animal_id: criaId, valores: { resultado: "nacimiento" } });
    }
    await supabase.from("evento_animales").insert(filas);
  }

  await supabase
    .from("animales")
    .update({ status_reproductivo: malparto ? "malparto" : "parida" })
    .eq("id", vacaId);

  revalidatePath(`/ganado/${vacaId}`);
  revalidatePath("/ganado");
  redirect(`/ganado/${vacaId}`);
}

/** Da de baja un animal por muerte, conservando su historial. */
export async function registrarMuerte(animalId: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fecha = campo(formData, "fecha") ?? fechaHoy();
  const causa = campo(formData, "causa");

  const { data: animal } = await supabase
    .from("animales")
    .select("id, grupo_id")
    .eq("id", animalId)
    .eq("rancho_id", rancho.id)
    .single();
  if (!animal) redirect("/ganado");

  const { data: evento } = await supabase
    .from("eventos")
    .insert({
      rancho_id: rancho.id,
      tipo: "muerte",
      fecha,
      grupo_id: animal.grupo_id,
      resultado: causa,
      creado_por: user?.id,
    })
    .select("id")
    .single();
  if (evento) {
    await supabase.from("evento_animales").insert({
      rancho_id: rancho.id,
      evento_id: evento.id,
      animal_id: animalId,
      valores: { obs: causa ?? undefined },
    });
  }

  await supabase
    .from("animales")
    .update({ status: "muerto", fecha_salida: fecha, causa_salida: causa, grupo_id: null })
    .eq("id", animalId);

  revalidatePath(`/ganado/${animalId}`);
  revalidatePath("/ganado");
  redirect(`/ganado/${animalId}`);
}


/**
 * Mete al rancho un lote de animales leído de un CSV.
 *
 * Las filas llegan ya normalizadas del navegador (ahí se hizo el mapeo de
 * columnas y la vista previa). Aquí solo se resuelven los nombres de grupo y
 * división contra los que existen, se filtran los aretes repetidos y se
 * insertan por tandas.
 */
export async function importarGanado(
  filas: FilaImportada[],
  opciones: { omitirRepetidos: boolean; crearFaltantes: boolean }
): Promise<{ importados: number; omitidos: number; grupos: number; divisiones: number }> {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const clave = (n: string) => n.trim().toLowerCase();

  // --- Grupos y divisiones: del nombre del archivo al id del rancho ---
  const [{ data: gruposExistentes }, { data: divisionesExistentes }] = await Promise.all([
    supabase.from("grupos").select("id, nombre").eq("rancho_id", rancho.id),
    supabase.from("divisiones").select("id, nombre").eq("rancho_id", rancho.id),
  ]);

  const grupos = new Map((gruposExistentes ?? []).map((g) => [clave(g.nombre), g.id]));
  const divisiones = new Map(
    (divisionesExistentes ?? []).map((d) => [clave(d.nombre), d.id])
  );

  let gruposNuevos = 0;
  let divisionesNuevas = 0;

  if (opciones.crearFaltantes) {
    const faltanGrupos = [
      ...new Set(
        filas.map((f) => f.grupo?.trim()).filter((n): n is string => !!n && !grupos.has(clave(n)))
      ),
    ];
    if (faltanGrupos.length > 0) {
      const { data } = await supabase
        .from("grupos")
        .insert(faltanGrupos.map((nombre) => ({ rancho_id: rancho.id, nombre })))
        .select("id, nombre");
      for (const g of data ?? []) grupos.set(clave(g.nombre), g.id);
      gruposNuevos = data?.length ?? 0;
    }

    const faltanDivisiones = [
      ...new Set(
        filas
          .map((f) => f.division?.trim())
          .filter((n): n is string => !!n && !divisiones.has(clave(n)))
      ),
    ];
    if (faltanDivisiones.length > 0) {
      const { data } = await supabase
        .from("divisiones")
        .insert(faltanDivisiones.map((nombre) => ({ rancho_id: rancho.id, nombre })))
        .select("id, nombre");
      for (const d of data ?? []) divisiones.set(clave(d.nombre), d.id);
      divisionesNuevas = data?.length ?? 0;
    }
  }

  // --- Aretes que ya están en el rancho ---
  let aImportar = filas;
  let omitidos = 0;

  if (opciones.omitirRepetidos) {
    const aretes = filas.map((f) => f.arete_control).filter((a): a is string => !!a);
    const yaEstan = new Set<string>();

    // De tanda en tanda: un `in` con miles de aretes no pasa por la URL.
    for (let i = 0; i < aretes.length; i += 200) {
      const { data } = await supabase
        .from("animales")
        .select("arete_control")
        .eq("rancho_id", rancho.id)
        .in("arete_control", aretes.slice(i, i + 200));
      for (const a of data ?? []) if (a.arete_control) yaEstan.add(clave(a.arete_control));
    }

    // También los que vienen repetidos dentro del propio archivo.
    const vistos = new Set<string>();
    aImportar = filas.filter((f) => {
      if (!f.arete_control) return true;
      const k = clave(f.arete_control);
      if (yaEstan.has(k) || vistos.has(k)) {
        omitidos++;
        return false;
      }
      vistos.add(k);
      return true;
    });
  }

  const registros = aImportar.map((f) => ({
    rancho_id: rancho.id,
    arete_control: f.arete_control,
    siniga: f.siniga,
    nombre: f.nombre,
    sexo: f.sexo,
    especie: f.especie,
    clase: f.clase,
    raza: f.raza,
    color_pelaje: f.color_pelaje,
    fecha_nacimiento: f.fecha_nacimiento,
    peso_nacimiento: f.peso_nacimiento,
    peso_destete: f.peso_destete,
    fecha_destete: f.fecha_destete,
    procedencia: f.procedencia,
    status_reproductivo: f.status_reproductivo,
    grupo_id: f.grupo ? (grupos.get(clave(f.grupo)) ?? null) : null,
    division_id: f.division ? (divisiones.get(clave(f.division)) ?? null) : null,
    notas: f.notas,
  }));

  let importados = 0;
  for (let i = 0; i < registros.length; i += 200) {
    const tanda = registros.slice(i, i + 200);
    const { error } = await supabase.from("animales").insert(tanda);
    if (error) {
      throw new Error(
        `Se importaron ${importados} animales y falló el renglón ${aImportar[i]?.linea}: ${error.message}`
      );
    }
    importados += tanda.length;
  }

  revalidatePath("/ganado");
  revalidatePath("/grupos");
  return { importados, omitidos, grupos: gruposNuevos, divisiones: divisionesNuevas };
}
