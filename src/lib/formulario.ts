import "server-only";
import { fechaHoy } from "@/lib/fechas";
import type { SupabaseClient } from "@supabase/supabase-js";

// Lectura de FormData para las server actions. Estaba copiado en cada
// módulo (ganado, costos, ventas, trabajos…); aquí vive una sola vez.

export function campo(formData: FormData, nombre: string): string | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v === "" ? null : v;
}

export function numero(formData: FormData, nombre: string): number | null {
  const v = campo(formData, nombre);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function entero(formData: FormData, nombre: string): number | null {
  const n = numero(formData, nombre);
  return n == null ? null : Math.trunc(n);
}

/** Checkbox: presente en el FormData solo cuando está marcado. */
export function bandera(formData: FormData, nombre: string): boolean {
  return formData.get(nombre) === "on" || formData.get(nombre) === "true";
}

/** Todos los valores de un campo repetido (`animal_id` en los wizards). */
export function lista(formData: FormData, nombre: string): string[] {
  return formData.getAll(nombre).map(String).filter(Boolean);
}

export function fecha(formData: FormData, nombre = "fecha"): string {
  return campo(formData, nombre) ?? fechaHoy();
}

/**
 * Sube un archivo del formulario al bucket `ranchops` y devuelve su ruta
 * (no una URL: el bucket es privado y se firma al mostrarlo).
 * Devuelve null si no se adjuntó nada o si la subida falló.
 */
export async function subirArchivo(
  supabase: SupabaseClient,
  formData: FormData,
  nombre: string,
  carpeta: string,
  ranchoId: string
): Promise<string | null> {
  const archivo = formData.get(nombre);
  if (!(archivo instanceof File) || archivo.size === 0) return null;

  const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
  const ruta = `${ranchoId}/${carpeta}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("ranchops")
    .upload(ruta, archivo, { contentType: archivo.type });

  return error ? null : ruta;
}
