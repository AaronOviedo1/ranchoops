"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Traduce los errores de Supabase Auth sin ocultar la causa real. */
function mensajeDeError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos";
  if (m.includes("email not confirmed")) {
    return "Tu cuenta aún no está confirmada. Revisa tu correo o pide al administrador que la confirme.";
  }
  if (m.includes("email rate limit") || m.includes("rate limit")) {
    return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
  }
  if (m.includes("user already registered")) {
    return "Ese correo ya tiene cuenta. Usa la pestaña Entrar.";
  }
  return mensaje;
}

export async function iniciarSesion(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(mensajeDeError(error.message))}`);
  }
  redirect("/");
}

export async function registrarse(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();

  if (password.length < 8) {
    redirect(`/login?error=${encodeURIComponent("La contraseña debe tener al menos 8 caracteres")}&modo=registro`);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre } },
  });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(mensajeDeError(error.message))}&modo=registro`);
  }

  if (data.user) {
    await supabase.from("perfiles").upsert({ id: data.user.id, nombre });
  }

  // Si la confirmación por correo está activa, session será null
  if (!data.session) {
    redirect(
      `/login?aviso=${encodeURIComponent(
        "Cuenta creada. Falta confirmarla: revisa tu correo (incluida la carpeta de spam). Si no llega, desactiva “Confirm email” en Supabase → Authentication → Sign In / Providers → Email."
      )}`
    );
  }
  redirect("/");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
