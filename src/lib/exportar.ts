import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * Utilerías de exportación compartidas por todos los routes de exportar.
 *
 * Nacieron en /reportes/exportar y se extrajeron aquí cuando cada sección
 * estrenó su propio botón de Exportar: la promesa de la casa es que nada de
 * lo capturado se queda atrapado en la app.
 */

export function csv(filas: (string | number | null | undefined)[][]): string {
  return (
    "﻿" + // BOM para que Excel abra acentos bien
    filas
      .map((fila) =>
        fila
          .map((celda) => {
            const v = celda == null ? "" : String(celda);
            return /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
          })
          .join(",")
      )
      .join("\n")
  );
}

export function respuestaCsv(
  filas: (string | number | null | undefined)[][],
  archivo: string
): NextResponse {
  return new NextResponse(csv(filas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${archivo}"`,
    },
  });
}

export type Hoja = {
  nombre: string;
  filas: Record<string, unknown>[];
};

export function respuestaXlsx(hojas: Hoja[], archivo: string): NextResponse {
  const libro = XLSX.utils.book_new();
  for (const h of hojas) {
    // Una hoja vacía en Excel confunde más que una con encabezados.
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(h.filas.length > 0 ? h.filas : [{ "Sin datos": "" }]),
      h.nombre.slice(0, 31)
    );
  }
  const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${archivo}"`,
    },
  });
}

/**
 * Deja pasar el formato pedido en ?formato= y responde CSV o XLSX con las
 * mismas filas tabulares (encabezados en la primera fila).
 */
export function respuestaTabla(
  formato: string | null,
  filas: (string | number | null | undefined)[][],
  archivoBase: string,
  hoja = "Datos"
): NextResponse {
  if (formato === "xlsx") {
    const [encabezados, ...cuerpo] = filas;
    const objetos = cuerpo.map((fila) =>
      Object.fromEntries(
        (encabezados ?? []).map((h, i) => [String(h ?? `Col ${i + 1}`), fila[i] ?? ""])
      )
    );
    return respuestaXlsx([{ nombre: hoja, filas: objetos }], `${archivoBase}.xlsx`);
  }
  return respuestaCsv(filas, `${archivoBase}.csv`);
}
