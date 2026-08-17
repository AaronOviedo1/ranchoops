"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import area from "@turf/area";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarGeomPotrero, guardarPunto } from "../potreros/acciones";
import { TIPOS_INFRAESTRUCTURA } from "@/lib/catalogos";

export type PotreroMapa = {
  id: string;
  nombre: string;
  superficie_has: number | null;
  geom: GeoJSON.Feature | null;
  ocupado: boolean;
  dias_descanso: number | null;
  grupo: string | null;
};

export type PuntoMapa = {
  id: string;
  nombre: string;
  tipo: string;
  geom: GeoJSON.Feature | null;
};

const COLORES = {
  ocupado: "#f97316",
  descansando: "#f59e0b",
  listo: "#22c55e",
  sinDatos: "#94a3b8",
};

function colorDe(p: PotreroMapa, meta: number): string {
  if (p.ocupado) return COLORES.ocupado;
  if (p.dias_descanso == null) return COLORES.sinDatos;
  return p.dias_descanso >= meta ? COLORES.listo : COLORES.descansando;
}

export function MapaRancho({
  token,
  potreros,
  puntos,
  meta,
}: {
  token: string;
  potreros: PotreroMapa[];
  puntos: PuntoMapa[];
  meta: number;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const router = useRouter();

  const [modo, setModo] = useState<"ver" | "dibujar" | "punto">("ver");
  const [pendiente, setPendiente] = useState<{
    tipo: "poligono" | "punto";
    geom: GeoJSON.Feature;
    hectareas?: number;
  } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const modoRef = useRef(modo);
  useEffect(() => {
    modoRef.current = modo;
  }, [modo]);

  const sinGeom = potreros.filter((p) => !p.geom);

  useEffect(() => {
    if (!contenedor.current || mapRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: contenedor.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-110.6, 29.6], // Sonora
      zoom: 8,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
    });
    map.addControl(draw);
    drawRef.current = draw;

    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: potreros
        .filter((p) => p.geom)
        .map((p) => ({
          ...(p.geom as GeoJSON.Feature),
          id: p.id,
          properties: {
            id: p.id,
            nombre: p.nombre,
            has: p.superficie_has,
            color: colorDe(p, meta),
            estado: p.ocupado
              ? `Ocupado por ${p.grupo ?? "?"}`
              : p.dias_descanso == null
                ? "Sin historial"
                : `${p.dias_descanso} días de descanso`,
          },
        })),
    };

    const fcPuntos: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: puntos
        .filter((p) => p.geom)
        .map((p) => ({
          ...(p.geom as GeoJSON.Feature),
          properties: { nombre: p.nombre, tipo: p.tipo },
        })),
    };

    map.on("load", () => {
      map.addSource("potreros", { type: "geojson", data: fc });
      map.addLayer({
        id: "potreros-fill",
        type: "fill",
        source: "potreros",
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: "potreros-line",
        type: "line",
        source: "potreros",
        paint: { "line-color": ["get", "color"], "line-width": 2 },
      });
      map.addLayer({
        id: "potreros-label",
        type: "symbol",
        source: "potreros",
        layout: {
          "text-field": ["get", "nombre"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
      });

      map.addSource("puntos", { type: "geojson", data: fcPuntos });
      map.addLayer({
        id: "puntos-circle",
        type: "circle",
        source: "puntos",
        paint: {
          "circle-radius": 5,
          "circle-color": [
            "match",
            ["get", "tipo"],
            "pluviometro",
            "#38bdf8",
            "#e2e8f0",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#0f172a",
        },
      });
      map.addLayer({
        id: "puntos-label",
        type: "symbol",
        source: "puntos",
        layout: {
          "text-field": ["get", "nombre"],
          "text-size": 10,
          "text-offset": [0, 1.1],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
      });

      if (fc.features.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        for (const f of fc.features) {
          const geom = f.geometry;
          if (geom.type === "Polygon") {
            for (const anillo of geom.coordinates)
              for (const c of anillo) bounds.extend(c as [number, number]);
          } else if (geom.type === "MultiPolygon") {
            for (const pol of geom.coordinates)
              for (const anillo of pol)
                for (const c of anillo) bounds.extend(c as [number, number]);
          }
        }
        if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40 });
      }

      map.on("click", "potreros-fill", (e) => {
        if (modoRef.current !== "ver") return;
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as {
          id: string;
          nombre: string;
          has: number | null;
          estado: string;
        };
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:inherit;color:#111">
              <strong>${props.nombre}</strong><br/>
              ${props.has ? `${Number(props.has).toFixed(1)} has<br/>` : ""}
              ${props.estado}<br/>
              <a href="/potreros/${props.id}" style="text-decoration:underline">Ver ficha</a>
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseenter", "potreros-fill", () => {
        if (modoRef.current === "ver") map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "potreros-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    map.on("draw.create", (e: { features: GeoJSON.Feature[] }) => {
      const f = e.features[0];
      if (!f) return;
      if (f.geometry.type === "Polygon") {
        const hectareas = area(f as GeoJSON.Feature<GeoJSON.Polygon>) / 10000;
        setPendiente({ tipo: "poligono", geom: f, hectareas });
      } else if (f.geometry.type === "Point") {
        setPendiente({ tipo: "punto", geom: f });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const iniciarDibujo = () => {
    setModo("dibujar");
    setPendiente(null);
    drawRef.current?.deleteAll();
    drawRef.current?.changeMode("draw_polygon");
  };

  const iniciarPunto = () => {
    setModo("punto");
    setPendiente(null);
    drawRef.current?.deleteAll();
    drawRef.current?.changeMode("draw_point");
  };

  const cancelar = () => {
    setModo("ver");
    setPendiente(null);
    drawRef.current?.deleteAll();
    drawRef.current?.changeMode("simple_select");
  };

  const guardarPoligono = async (formData: FormData) => {
    if (!pendiente) return;
    setGuardando(true);
    const potreroId = String(formData.get("potrero_id") ?? "");
    const nombre = String(formData.get("nombre") ?? "").trim();
    await guardarGeomPotrero({
      potreroId: potreroId || undefined,
      nombre: nombre || undefined,
      geom: pendiente.geom,
      superficieHas: Math.round((pendiente.hectareas ?? 0) * 10) / 10,
    });
    setGuardando(false);
    cancelar();
    router.refresh();
  };

  const guardarPuntoNuevo = async (formData: FormData) => {
    if (!pendiente) return;
    setGuardando(true);
    const capa = String(formData.get("capa") ?? "infraestructura") as
      | "pluviometro"
      | "infraestructura";
    await guardarPunto({
      capa,
      nombre: String(formData.get("nombre") ?? "").trim() || "Sin nombre",
      tipo: String(formData.get("tipo") ?? "otro"),
      geom: pendiente.geom,
    });
    setGuardando(false);
    cancelar();
    router.refresh();
  };

  return (
    <div className="relative h-[calc(100dvh-160px)] min-h-[420px] overflow-hidden rounded-lg border md:h-[calc(100dvh-120px)]">
      <div ref={contenedor} className="h-full w-full" />

      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
        {modo === "ver" ? (
          <>
            <Button size="sm" onClick={iniciarDibujo}>
              Dibujar potrero
            </Button>
            <Button size="sm" variant="secondary" onClick={iniciarPunto}>
              Agregar punto
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={cancelar}>
            Cancelar
          </Button>
        )}
      </div>

      <div className="absolute bottom-3 left-3 z-10 rounded-md bg-background/90 p-2 text-xs shadow">
        <div className="flex items-center gap-3">
          {[
            ["Ocupado", COLORES.ocupado],
            [`Descansando (<${meta}d)`, COLORES.descansando],
            ["Listo", COLORES.listo],
            ["Sin datos", COLORES.sinDatos],
          ].map(([texto, color]) => (
            <span key={texto} className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: color }}
              />
              {texto}
            </span>
          ))}
        </div>
      </div>

      {modo === "dibujar" && !pendiente && (
        <p className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md bg-background/90 px-3 py-1.5 text-sm shadow">
          Haz clic en el mapa para trazar el potrero; doble clic para terminar.
        </p>
      )}
      {modo === "punto" && !pendiente && (
        <p className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md bg-background/90 px-3 py-1.5 text-sm shadow">
          Haz clic donde está el pluviómetro, bebedero, corral…
        </p>
      )}

      {pendiente?.tipo === "poligono" && (
        <Card className="absolute right-3 top-3 z-10 w-72">
          <CardContent className="pt-4">
            <form action={guardarPoligono} className="space-y-3">
              <p className="text-sm font-medium">
                Superficie: {pendiente.hectareas?.toFixed(1)} has
              </p>
              {sinGeom.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Asignar a potrero existente</Label>
                  <select
                    name="potrero_id"
                    className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  >
                    <option value="">— Crear potrero nuevo —</option>
                    {sinGeom.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Nombre (si es nuevo)</Label>
                <Input name="nombre" placeholder="El Carricito" />
              </div>
              <Button type="submit" size="sm" className="w-full" disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar potrero"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {pendiente?.tipo === "punto" && (
        <Card className="absolute right-3 top-3 z-10 w-72">
          <CardContent className="pt-4">
            <form action={guardarPuntoNuevo} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">¿Qué es?</Label>
                <select
                  name="capa"
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                >
                  <option value="pluviometro">Pluviómetro</option>
                  <option value="infraestructura">Infraestructura</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo (infraestructura)</Label>
                <select
                  name="tipo"
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                >
                  {TIPOS_INFRAESTRUCTURA.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input name="nombre" placeholder="Bebedero Seri" required />
              </div>
              <Button type="submit" size="sm" className="w-full" disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar punto"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
