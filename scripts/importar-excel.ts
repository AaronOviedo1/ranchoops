/**
 * Importa los Exceles reales de José Carlos a Supabase.
 *
 * Uso:
 *   pnpm importar "La Jaimea"
 *
 * Requisitos:
 *   - .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *   - El rancho ya creado desde la app (onboarding)
 *   - Los .xlsx en datos-excel/
 *
 * Importa: animales (INV G 26 + crías + eventos generales), potreros e
 * historial de pastoreo (Entrada y Salidas Potrero), pluviómetros y lluvias
 * (Lluvias.xlsx), y ventas 2023–2026 (ventas.xlsx).
 * Cada sección se salta si el rancho ya tiene datos de ese tipo.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import path from "node:path";

config({ path: ".env.local" });

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_SUPABASE || !SERVICE_ROLE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(URL_SUPABASE, SERVICE_ROLE);
const CARPETA = path.join(process.cwd(), "datos-excel");

type Fila = (string | number | Date | null | undefined)[];

function hojas(archivo: string): Record<string, Fila[]> {
  const wb = XLSX.readFile(path.join(CARPETA, archivo), { cellDates: true });
  const resultado: Record<string, Fila[]> = {};
  for (const nombre of wb.SheetNames) {
    resultado[nombre] = XLSX.utils.sheet_to_json<Fila>(wb.Sheets[nombre], {
      header: 1,
      defval: null,
    });
  }
  return resultado;
}

const esFecha = (v: unknown): v is Date => v instanceof Date && !isNaN(v.getTime());
const fechaISO = (v: Date) => {
  // corrige desfases de zona horaria de Excel
  const d = new Date(v.getTime() + 12 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};
const texto = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const numero = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function buscarFilaEncabezado(filas: Fila[], etiqueta: string): number {
  return filas.findIndex((f) =>
    f.some((c) => typeof c === "string" && c.toLowerCase().includes(etiqueta.toLowerCase()))
  );
}

function indicePorEncabezado(fila: Fila, etiqueta: string): number {
  return fila.findIndex(
    (c) => typeof c === "string" && c.toLowerCase().trim().startsWith(etiqueta.toLowerCase())
  );
}

async function tieneDatos(tabla: string, ranchoId: string): Promise<boolean> {
  const { count } = await supabase
    .from(tabla)
    .select("*", { count: "exact", head: true })
    .eq("rancho_id", ranchoId);
  return (count ?? 0) > 0;
}

// ============================================================
// 1. Animales — INV GANADO JC.xlsx, hoja "INV G 26"
// ============================================================
async function importarAnimales(ranchoId: string) {
  if (await tieneDatos("animales", ranchoId)) {
    console.log("• Animales: el rancho ya tiene animales, se salta.");
    return;
  }
  const libro = hojas("INV GANADO JC.xlsx");
  const filas = libro["INV G 26"];
  if (!filas) {
    console.log("• Animales: no se encontró la hoja INV G 26.");
    return;
  }

  const iEnc = buscarFilaEncabezado(filas, "arete control");
  const enc = filas[iEnc];
  const col = {
    sexo: indicePorEncabezado(enc, "sexo"),
    arete: indicePorEncabezado(enc, "arete control"),
    siniga: indicePorEncabezado(enc, "siniga"),
    procedencia: indicePorEncabezado(enc, "procedencia"),
    status: indicePorEncabezado(enc, "status"),
    carga: indicePorEncabezado(enc, "carga"),
    peso: indicePorEncabezado(enc, "peso"),
    nacimiento: indicePorEncabezado(enc, "añ0"),
    raza: indicePorEncabezado(enc, "raza"),
    comentario: indicePorEncabezado(enc, "comentario"),
    criaControl: indicePorEncabezado(enc, "control"),
    criaFecha: indicePorEncabezado(enc, "fecha"),
    criaEstatus: indicePorEncabezado(enc, "estatus"),
  };
  // columnas de la sección "Crías" (a la derecha)
  const criaSiniga = enc.findIndex(
    (c, i) => i > col.criaControl && typeof c === "string" && c.toLowerCase().startsWith("siniga")
  );
  const criaSexo = enc.findIndex(
    (c, i) => i > col.criaControl && typeof c === "string" && c.toLowerCase().startsWith("sexo")
  );

  let vacas = 0;
  let crias = 0;

  for (let i = iEnc + 1; i < filas.length; i++) {
    const f = filas[i];
    const arete = numero(f[col.arete]);
    if (!arete) continue;

    const nacimiento = esFecha(f[col.nacimiento]) ? fechaISO(f[col.nacimiento] as Date) : null;
    const carga = texto(f[col.carga]);
    const status = texto(f[col.status]);
    const muerta = /muerte|murio/i.test(`${carga ?? ""} ${status ?? ""}`);

    const edadMeses = nacimiento
      ? (Date.now() - new Date(nacimiento).getTime()) / (1000 * 3600 * 24 * 30.44)
      : null;
    const clase =
      edadMeses == null ? "vaca" : edadMeses < 14 ? "becerra" : edadMeses < 36 ? "vaquilla" : "vaca";

    const { data: vaca } = await supabase
      .from("animales")
      .insert({
        rancho_id: ranchoId,
        arete_control: String(arete),
        siniga: texto(f[col.siniga]),
        sexo: texto(f[col.sexo]) === "M" ? "M" : "H",
        clase,
        raza: texto(f[col.raza]),
        fecha_nacimiento: nacimiento,
        procedencia: texto(f[col.procedencia]),
        status: muerta ? "muerto" : "activo",
        status_reproductivo: muerta ? null : (carga && !/^x$/i.test(carga) ? carga : status),
        causa_salida: muerta ? (carga ?? status) : null,
        notas: texto(f[col.comentario]),
      })
      .select("id")
      .single();
    vacas++;

    // Cría de la sección derecha
    const controlCria = texto(f[col.criaControl]);
    const fechaCria = f[col.criaFecha];
    if (vaca && esFecha(fechaCria) && controlCria && controlCria.toLowerCase() !== "x") {
      const sexoCria = texto(f[criaSexo]);
      const estatusCria = texto(f[col.criaEstatus]);
      const criaMuerta = estatusCria ? /muerte/i.test(estatusCria) : false;
      await supabase.from("animales").insert({
        rancho_id: ranchoId,
        arete_control: controlCria,
        siniga: texto(f[criaSiniga])?.replace(/x/i, "") || null,
        sexo: sexoCria === "M" ? "M" : sexoCria === "H" ? "H" : null,
        clase: sexoCria === "M" ? "becerro" : "becerra",
        fecha_nacimiento: fechaISO(fechaCria),
        madre_id: vaca.id,
        raza: texto(f[col.raza]),
        status: criaMuerta ? "muerto" : "activo",
      });
      crias++;
    }
  }
  console.log(`• Animales: ${vacas} vacas/vaquillas, ${crias} crías.`);
}

// ============================================================
// 1b. Trabajos masivos del hato ("GENERAL" / "Ganado UltraRed") → bitácora
// ============================================================
async function importarEventosGenerales(ranchoId: string) {
  const { count } = await supabase
    .from("eventos")
    .select("*", { count: "exact", head: true })
    .eq("rancho_id", ranchoId)
    .eq("tipo", "nota_bitacora");
  if ((count ?? 0) > 0) {
    console.log("• Eventos generales: ya hay notas de bitácora, se salta.");
    return;
  }

  const libro = hojas("INV GANADO JC.xlsx");
  let eventos = 0;

  for (const filas of Object.values(libro)) {
    for (const f of filas) {
      // La etiqueta puede caer en cualquier columna, se busca en toda la fila
      const esMasivo = (f ?? []).some(
        (c) => typeof c === "string" && c.length < 25 && /^(general|ganado\s)/i.test(c.trim())
      );
      if (!esMasivo) continue;
      const fecha = f.find(esFecha);
      const obs = [...f].reverse().find((c) => typeof c === "string" && c.length > 20);
      if (!fecha || !obs) continue;
      await supabase.from("eventos").insert({
        rancho_id: ranchoId,
        tipo: "nota_bitacora",
        fecha: fechaISO(fecha),
        obs: String(obs).trim(),
      });
      eventos++;
    }
  }
  console.log(`• Eventos generales: ${eventos} trabajos del hato en bitácora.`);
}

// ============================================================
// 2. Potreros + historial de pastoreo — Entrada y Salidas Potrero.xlsx
// ============================================================
async function importarPotreros(ranchoId: string) {
  if (await tieneDatos("potreros", ranchoId)) {
    console.log("• Potreros: el rancho ya tiene potreros, se salta.");
    return;
  }
  const libro = hojas("Entrada y Salidas Potrero.xlsx");

  // Grupo histórico para el hato que rota
  const { data: grupo } = await supabase
    .from("grupos")
    .insert({ rancho_id: ranchoId, nombre: "Hato Carrizo (histórico)" })
    .select("id")
    .single();
  if (!grupo) return;

  const potreroPorNombre = new Map<string, string>();
  let movimientos = 0;

  for (const [nombreHoja, filas] of Object.entries(libro)) {
    const iEnc = buscarFilaEncabezado(filas, "Nombre Potrero");
    if (iEnc < 0) continue;
    const enc = filas[iEnc];
    const col = {
      nombre: indicePorEncabezado(enc, "nombre potrero"),
      has: indicePorEncabezado(enc, "has"),
      animales: indicePorEncabezado(enc, "# animales"),
      buniga: indicePorEncabezado(enc, "buniga"),
      residuo: indicePorEncabezado(enc, "residuo"),
      entrada: indicePorEncabezado(enc, "entrada"),
      salida: indicePorEncabezado(enc, "salida"),
    };

    for (let i = iEnc + 1; i < filas.length; i++) {
      const f = filas[i];
      const nombre = texto(f[col.nombre]);
      if (!nombre || nombre.toLowerCase() === "hasxvaca") continue;
      const has = numero(f[col.has]);
      if (has == null) continue; // filas de totales/notas

      const nombreLimpio = nombre.replace(/\s+/g, " ").trim();
      let potreroId = potreroPorNombre.get(nombreLimpio.toLowerCase());
      if (!potreroId) {
        const { data: p } = await supabase
          .from("potreros")
          .insert({ rancho_id: ranchoId, nombre: nombreLimpio, superficie_has: has })
          .select("id")
          .single();
        if (!p) continue;
        potreroId = p.id as string;
        potreroPorNombre.set(nombreLimpio.toLowerCase(), p.id as string);
      }

      const entrada = f[col.entrada];
      const salida = f[col.salida];
      if (esFecha(entrada)) {
        await supabase.from("grupo_movimientos").insert({
          rancho_id: ranchoId,
          grupo_id: grupo.id,
          potrero_id: potreroId,
          fecha_entrada: fechaISO(entrada),
          fecha_salida: esFecha(salida) ? fechaISO(salida) : null,
          num_animales_entrada: numero(f[col.animales]),
          calif_buniga: col.buniga >= 0 ? numero(f[col.buniga]) : null,
          residuo:
            col.residuo >= 0 && texto(f[col.residuo])
              ? texto(f[col.residuo])!.toLowerCase()
              : null,
          obs: `Temporada ${nombreHoja}`,
        });
        movimientos++;
      }
    }
  }
  console.log(
    `• Potreros: ${potreroPorNombre.size} potreros y ${movimientos} movimientos históricos.`
  );
}

// ============================================================
// 3. Pluviómetros y lluvias — Lluvias.xlsx
// ============================================================
async function importarLluvias(ranchoId: string) {
  if (await tieneDatos("lluvias", ranchoId)) {
    console.log("• Lluvias: el rancho ya tiene lecturas, se salta.");
    return;
  }
  const libro = hojas("Lluvias.xlsx");
  const pluvPorNombre = new Map<string, string>();

  const normaliza = (n: string) =>
    n.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim().toLowerCase();

  async function idPluviometro(nombre: string): Promise<string | null> {
    const clave = normaliza(nombre);
    if (pluvPorNombre.has(clave)) return pluvPorNombre.get(clave)!;
    const { data } = await supabase
      .from("pluviometros")
      .insert({ rancho_id: ranchoId, nombre: nombre.replace(/\s+/g, " ").trim() })
      .select("id")
      .single();
    if (!data) return null;
    pluvPorNombre.set(clave, data.id);
    return data.id;
  }

  let lecturas = 0;
  const paraGuardar: {
    rancho_id: string;
    pluviometro_id: string;
    fecha: string;
    cantidad: number;
  }[] = [];
  const vistas = new Set<string>();

  for (const filas of Object.values(libro)) {
    // localiza la celda "Pluviometros"
    let rP = -1;
    let cP = -1;
    for (let r = 0; r < Math.min(filas.length, 10); r++) {
      const c = (filas[r] ?? []).findIndex(
        (x) => typeof x === "string" && x.toLowerCase().startsWith("pluviometro")
      );
      if (c >= 0) {
        rP = r;
        cP = c;
        break;
      }
    }
    if (rP < 0) continue;

    const filaFecha = filas[rP + 1] ?? [];
    const columnasFecha: { indice: number; fecha: string }[] = [];
    for (let c = cP + 1; c < filaFecha.length; c++) {
      const v = filaFecha[c];
      if (esFecha(v)) columnasFecha.push({ indice: c, fecha: fechaISO(v) });
    }
    if (columnasFecha.length === 0) continue;

    for (let r = rP + 2; r < filas.length; r++) {
      const nombre = texto(filas[r]?.[cP]);
      if (!nombre) continue;
      if (/^(promedio|fecha|agua blanca|cimarrones|choyal)$/i.test(nombre)) {
        if (/^promedio$/i.test(nombre)) break; // fin de la sección del Carrizo
        continue;
      }
      const pid = await idPluviometro(nombre);
      if (!pid) continue;
      for (const { indice, fecha } of columnasFecha) {
        const cantidad = numero(filas[r]?.[indice]);
        if (cantidad == null) continue;
        const clave = `${pid}|${fecha}`;
        if (vistas.has(clave)) continue;
        vistas.add(clave);
        paraGuardar.push({ rancho_id: ranchoId, pluviometro_id: pid, fecha, cantidad });
        lecturas++;
      }
    }
  }

  for (let i = 0; i < paraGuardar.length; i += 500) {
    await supabase
      .from("lluvias")
      .upsert(paraGuardar.slice(i, i + 500), { onConflict: "pluviometro_id,fecha" });
  }
  console.log(`• Lluvias: ${pluvPorNombre.size} pluviómetros, ${lecturas} lecturas.`);
}

// ============================================================
// 4. Ventas — ventas.xlsx (hojas por año)
// ============================================================
// El orden importa: lo más específico primero ("vac y vaq" antes que "vaca").
const CLASES_VENTA: [RegExp, string][] = [
  [/vac.*y.*vaq/i, "vacas y vaquillas"],
  [/^bos\b|becerro/i, "becerros"],
  [/^bas\b|becerra/i, "becerras"],
  [/vaquilla|^vaq\b/i, "vaquillas"],
  [/torete|^trt\b/i, "toretes"],
  [/toro/i, "toros"],
  [/vaca|^vac\b/i, "vacas"],
  [/caball|cabalo|yegua|potrillo/i, "caballos"],
];

function claseDeVenta(descripcion: string): string | null {
  for (const [re, clase] of CLASES_VENTA) if (re.test(descripcion)) return clase;
  return null;
}

async function importarVentas(ranchoId: string) {
  if (await tieneDatos("ventas", ranchoId)) {
    console.log("• Ventas: el rancho ya tiene ventas, se salta.");
    return;
  }
  const libro = hojas("ventas.xlsx");
  let ventas = 0;
  let renglones = 0;
  const cuadre: { anio: string; importado: number; declarado: number }[] = [];

  for (const [hoja, filas] of Object.entries(libro)) {
    if (!/^\d{4}$/.test(hoja)) continue;
    // Celda "TOTAL:" del encabezado de la hoja, para cuadrar al final
    const declarado = numero(filas[0]?.[3]) ?? 0;
    let importadoAnio = 0;

    // Columnas reales de la hoja:
    // 0 Descripcion · 1 Cabezas · 2 Kilos salida · 3 Prom · 4 Kilos venta
    // 5 Prom · 6 Precio · 7 $/cabeza · 8 Total   (la col. 10+ es el resumen anual)
    let i = 0;
    while (i < filas.length) {
      const f = filas[i];
      const fecha = esFecha(f?.[0]) ? (f[0] as Date) : esFecha(f?.[1]) ? (f[1] as Date) : null;
      if (!fecha) {
        i++;
        continue;
      }

      // bloque de venta: siguiente fila es encabezado, luego renglones hasta "Total"
      const filasRenglon: {
        clase: string;
        cabezas: number;
        kilos_salida: number | null;
        kilos_venta: number | null;
        precio_kg: number | null;
        precio_cabeza: number | null;
        total: number;
      }[] = [];
      let obs: string | null = null;
      let guia: string | null = null;
      let reemo: string | null = null;

      let j = i + 1;
      for (; j < filas.length && j < i + 40; j++) {
        const g = filas[j];
        if (esFecha(g?.[0])) break; // empieza otra venta
        const c0 = texto(g?.[0]);
        if (!c0) continue;
        if (/^descripcion/i.test(c0)) continue;
        if (/^total/i.test(c0)) {
          j++;
          // notas, guía y REEMO vienen después de la fila "Total"
          for (; j < filas.length && j < i + 45; j++) {
            const h = filas[j];
            if (esFecha(h?.[0])) break;
            const celda0 = texto(h?.[0]);
            if (!celda0) continue;
            if (/^notas/i.test(celda0)) obs = texto(h?.[1]);
            else if (/guia/i.test(celda0)) {
              guia = celda0.replace(/guia/i, "").trim() || null;
              const reemoCelda = (h ?? [])
                .map(texto)
                .find((x) => x && /reemo/i.test(x));
              if (reemoCelda) reemo = reemoCelda.replace(/reemo/i, "").trim() || null;
            } else break;
          }
          break;
        }
        const clase = claseDeVenta(c0);
        const cabezas = numero(g?.[1]);
        if (clase && cabezas) {
          const precio = numero(g?.[6]);
          const total = numero(g?.[8]) ?? 0;
          filasRenglon.push({
            clase,
            cabezas,
            kilos_salida: numero(g?.[2]),
            kilos_venta: numero(g?.[4]) ?? numero(g?.[2]),
            precio_kg: precio != null && precio < 1000 ? precio : null,
            precio_cabeza: precio != null && precio >= 1000 ? precio : null,
            total,
          });
        }
      }

      if (filasRenglon.length > 0) {
        const comprador =
          obs && obs.length < 60 && !/viaje|salieron|vendieron/i.test(obs) ? obs : null;
        const { data: venta } = await supabase
          .from("ventas")
          .insert({
            rancho_id: ranchoId,
            fecha: fechaISO(fecha),
            comprador,
            obs: comprador ? null : obs,
            guia,
            reemo,
          })
          .select("id")
          .single();
        if (venta) {
          await supabase.from("venta_renglones").insert(
            filasRenglon.map((r) => ({ rancho_id: ranchoId, venta_id: venta.id, ...r }))
          );
          ventas++;
          renglones += filasRenglon.length;
          importadoAnio += filasRenglon.reduce((s, r) => s + r.total, 0);
        }
      }
      i = Math.max(j, i + 1);
    }
    if (declarado > 0) cuadre.push({ anio: hoja, importado: importadoAnio, declarado });
  }

  console.log(`• Ventas: ${ventas} ventas con ${renglones} renglones.`);
  for (const c of cuadre) {
    const dif = ((c.importado - c.declarado) / c.declarado) * 100;
    const marca = Math.abs(dif) < 1 ? "✓" : "⚠";
    console.log(
      `    ${marca} ${c.anio}: $${Math.round(c.importado).toLocaleString("es-MX")}` +
        ` vs $${Math.round(c.declarado).toLocaleString("es-MX")} del Excel (${dif >= 0 ? "+" : ""}${dif.toFixed(1)}%)`
    );
  }
}

// ============================================================
async function principal() {
  const nombreRancho = process.argv[2];
  if (!nombreRancho) {
    console.error('Uso: pnpm importar "Nombre del rancho"');
    process.exit(1);
  }

  const { data: rancho, error } = await supabase
    .from("ranchos")
    .select("id, nombre")
    .ilike("nombre", nombreRancho)
    .single();
  if (error || !rancho) {
    console.error(`No se encontró el rancho "${nombreRancho}". Créalo primero desde la app.`);
    process.exit(1);
  }

  console.log(`Importando a "${rancho.nombre}" (${rancho.id})…\n`);
  await importarAnimales(rancho.id);
  await importarEventosGenerales(rancho.id);
  await importarPotreros(rancho.id);
  await importarLluvias(rancho.id);
  await importarVentas(rancho.id);
  console.log("\nListo. Abre la app y revisa el dashboard.");
}

principal();
