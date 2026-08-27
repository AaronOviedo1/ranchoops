import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Rancho } from "@/lib/tipos";

/**
 * Qué puede hacer cada quien.
 *
 * `admin` administra (incluido el dinero), `operador` trabaja el ganado y la
 * tierra, `capturista` solo captura trabajos y bitácora. Esto es la cortesía
 * de la interfaz: quien de verdad manda es RLS en Supabase.
 */
export type Rol = "admin" | "operador" | "capturista";

export type Membresia = { rancho: Rancho; rol: Rol };

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
export async function requireMembresia(): Promise<Membresia> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membresias } = await supabase
    .from("rancho_usuarios")
    .select("rancho_id, rol, ranchos(*)")
    .eq("usuario_id", user.id);

  if (!membresias || membresias.length === 0) redirect("/crear-rancho");

  const cookieStore = await cookies();
  const preferido = cookieStore.get("rancho_activo")?.value;
  const activa =
    membresias.find((m) => m.rancho_id === preferido) ?? membresias[0];

  return {
    rancho: activa.ranchos as unknown as Rancho,
    rol: (activa.rol as Rol) ?? "operador",
  };
}

export async function requireRancho(): Promise<Rancho> {
  return (await requireMembresia()).rancho;
}

/** Corta la página si el rol no alcanza. Úsalo en las secciones de dinero. */
export async function requireAdmin(): Promise<Membresia> {
  const membresia = await requireMembresia();
  if (membresia.rol !== "admin") redirect("/?sin_permiso=1");
  return membresia;
}
