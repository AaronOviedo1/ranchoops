"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectCampo } from "@/components/ui/select-campo";
import { Aviso } from "@/components/aviso";
import { AyudaInfo } from "@/components/ayuda-info";
import { leerCsv } from "@/lib/csv";
import {
  CAMPOS,
  adivinarColumnas,
  armarFilas,
  type CampoImportable,
  type FilaImportada,
} from "@/lib/importar-ganado";
import { CLASES_ANIMAL, etiquetaClase } from "@/lib/catalogos";
import { importarGanado } from "../acciones";

/** Renglones que se enseñan en la vista previa antes de importar. */
const MUESTRA = 8;

/**
 * Cuántos animales van por viaje al servidor.
 *
 * Las server actions traen un tope de 1 MB de cuerpo: un inventario de dos mil
 * cabezas no cabe de una. De paso, mandarlo por tandas deja mostrar avance.
 */
const TANDA = 250;

/**
 * Importa el ganado desde un CSV.
 *
 * Todo el trabajo de leer y traducir el archivo pasa en el navegador: el
 * rancho ve exactamente qué se va a guardar antes de que se guarde nada. Al
 * servidor solo viajan los renglones ya entendidos.
 */
export function ImportadorGanado() {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);

  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [celdas, setCeldas] = useState<string[][]>([]);
  const [columnas, setColumnas] = useState<(CampoImportable | null)[]>([]);
  const [claseFallback, setClaseFallback] = useState("vaca");
  const [omitirRepetidos, setOmitirRepetidos] = useState(true);
  const [crearFaltantes, setCrearFaltantes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [avance, setAvance] = useState(0);
  const [resultado, setResultado] = useState<{
    importados: number;
    omitidos: number;
    grupos: number;
    divisiones: number;
  } | null>(null);

  const leer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError(null);
    setResultado(null);

    try {
      const filas = leerCsv(await archivo.text());
      if (filas.length < 2) {
        throw new Error(
          "El archivo no trae renglones: se espera una fila de encabezados y luego un animal por renglón."
        );
      }
      const [cabecera, ...cuerpo] = filas;
      setNombreArchivo(archivo.name);
      setEncabezados(cabecera);
      setCeldas(cuerpo);
      setColumnas(adivinarColumnas(cabecera));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
      setNombreArchivo(null);
      setCeldas([]);
    }
  };

  const cambiarColumna = (i: number, campo: string) =>
    setColumnas((prev) =>
      prev.map((c, j) => {
        if (j === i) return (campo || null) as CampoImportable | null;
        // Un campo no puede venir de dos columnas: la anterior se libera.
        return campo && c === campo ? null : c;
      })
    );

  const filas: FilaImportada[] = celdas.length
    ? armarFilas(celdas, columnas, claseFallback)
    : [];
  const conAvisos = filas.filter((f) => f.avisos.length > 0);
  const sinArete = filas.filter((f) => !f.arete_control && !f.siniga).length;
  const hayClase = columnas.includes("clase");

  const importar = async () => {
    setGuardando(true);
    setError(null);
    setAvance(0);

    const total = { importados: 0, omitidos: 0, grupos: 0, divisiones: 0 };
    try {
      for (let i = 0; i < filas.length; i += TANDA) {
        const tanda = await importarGanado(filas.slice(i, i + TANDA), {
          omitirRepetidos,
          crearFaltantes,
        });
        total.importados += tanda.importados;
        total.omitidos += tanda.omitidos;
        total.grupos += tanda.grupos;
        total.divisiones += tanda.divisiones;
        setAvance(Math.min(i + TANDA, filas.length));
      }
      setResultado(total);
      setCeldas([]);
      setNombreArchivo(null);
      router.refresh();
    } catch (err) {
      // Lo de las tandas anteriores ya quedó guardado: hay que decirlo.
      const detalle = err instanceof Error ? err.message : "No se pudo importar.";
      setError(
        total.importados > 0
          ? `${detalle} Los ${total.importados} animales anteriores sí se guardaron.`
          : detalle
      );
    } finally {
      setGuardando(false);
    }
  };

  if (resultado) {
    return (
      <div className="max-w-2xl space-y-4">
        <Aviso tono="exito">
          Se importaron {resultado.importados}{" "}
          {resultado.importados === 1 ? "animal" : "animales"}.
        </Aviso>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {resultado.omitidos > 0 && (
            <li>{resultado.omitidos} se omitieron porque su arete ya estaba en el rancho.</li>
          )}
          {resultado.grupos > 0 && <li>Se crearon {resultado.grupos} grupos nuevos.</li>}
          {resultado.divisiones > 0 && (
            <li>Se crearon {resultado.divisiones} divisiones nuevas.</li>
          )}
        </ul>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/ganado")}>Ver el ganado</Button>
          <Button variant="outline" onClick={() => setResultado(null)}>
            Importar otro archivo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <Aviso tono="peligro">{error}</Aviso>}

      <div className="max-w-2xl space-y-3 rounded-lg border p-4">
        <div className="space-y-2">
          <Label htmlFor="archivo">Archivo CSV</Label>
          <Input
            id="archivo"
            ref={entrada}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={leer}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Un animal por renglón y la primera fila con los nombres de las
          columnas. Si tu archivo está en Excel, guárdalo como CSV. Reconoce
          las columnas por su nombre —arete, sexo, clase, raza, fecha de
          nacimiento…— y lo que no adivine lo puedes corregir a mano.
        </p>
      </div>

      {celdas.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              <span className="font-medium">{nombreArchivo}</span> ·{" "}
              {celdas.length} {celdas.length === 1 ? "renglón" : "renglones"}
            </p>
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-medium">Columnas del archivo</h2>
              <AyudaInfo titulo="Columnas">
                Cada columna del CSV se guarda en un campo del animal. Lo que
                pongas en «No importar» se ignora, y las columnas que no se
                reconocen empiezan así.
              </AyudaInfo>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {encabezados.map((h, i) => (
                <div key={`${h}-${i}`} className="space-y-1.5">
                  <Label className="truncate" title={h}>
                    {h || `Columna ${i + 1}`}
                  </Label>
                  <SelectCampo
                    size="sm"
                    value={columnas[i] ?? ""}
                    onValueChange={(v) => cambiarColumna(i, v)}
                    placeholder="No importar"
                    opciones={CAMPOS.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))}
                  />
                  <p className="truncate text-xs text-muted-foreground">
                    Ej.: {celdas[0]?.[i] || "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="max-w-2xl space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-medium">Cómo importar</h2>

            {!hayClase && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Clase para todos</Label>
                  <AyudaInfo titulo="Clase del lote">
                    El archivo no trae columna de clase, así que todos los
                    animales entran con la misma. Después se pueden reclasificar
                    desde la lista de ganado.
                  </AyudaInfo>
                </div>
                <SelectCampo
                  value={claseFallback}
                  onValueChange={setClaseFallback}
                  opcionVacia={false}
                  opciones={CLASES_ANIMAL.map((c) => ({
                    valor: c.valor,
                    etiqueta: c.etiqueta,
                  }))}
                />
              </div>
            )}

            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={omitirRepetidos}
                onCheckedChange={(v) => setOmitirRepetidos(v === true)}
              />
              <span>
                Saltar los aretes que ya están en el rancho
                <span className="block text-xs text-muted-foreground">
                  Evita que el mismo animal quede dos veces si vuelves a subir
                  el archivo.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={crearFaltantes}
                onCheckedChange={(v) => setCrearFaltantes(v === true)}
              />
              <span>
                Crear los grupos y divisiones que no existan
                <span className="block text-xs text-muted-foreground">
                  Si se apaga, los animales entran sin grupo cuando el nombre no
                  coincide con uno del rancho.
                </span>
              </span>
            </label>
          </section>

          {(conAvisos.length > 0 || sinArete > 0) && (
            <Aviso tono="alerta">
              {conAvisos.length > 0 && (
                <>
                  {conAvisos.length}{" "}
                  {conAvisos.length === 1 ? "renglón tiene" : "renglones tienen"} algo que
                  no se entendió; esos datos entran vacíos.
                  <span className="block text-xs">
                    Renglón {conAvisos[0].linea}: {conAvisos[0].avisos[0]}.
                  </span>
                </>
              )}
              {sinArete > 0 && (
                <span className="block">
                  {sinArete} {sinArete === 1 ? "animal viene" : "animales vienen"} sin arete
                  ni SINIIGA.
                </span>
              )}
            </Aviso>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-medium">
              Así van a quedar {filas.length > MUESTRA && `(primeros ${MUESTRA})`}
            </h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-2 font-medium">Arete</th>
                    <th className="p-2 font-medium">SINIIGA</th>
                    <th className="p-2 font-medium">Clase</th>
                    <th className="p-2 font-medium">Sexo</th>
                    <th className="p-2 font-medium">Raza</th>
                    <th className="p-2 font-medium">Nacimiento</th>
                    <th className="p-2 font-medium">Grupo</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, MUESTRA).map((f) => (
                    <tr key={f.linea} className="border-t">
                      <td className="p-2">{f.arete_control ?? "—"}</td>
                      <td className="p-2 font-mono text-xs">{f.siniga ?? "—"}</td>
                      <td className="p-2">{etiquetaClase(f.clase)}</td>
                      <td className="p-2">
                        {f.sexo === "H" ? "Hembra" : f.sexo === "M" ? "Macho" : "—"}
                      </td>
                      <td className="p-2">{f.raza ?? "—"}</td>
                      <td className="p-2">{f.fecha_nacimiento ?? "—"}</td>
                      <td className="p-2">{f.grupo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex gap-2">
            <Button onClick={importar} disabled={guardando}>
              {guardando ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {filas.length > TANDA
                    ? `Importando… ${avance} de ${filas.length}`
                    : "Importando…"}
                </>
              ) : (
                <>
                  <FileUp className="size-4" /> Importar {filas.length}{" "}
                  {filas.length === 1 ? "animal" : "animales"}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              disabled={guardando}
              onClick={() => {
                setCeldas([]);
                setNombreArchivo(null);
                if (entrada.current) entrada.current.value = "";
              }}
            >
              Cancelar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
