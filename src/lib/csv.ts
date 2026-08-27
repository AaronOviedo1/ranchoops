// Lectura de CSV.
//
// Los archivos que manda el rancho salen de Excel, de otro programa de
// ganadería o de un WhatsApp: vienen con BOM, con punto y coma en vez de
// coma, con saltos de línea de Windows y con comas adentro de las comillas
// ("Angus, cruzado"). Todo eso se maneja aquí, sin librería.

/** El separador más probable, viendo la primera línea. */
function separadorDe(texto: string): string {
  const linea = texto.split(/\r?\n/, 1)[0] ?? "";
  const candidatos = [",", ";", "\t", "|"];
  // Fuera de comillas: contar el que más aparece.
  let mejor = ",";
  let max = 0;
  for (const sep of candidatos) {
    let cuenta = 0;
    let entreComillas = false;
    for (const c of linea) {
      if (c === '"') entreComillas = !entreComillas;
      else if (c === sep && !entreComillas) cuenta++;
    }
    if (cuenta > max) {
      max = cuenta;
      mejor = sep;
    }
  }
  return mejor;
}

/**
 * Convierte el texto de un CSV en filas de celdas.
 *
 * Sigue la convención de Excel: las comillas dobles delimitan una celda y
 * `""` adentro es una comilla literal.
 */
export function leerCsv(contenido: string): string[][] {
  // El BOM de Excel se cuela en el nombre de la primera columna.
  const texto = contenido.replace(/^\ufeff/, "");
  const sep = separadorDe(texto);

  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        celda += c;
      }
      continue;
    }

    if (c === '"') {
      entreComillas = true;
    } else if (c === sep) {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      // \r\n cuenta como un solo salto.
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else {
      celda += c;
    }
  }

  if (celda !== "" || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }

  // Renglones en blanco al final del archivo, o filas que quedaron vacías.
  return filas
    .map((f) => f.map((c) => c.trim()))
    .filter((f) => f.some((c) => c !== ""));
}

/** Sin acentos, sin signos y en minúsculas: para comparar encabezados. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
