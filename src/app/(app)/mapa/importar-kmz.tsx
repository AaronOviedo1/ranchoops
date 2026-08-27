"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import area from "@turf/area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectCampo } from "@/components/ui/select-campo";
import { Aviso } from "@/components/aviso";
import { tiposInfraPor } from "@/lib/catalogos";
import { importarGeometrias } from "../potreros/acciones";

type Candidato = {
  clave: string;
  nombre: string;
  geom: GeoJSON.Feature;
  hectareas: number | null;
  geometria: "poligono" | "linea" | "punto";
  destino: "potrero_nuevo" | "potrero_existente" | "infraestructura" | "ignorar";
  potreroId: string;
  tipo: string;
};

/**
 * Importa el trazo que el rancho ya tiene hecho en Google Earth.
 *
 * El KMZ es un ZIP con un KML adentro; el KML se convierte a GeoJSON. Todo
 * pasa en el navegador porque el parser necesita DOMParser.
 */
export function ImportarKmz({
  potrerosSinGeom,
}: {
  potrerosSinGeom: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const archivo = useRef<HTMLInputElement>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const leer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCargando(true);
    setError(null);
    setCandidatos([]);

    try {
      let texto: string;
      if (f.name.toLowerCase().endsWith(".kmz")) {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(await f.arrayBuffer());
        const kml = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith(".kml"));
        if (!kml) throw new Error("El KMZ no trae ningún archivo .kml adentro.");
        texto = await zip.files[kml].async("text");
      } else {
        texto = await f.text();
      }

      const { kml: aGeoJson } = await import("@tmcw/togeojson");
      const doc = new DOMParser().parseFromString(texto, "text/xml");
      if (doc.querySelector("parsererror")) {
        throw new Error("El archivo no se pudo leer: ¿está completo?");
      }

      const fc = aGeoJson(doc) as GeoJSON.FeatureCollection;
      const encontrados: Candidato[] = fc.features.flatMap((feature, i) => {
        const t = feature.geometry?.type;
        const geometria =
          t === "Polygon" || t === "MultiPolygon"
            ? ("poligono" as const)
            : t === "LineString" || t === "MultiLineString"
              ? ("linea" as const)
              : t === "Point"
                ? ("punto" as const)
                : null;
        if (!geometria) return [];

        const nombre =
          (feature.properties?.name as string | undefined)?.trim() || `Sin nombre ${i + 1}`;
        const hectareas =
          geometria === "poligono"
            ? Math.round((area(feature as GeoJSON.Feature<GeoJSON.Polygon>) / 10000) * 10) / 10
            : null;

        return [
          {
            clave: `${i}`,
            nombre,
            geom: feature,
            hectareas,
            geometria,
            // Los polígonos casi siempre son potreros; lo demás, infraestructura.
            destino: geometria === "poligono" ? "potrero_nuevo" : "infraestructura",
            potreroId: "",
            tipo: geometria === "linea" ? "cerco" : "otro",
          },
        ];
      });

      if (encontrados.length === 0) {
        throw new Error("No se encontró ningún polígono, línea ni punto en el archivo.");
      }
      setCandidatos(encontrados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
    } finally {
      setCargando(false);
    }
  };

  const editar = (clave: string, cambios: Partial<Candidato>) =>
    setCandidatos((prev) => prev.map((c) => (c.clave === clave ? { ...c, ...cambios } : c)));

  const importar = async () => {
    const aGuardar = candidatos.filter((c) => c.destino !== "ignorar");
    if (aGuardar.length === 0) return;
    setGuardando(true);
    try {
      await importarGeometrias(
        aGuardar.map((c) => ({
          destino: c.destino as "potrero_nuevo" | "potrero_existente" | "infraestructura",
          potreroId: c.potreroId || undefined,
          nombre: c.nombre,
          tipo: c.tipo,
          geom: c.geom,
          superficieHas: c.hectareas,
        }))
      );
      setCandidatos([]);
      if (archivo.current) archivo.current.value = "";
      router.refresh();
    } catch {
      setError("No se pudieron guardar. Revisa el archivo e inténtalo otra vez.");
    } finally {
      setGuardando(false);
    }
  };

  const aImportar = candidatos.filter((c) => c.destino !== "ignorar").length;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="secondary" size="sm">
            <FileUp className="h-4 w-4" /> Importar KMZ
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar trazo de Google Earth</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="kmz">Archivo KMZ o KML</Label>
            <Input
              id="kmz"
              ref={archivo}
              type="file"
              accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml"
              onChange={leer}
            />
            <p className="text-xs text-muted-foreground">
              Los potreros tienen que estar trazados como polígonos, no como líneas.
            </p>
          </div>

          {cargando && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Leyendo el archivo…
            </p>
          )}
          {error && <Aviso tono="peligro">{error}</Aviso>}

          {candidatos.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                {candidatos.length} encontrados. Revisa a dónde va cada uno.
              </p>
              <ScrollArea className="h-72 rounded-md border">
                <div className="divide-y">
                  {candidatos.map((c) => (
                    <div key={c.clave} className="space-y-2 p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <Input
                          value={c.nombre}
                          onChange={(e) => editar(c.clave, { nombre: e.target.value })}
                          className="h-7 flex-1"
                        />
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {c.hectareas != null ? `${c.hectareas} has` : c.geometria}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <SelectCampo
                          size="sm"
                          className="w-40"
                          value={c.destino}
                          onValueChange={(v) =>
                            editar(c.clave, { destino: v as Candidato["destino"] })
                          }
                          opcionVacia={false}
                          opciones={[
                            ...(c.geometria === "poligono"
                              ? [
                                  { valor: "potrero_nuevo", etiqueta: "Potrero nuevo" },
                                  {
                                    valor: "potrero_existente",
                                    etiqueta: "Potrero existente",
                                    deshabilitada: potrerosSinGeom.length === 0,
                                  },
                                ]
                              : []),
                            { valor: "infraestructura", etiqueta: "Área o instalación" },
                            { valor: "ignorar", etiqueta: "No importar" },
                          ]}
                        />

                        {c.destino === "potrero_existente" && (
                          <SelectCampo
                            size="sm"
                            className="w-40"
                            value={c.potreroId}
                            onValueChange={(v) => editar(c.clave, { potreroId: v })}
                            placeholder="¿Cuál?"
                            opciones={potrerosSinGeom.map((p) => ({
                              valor: p.id,
                              etiqueta: p.nombre,
                            }))}
                          />
                        )}

                        {c.destino === "infraestructura" && (
                          <SelectCampo
                            size="sm"
                            className="w-40"
                            value={c.tipo}
                            onValueChange={(v) => editar(c.clave, { tipo: v })}
                            opcionVacia={false}
                            opciones={tiposInfraPor(c.geometria).map((t) => ({
                              valor: t.valor,
                              etiqueta: t.etiqueta,
                            }))}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button
                className="w-full"
                onClick={importar}
                disabled={guardando || aImportar === 0}
              >
                {guardando ? "Guardando…" : `Importar ${aImportar}`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
