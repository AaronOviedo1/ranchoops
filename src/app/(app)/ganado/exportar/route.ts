import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRancho } from "@/lib/auth";
import {
  etiquetaClase,
  etiquetaReproductivo,
} from "@/lib/catalogos";
import { comparaArete, filtroOr, terminosBusqueda } from "@/lib/busqueda";
import { edadTexto } from "@/lib/ciclo-vida";
import { fechaHoy } from "@/lib/fechas";
import { respuestaTabla } from "@/lib/exportar";
import type { Animal } from "@/lib/tipos";

/**
 * Export de la lista de ganado con los mismos filtros que trae la página
 * (q, especie, clase, grupo, status): lo que ves es lo que te llevas.
 */
export async function GET(request: NextRequest) {
  const rancho = await requireRancho();
  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;

  const q = sp.get("q")?.trim() ?? "";
  const especie = sp.get("especie")?.trim() ?? "";
  const clase = sp.get("clase")?.trim() ?? "";
  const grupo = sp.get("grupo")?.trim() ?? "";
  const status = sp.get("status")?.trim() || "activo";
  const formato = sp.get("formato");

  let query = supabase
    .from("animales")
    .select("*, grupos(nombre), divisiones(nombre)")
    .eq("rancho_id", rancho.id);

  if (status !== "todos") query = query.eq("status", status);
  if (especie) query = query.eq("especie", especie);
  if (clase) query = query.eq("clase", clase);
  if (grupo) query = query.eq("grupo_id", grupo);

  const terminos = terminosBusqueda(q);
  if (terminos.length > 0) {
    query = query.or(filtroOr(["arete_control", "siniga", "nombre"], terminos));
  }

  const { data } = await query;
  const lista = ((data ?? []) as (Animal & {
    grupos: { nombre: string } | null;
    divisiones: { nombre: string } | null;
  })[]).sort((a, b) => comparaArete(a.arete_control, b.arete_control));

  const filas: (string | number | null | undefined)[][] = [
    [
      "Arete", "SINIIGA", "Registro", "Nombre", "Especie", "Clase", "Sexo", "Edad",
      "Raza", "Color de pelaje", "Nacimiento", "Peso al nacer",
      "Peso al destete", "Fecha de destete", "Procedencia", "En campo desde",
      "Padre de fuera", "Registro del padre", "Madre de fuera",
      "Registro de la madre", "Grupo", "División", "Status",
      "Estado reproductivo", "Fecha de salida", "Causa de salida", "Notas",
    ],
    ...lista.map((a) => [
      a.arete_control,
      a.siniga,
      a.num_registro,
      a.nombre,
      a.especie,
      etiquetaClase(a.clase),
      a.sexo,
      edadTexto(a.fecha_nacimiento),
      a.raza,
      a.color_pelaje,
      a.fecha_nacimiento,
      a.peso_nacimiento,
      a.peso_destete,
      a.fecha_destete,
      a.procedencia,
      a.fecha_en_campo,
      a.padre_texto,
      a.padre_registro,
      a.madre_texto,
      a.madre_registro,
      a.grupos?.nombre,
      a.divisiones?.nombre,
      a.status,
      etiquetaReproductivo(a.status_reproductivo),
      a.fecha_salida,
      a.causa_salida,
      a.notas,
    ]),
  ];

  return respuestaTabla(formato, filas, `ganado-${fechaHoy()}`, "Ganado");
}
