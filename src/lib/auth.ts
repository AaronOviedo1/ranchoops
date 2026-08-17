import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Rancho } from "@/lib/tipos";

export async function getUsuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Devuelve el rancho activo del usuario (cookie `rancho_activo` o su primer rancho).
 * Redirige a /login sin sesión y a /crear-rancho sin membresías.
 */
export async function requireRancho(): Promise<Rancho> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membresias } = await supabase
    .from("rancho_usuarios")
    .select("rancho_id, ranchos(*)")
    .eq("usuario_id", user.id);

  if (!membresias || membresias.length === 0) redirect("/crear-rancho");

  const cookieStore = await cookies();
  const preferido = cookieStore.get("rancho_activo")?.value;
  const activa =
    membresias.find((m) => m.rancho_id === preferido) ?? membresias[0];

  return activa.ranchos as unknown as Rancho;
}
