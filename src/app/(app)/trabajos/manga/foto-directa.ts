import { createClient } from "@/lib/supabase/client";

// En la manga la foto se sube en el momento y directo al bucket: así la
// jornada solo manda texto al cerrar (una foto de celular no pasa por una
// server action sin comprimir) y la foto aguanta un recargado, porque lo que
// se guarda en el borrador es su ruta.

const LADO_MAYOR = 1600;

async function comprimir(archivo: File): Promise<Blob> {
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAYOR / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((listo) =>
      lienzo.toBlob(listo, "image/jpeg", 0.8)
    );
    return blob ?? archivo;
  } catch {
    // Un formato que el navegador no sabe dibujar: se sube tal cual.
    return archivo;
  }
}

/** Sube la foto de un trabajo y devuelve su ruta en el bucket. */
export async function subirFotoTrabajo(ranchoId: string, archivo: File): Promise<string> {
  const blob = await comprimir(archivo);
  const extension =
    blob === archivo ? archivo.name.split(".").pop()?.toLowerCase() || "jpg" : "jpg";
  // Misma carpeta que usa `subirArchivo`; el servidor valida este prefijo.
  const ruta = `${ranchoId}/trabajos/${crypto.randomUUID()}.${extension}`;
  const { error } = await createClient()
    .storage.from("ranchops")
    .upload(ruta, blob, { contentType: blob.type || "image/jpeg" });
  if (error) throw new Error(error.message);
  return ruta;
}

/** Al descartar una jornada, sus fotos ya no son de nadie. */
export async function borrarFotosTrabajo(rutas: string[]): Promise<void> {
  if (rutas.length === 0) return;
  await createClient().storage.from("ranchops").remove(rutas);
}
