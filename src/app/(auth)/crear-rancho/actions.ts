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

  // Crea rancho + membresía de forma atómica (ver migración 0003)
  const { data: ranchoId, error } = await supabase.rpc("crear_rancho_con_membresia", {
    p_nombre: nombre,
    p_upp: upp,
  });
  if (error || !ranchoId) {
    redirect(
      `/crear-rancho?error=${encodeURIComponent(error?.message ?? "No se pudo crear el rancho")}`
    );
  }

  // Catálogos iniciales
  await supabase.from("divisiones").insert(
    DIVISIONES_INICIALES.map((n) => ({ rancho_id: ranchoId, nombre: n }))
  );
  await supabase.from("productos").insert(
    PRODUCTOS_INICIALES.map((p) => ({ rancho_id: ranchoId, ...p }))
  );

  redirect("/");
}
