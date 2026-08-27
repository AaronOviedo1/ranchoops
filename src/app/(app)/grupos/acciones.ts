"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import { fechaHoy } from "@/lib/fechas";
import { campo, lista } from "@/lib/formulario";

export async function crearGrupo(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const nombre = campo(formData, "nombre");
  if (!nombre) redirect("/grupos");

  const { data, error } = await supabase
    .from("grupos")
    .insert({
      rancho_id: rancho.id,
      nombre,
      division_id: campo(formData, "division_id"),
      notas: campo(formData, "notas"),
    })
    .select("id")
    .single();

  if (error) redirect(`/grupos?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/grupos");
  redirect(`/grupos/${data.id}`);
}

/**
 * Arma un grupo con los animales que están en cierto estado.
 *
 * Es el flujo de la junta: se palpa todo, y de ahí salen las cargadas por un
 * lado, las vacías por otro, y las vacías horras al grupo de venta.
 */
export async function crearGrupoPorEstado(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nombre = campo(formData, "nombre");
  const estados = lista(formData, "estado");
  const clases = lista(formData, "clase");
  if (!nombre || (estados.length === 0 && clases.length === 0)) {
    redirect(`/grupos?error=${encodeURIComponent("Ponle nombre y elige al menos un criterio.")}`);
  }

  const { data: grupo, error } = await supabase
    .from("grupos")
    .insert({
      rancho_id: rancho.id,
      nombre,
      division_id: campo(formData, "division_id"),
      notas: campo(formData, "notas"),
    })
    .select("id")
    .single();
  if (error || !grupo) {
    redirect(`/grupos?error=${encodeURIComponent(error?.message ?? "No se pudo crear")}`);
  }

  let query = supabase
    .from("animales")
    .select("id")
    .eq("rancho_id", rancho.id)
    .eq("status", "activo");
  if (estados.length > 0) query = query.in("status_reproductivo", estados);
  if (clases.length > 0) query = query.in("clase", clases);

  const { data: candidatos } = await query;
  const ids = (candidatos ?? []).map((a) => a.id);

  if (ids.length > 0) {
    await supabase
      .from("animales")
      .update({ grupo_id: grupo.id })
      .in("id", ids)
      .eq("rancho_id", rancho.id);

    const { data: evento } = await supabase
      .from("eventos")
      .insert({
        rancho_id: rancho.id,
        tipo: "cambio_grupo",
        fecha: fechaHoy(),
        grupo_id: grupo.id,
        resultado: `${ids.length} animales a ${nombre}`,
        creado_por: user?.id,
      })
      .select("id")
      .single();

    if (evento) {
      await supabase.from("evento_animales").insert(
        ids.map((animal_id) => ({ rancho_id: rancho.id, evento_id: evento.id, animal_id }))
      );
    }
  }

  revalidatePath("/grupos");
  revalidatePath("/ganado");
  redirect(`/grupos/${grupo.id}`);
}

export async function archivarGrupo(grupoId: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  await supabase
    .from("animales")
    .update({ grupo_id: null })
    .eq("grupo_id", grupoId)
    .eq("rancho_id", rancho.id);
  await supabase
    .from("grupos")
    .update({ activo: false })
    .eq("id", grupoId)
    .eq("rancho_id", rancho.id);
  revalidatePath("/grupos");
  redirect("/grupos");
}

/** Asigna animales al grupo y deja constancia en su historial. */
export async function asignarAnimales(grupoId: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ids = formData.getAll("animal_id").map(String).filter(Boolean);
  if (ids.length === 0) redirect(`/grupos/${grupoId}`);

  await supabase
    .from("animales")
    .update({ grupo_id: grupoId })
    .in("id", ids)
    .eq("rancho_id", rancho.id);

  const { data: evento } = await supabase
    .from("eventos")
    .insert({
      rancho_id: rancho.id,
      tipo: "cambio_grupo",
      fecha: fechaHoy(),
      grupo_id: grupoId,
      resultado: "entrada al grupo",
      creado_por: user?.id,
    })
    .select("id")
    .single();
  if (evento) {
    await supabase.from("evento_animales").insert(
      ids.map((animalId) => ({
        rancho_id: rancho.id,
        evento_id: evento.id,
        animal_id: animalId,
        valores: { resultado: "entrada al grupo" },
      }))
    );
  }

  revalidatePath(`/grupos/${grupoId}`);
  revalidatePath("/ganado");
  redirect(`/grupos/${grupoId}`);
}

export async function quitarAnimal(grupoId: string, animalId: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  await supabase
    .from("animales")
    .update({ grupo_id: null })
    .eq("id", animalId)
    .eq("rancho_id", rancho.id);
  revalidatePath(`/grupos/${grupoId}`);
}

/**
 * Mueve el grupo a otro potrero: cierra la ocupación abierta (con buñiga/residuo)
 * y abre la nueva. Con potrero destino vacío, solo registra la salida.
 */
export async function moverAPotrero(grupoId: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const potreroDestino = campo(formData, "potrero_id");
  const fecha = campo(formData, "fecha") ?? fechaHoy();
  const numAnimales = campo(formData, "num_animales");
  const califBuniga = campo(formData, "calif_buniga");
  const residuo = campo(formData, "residuo");
  const obs = campo(formData, "obs");

  // Cierra la ocupación abierta del grupo
  const { data: abierta } = await supabase
    .from("grupo_movimientos")
    .select("id, potrero_id")
    .eq("grupo_id", grupoId)
    .eq("rancho_id", rancho.id)
    .is("fecha_salida", null)
    .order("fecha_entrada", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (abierta) {
    await supabase
      .from("grupo_movimientos")
      .update({
        fecha_salida: fecha,
        num_animales_salida: numAnimales ? Number(numAnimales) : null,
        calif_buniga: califBuniga ? Number(califBuniga) : null,
        residuo,
        obs,
      })
      .eq("id", abierta.id);
  }

  if (potreroDestino) {
    await supabase.from("grupo_movimientos").insert({
      rancho_id: rancho.id,
      grupo_id: grupoId,
      potrero_id: potreroDestino,
      fecha_entrada: fecha,
      num_animales_entrada: numAnimales ? Number(numAnimales) : null,
    });
  }

  await supabase
    .from("grupos")
    .update({ potrero_actual_id: potreroDestino })
    .eq("id", grupoId)
    .eq("rancho_id", rancho.id);

  await supabase.from("eventos").insert({
    rancho_id: rancho.id,
    tipo: "movimiento_potrero",
    fecha,
    grupo_id: grupoId,
    potrero_id: potreroDestino,
    resultado: potreroDestino ? "cambio de potrero" : "salida de potrero",
    obs,
    creado_por: user?.id,
  });

  revalidatePath(`/grupos/${grupoId}`);
  revalidatePath("/potreros");
  revalidatePath("/mapa");
  redirect(`/grupos/${grupoId}`);
}

/**
 * Elimina un grupo.
 *
 * Si nunca pisó un potrero se borra de veras; si tiene historial de pastoreo
 * se archiva, porque borrarlo arrastraría en cascada sus ocupaciones y con
 * ellas las cabezas-día del potrero, que es de donde sale la carga animal.
 * En los dos casos los animales quedan libres: no se borra ni uno.
 */
export async function eliminarGrupo(id: string) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const hoy = fechaHoy();

  const { count: movimientos } = await supabase
    .from("grupo_movimientos")
    .select("id", { count: "exact", head: true })
    .eq("grupo_id", id)
    .eq("rancho_id", rancho.id);

  // Los animales salen primero: si el grupo se archiva, no pueden quedarse
  // apuntando a uno que ya no sale en ninguna lista.
  const { error: errorAnimales } = await supabase
    .from("animales")
    .update({ grupo_id: null })
    .eq("grupo_id", id)
    .eq("rancho_id", rancho.id);
  if (errorAnimales) {
    redirect(`/grupos?error=${encodeURIComponent(errorAnimales.message)}`);
  }

  if ((movimientos ?? 0) > 0) {
    // Cierra la ocupación abierta: si no, el potrero se queda ocupado para
    // siempre por un grupo que ya no existe.
    await supabase
      .from("grupo_movimientos")
      .update({ fecha_salida: hoy })
      .eq("grupo_id", id)
      .eq("rancho_id", rancho.id)
      .is("fecha_salida", null);

    const { error } = await supabase
      .from("grupos")
      .update({ activo: false, potrero_actual_id: null })
      .eq("id", id)
      .eq("rancho_id", rancho.id);
    if (error) redirect(`/grupos?error=${encodeURIComponent(error.message)}`);
  } else {
    const { error } = await supabase
      .from("grupos")
      .delete()
      .eq("id", id)
      .eq("rancho_id", rancho.id);
    if (error) redirect(`/grupos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/grupos");
  revalidatePath("/potreros");
  revalidatePath("/mapa");
  redirect("/grupos");
}
