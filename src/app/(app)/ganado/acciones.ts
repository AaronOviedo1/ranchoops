"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";

function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

function numero(formData: FormData, nombre: string): number | null {
  const v = campo(formData, nombre);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function datosAnimal(formData: FormData) {
  return {
    arete_control: campo(formData, "arete_control"),
    siniga: campo(formData, "siniga"),
    nombre: campo(formData, "nombre"),
    sexo: campo(formData, "sexo"),
    clase: campo(formData, "clase") ?? "vaca",
    raza: campo(formData, "raza"),
    fecha_nacimiento: campo(formData, "fecha_nacimiento"),
    peso_nacimiento: numero(formData, "peso_nacimiento"),
    procedencia: campo(formData, "procedencia"),
    madre_id: campo(formData, "madre_id"),
    padre_texto: campo(formData, "padre_texto"),
    division_id: campo(formData, "division_id"),
    grupo_id: campo(formData, "grupo_id"),
    status_reproductivo: campo(formData, "status_reproductivo"),
    notas: campo(formData, "notas"),
  };
}

export async function crearAnimal(formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("animales")
    .insert({ rancho_id: rancho.id, ...datosAnimal(formData) })
    .select("id")
    .single();

  if (error) {
    redirect(`/ganado/nuevo?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/ganado");
  redirect(`/ganado/${data.id}`);
}

export async function actualizarAnimal(id: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();

  const { error } = await supabase
    .from("animales")
    .update(datosAnimal(formData))
    .eq("id", id)
    .eq("rancho_id", rancho.id);

  if (error) {
    redirect(`/ganado/${id}/editar?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/ganado/${id}`);
  revalidatePath("/ganado");
  redirect(`/ganado/${id}`);
}

/** Registra el parto de una vaca: crea la cría y el evento en el historial de ambas. */
export async function registrarParto(vacaId: string, formData: FormData) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fecha = campo(formData, "fecha") ?? new Date().toISOString().slice(0, 10);
  const sexo = campo(formData, "sexo_cria");
  const dificultad = campo(formData, "dificultad");
  const obs = campo(formData, "obs");
  const malparto = formData.get("malparto") === "on";

  const { data: vaca } = await supabase
    .from("animales")
    .select("id, grupo_id, division_id, padre_texto")
    .eq("id", vacaId)
    .eq("rancho_id", rancho.id)
    .single();
  if (!vaca) redirect("/ganado");

  let criaId: string | null = null;
  if (!malparto) {
    const { data: cria, error } = await supabase
      .from("animales")
      .insert({
        rancho_id: rancho.id,
        arete_control: campo(formData, "arete_cria"),
        sexo,
        clase: sexo === "M" ? "becerro" : "becerra",
        fecha_nacimiento: fecha,
        peso_nacimiento: numero(formData, "peso_cria"),
        madre_id: vacaId,
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
    .update({ status_reproductivo: malparto ? "malparió" : "parida" })
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

  const fecha = campo(formData, "fecha") ?? new Date().toISOString().slice(0, 10);
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
