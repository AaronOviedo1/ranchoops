"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function iniciarSesion(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent("Correo o contraseña incorrectos")}`);
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
    redirect(`/login?error=${encodeURIComponent(error.message)}&modo=registro`);
  }

  if (data.user) {
    await supabase.from("perfiles").upsert({ id: data.user.id, nombre });
  }

  // Si la confirmación por correo está activa, session será null
  if (!data.session) {
    redirect(`/login?aviso=${encodeURIComponent("Revisa tu correo para confirmar la cuenta")}`);
  }
  redirect("/");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
