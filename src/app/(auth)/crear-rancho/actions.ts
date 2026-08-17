"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DIVISIONES_INICIALES, PRODUCTOS_INICIALES } from "@/lib/catalogos";

export async function crearRancho(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const upp = String(formData.get("upp") ?? "").trim() || null;
  if (!nombre) redirect(`/crear-rancho?error=${encodeURIComponent("Escribe el nombre del rancho")}`);

  const { data: rancho, error } = await supabase
    .from("ranchos")
    .insert({ nombre, upp })
    .select()
    .single();
  if (error || !rancho) {
    redirect(`/crear-rancho?error=${encodeURIComponent(error?.message ?? "No se pudo crear el rancho")}`);
  }

  const { error: errorMembresia } = await supabase.from("rancho_usuarios").insert({
    rancho_id: rancho.id,
    usuario_id: user.id,
    rol: "admin",
  });
  if (errorMembresia) {
    redirect(`/crear-rancho?error=${encodeURIComponent(errorMembresia.message)}`);
  }

  // Catálogos iniciales
  await supabase.from("divisiones").insert(
    DIVISIONES_INICIALES.map((n) => ({ rancho_id: rancho.id, nombre: n }))
  );
  await supabase.from("productos").insert(
    PRODUCTOS_INICIALES.map((p) => ({ rancho_id: rancho.id, ...p }))
  );

  redirect("/");
}
