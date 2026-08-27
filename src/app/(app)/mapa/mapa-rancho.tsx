"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { GRAFICAS_HEX, MARCA, SEMAFORO, colorMapa } from "@/lib/colores";
import { estadoPotrero } from "@/lib/estados";
import { SelectCampo } from "@/components/ui/select-campo";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import area from "@turf/area";
import centroid from "@turf/centroid";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import {
  borrarMarcaMapa,
  guardarGeomPotrero,
  guardarGeometria,
  guardarPunto,
  moverGrupoDesdeMapa,
  quitarTrazoPotrero,
} from "../potreros/acciones";
import { tipoInfra, type TipoInfra } from "@/lib/catalogos";
import { ImportarKmz } from "./importar-kmz";
import { MenuAgregar } from "./menu-agregar";
import { PinMapa } from "./pines";

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
  capacidad?: number | null;
};

export type GrupoMapa = { id: string; nombre: string; potrero_actual_id: string | null };

/**
 * "ver" es mirar el mapa; "potrero" traza un potrero nuevo; "infra" traza lo
 * que se haya elegido en el menú de agregar, que ya sabe si es punto, línea o
 * área.
 */
type Modo = "ver" | "potrero" | "infra";

// Mapbox usa su propio parser de color y no entiende oklch():
// los valores vienen en hex desde src/lib/colores.ts.
function colorDe(p: PotreroMapa, meta: number): string {
  return SEMAFORO[estadoPotrero(p.dias_descanso, meta, p.ocupado).clave].hex;
}

function coleccionPotreros(
  potreros: PotreroMapa[],
  meta: number
): GeoJSON.FeatureCollection {
  return {
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
}

// Lo que no es potrero se reparte por geometría: un tanque es un punto,
// la tubería una línea y el corral o el área agrícola son polígonos.
function coleccionInfra(
  puntos: PuntoMapa[],
  cual: "punto" | "linea" | "poligono"
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: puntos
      .filter((p) => p.geom && (tipoInfra(p.tipo)?.geometria ?? "punto") === cual)
      .map((p) => ({
        ...(p.geom as GeoJSON.Feature),
        properties: {
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          color: p.tipo === "pluviometro" ? GRAFICAS_HEX[3] : colorMapa(p.tipo),
          etiqueta: tipoInfra(p.tipo)?.etiqueta ?? p.tipo,
        },
      })),
  };
}

/** Los nombres los escribe el ranchero y el globo se arma con HTML a mano. */
function esc(texto: string): string {
  return String(texto ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

/**
 * Al pasar el ratón, la zona de abajo se delinea en blanco y más gruesa: sin
 * eso no se sabe cuál de dos potreros encimados va a responder al clic.
 */
const ENCIMA: mapboxgl.ExpressionSpecification = [
  "boolean",
  ["feature-state", "hover"],
  false,
];

type Valor = number | string | mapboxgl.ExpressionSpecification;

function siEncima(resaltado: Valor, normal: Valor): mapboxgl.ExpressionSpecification {
  return ["case", ENCIMA, resaltado, normal];
}

/** Dónde se clava el pin: el punto mismo o el centro del área. */
function centroDe(feature: GeoJSON.Feature): [number, number] | null {
  const geom = feature.geometry;
  if (geom.type === "Point") return geom.coordinates as [number, number];
  if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") return null;
  const c = centroid(feature as GeoJSON.Feature<GeoJSON.Polygon>);
  return c.geometry.coordinates as [number, number];
}

/** Renglón chico del pin: hectáreas del área o litros del tanque. */
function subDelPin(p: PuntoMapa): string | null {
  if (p.geom && (tipoInfra(p.tipo)?.geometria ?? "punto") === "poligono") {
    const has = area(p.geom as GeoJSON.Feature<GeoJSON.Polygon>) / 10000;
    return `${has.toFixed(has < 10 ? 1 : 0)} ha`;
  }
  if (p.capacidad) return `${p.capacidad.toLocaleString("es-MX")} L`;
  return null;
}

/** Mete cualquier geometría en el encuadre inicial del mapa. */
function extender(bounds: mapboxgl.LngLatBounds, geom: GeoJSON.Geometry) {
  if (geom.type === "Point") {
    bounds.extend(geom.coordinates as [number, number]);
  } else if (geom.type === "LineString" || geom.type === "MultiPoint") {
    for (const c of geom.coordinates) bounds.extend(c as [number, number]);
  } else if (geom.type === "Polygon" || geom.type === "MultiLineString") {
    for (const parte of geom.coordinates)
      for (const c of parte) bounds.extend(c as [number, number]);
  } else if (geom.type === "MultiPolygon") {
    for (const pol of geom.coordinates)
      for (const anillo of pol)
        for (const c of anillo) bounds.extend(c as [number, number]);
  }
}

export function MapaRancho({
  token,
  potreros,
  puntos,
  grupos,
  meta,
}: {
  token: string;
  potreros: PotreroMapa[];
  /** Todo lo que no es potrero: puntos, líneas y áreas de infraestructura. */
  puntos: PuntoMapa[];
  grupos: GrupoMapa[];
  meta: number;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const resaltadoRef = useRef<{ source: string; id: string | number } | null>(null);
  const router = useRouter();

  const [modo, setModo] = useState<Modo>("ver");
  const [tipoElegido, setTipoElegido] = useState<TipoInfra | null>(null);
  const [pendiente, setPendiente] = useState<{
    tipo: "poligono" | "punto" | "linea";
    geom: GeoJSON.Feature;
    hectareas?: number;
  } | null>(null);
  // Potrero sobre el que se hizo clic, para mover un grupo ahí.
  const [moviendo, setMoviendo] = useState<{ id: string; nombre: string } | null>(null);
  // Lo que no es potrero y se acaba de tocar: área, tubería, bebedero…
  const [marca, setMarca] = useState<{ id: string; nombre: string; tipo: string } | null>(
    null
  );
  // Quitar algo del mapa pide un segundo clic; un resbalón borra un trazo de
  // 300 hectáreas.
  const [confirmando, setConfirmando] = useState<"marca" | "potrero" | null>(null);
  const [guardando, setGuardando] = useState(false);
  const modoRef = useRef(modo);
  useEffect(() => {
    modoRef.current = modo;
  }, [modo]);

  const [error, setError] = useState<string | null>(null);
  // Los pines son HTML dentro de un mapboxgl.Marker: el mapa presta el hueco
  // y React pinta el icono adentro con un portal.
  const [mapaListo, setMapaListo] = useState(false);
  const [anclas, setAnclas] = useState<
    { punto: PuntoMapa; centro: [number, number]; el: HTMLDivElement }[]
  >([]);

  const sinGeom = potreros.filter((p) => !p.geom);

  // Las capas se arman fuera del efecto del mapa: al guardar, router.refresh()
  // trae potreros y puntos nuevos desde el servidor y el efecto de
  // sincronización se los pasa a Mapbox. Armadas adentro, el mapa se quedaba
  // con la foto del primer render y lo recién trazado no volvía a aparecer.
  const fcPotreros = useMemo(() => coleccionPotreros(potreros, meta), [potreros, meta]);
  const fcAreas = useMemo(() => coleccionInfra(puntos, "poligono"), [puntos]);
  const fcLineas = useMemo(() => coleccionInfra(puntos, "linea"), [puntos]);
  const fcPuntos = useMemo(() => coleccionInfra(puntos, "punto"), [puntos]);

  // El efecto del mapa corre una sola vez, así que lee los datos de aquí para
  // no capturar los del primer render.
  const datosRef = useRef({ fcPotreros, fcAreas, fcLineas, fcPuntos });
  const capasListasRef = useRef(false);

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

    map.on("load", () => {
      const { fcPotreros: fc, fcAreas, fcLineas, fcPuntos } = datosRef.current;

      // promoteId: los identificadores del rancho son uuid y Mapbox solo
      // acepta números como id de feature si no se le promueve una propiedad.
      map.addSource("potreros", { type: "geojson", data: fc, promoteId: "id" });
      map.addLayer({
        id: "potreros-fill",
        type: "fill",
        source: "potreros",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": siEncima(0.6, 0.45),
        },
      });
      // Sombra del contorno: sobre la foto satelital, una línea sola se pierde
      // en cuanto el terreno tiene el mismo tono que el potrero.
      map.addLayer({
        id: "potreros-borde",
        type: "line",
        source: "potreros",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": MARCA.tinta,
          "line-width": siEncima(8, 5),
          "line-opacity": 0.45,
          "line-blur": 1,
        },
      });
      // El contorno lleva el color del potrero, no un blanco genérico: la
      // sombra de abajo es la que lo despega de la foto.
      map.addLayer({
        id: "potreros-line",
        type: "line",
        source: "potreros",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": siEncima(5, 3),
        },
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
          "text-color": MARCA.hueso,
          "text-halo-color": MARCA.tinta,
          "text-halo-width": 1,
        },
      });

      // Áreas: corral, manga, feedlot, agrícola, humedal, zona de erosión.
      map.addSource("areas", { type: "geojson", data: fcAreas, promoteId: "id" });
      map.addLayer({
        id: "areas-fill",
        type: "fill",
        source: "areas",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": siEncima(0.55, 0.4),
        },
      });
      map.addLayer({
        id: "areas-borde",
        type: "line",
        source: "areas",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": MARCA.tinta,
          "line-width": siEncima(6, 4),
          "line-opacity": 0.45,
          "line-blur": 1,
        },
      });
      map.addLayer({
        id: "areas-line",
        type: "line",
        source: "areas",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": siEncima(4, 2.5),
        },
      });
      // Líneas: tubería del agua, cercos, caminos.
      map.addSource("lineas", { type: "geojson", data: fcLineas, promoteId: "id" });
      map.addLayer({
        id: "lineas-borde",
        type: "line",
        source: "lineas",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": MARCA.tinta,
          "line-width": siEncima(8, 5.5),
          "line-opacity": 0.4,
          "line-blur": 1,
        },
      });
      map.addLayer({
        id: "lineas-line",
        type: "line",
        source: "lineas",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": siEncima(5.5, 3),
          "line-dasharray": [2, 1],
        },
      });
      map.addLayer({
        id: "lineas-label",
        type: "symbol",
        source: "lineas",
        layout: {
          "text-field": ["get", "nombre"],
          "text-size": 10,
          "symbol-placement": "line",
        },
        paint: {
          "text-color": MARCA.hueso,
          "text-halo-color": MARCA.tinta,
          "text-halo-width": 1,
        },
      });

      capasListasRef.current = true;
      setMapaListo(true);

      // Si el rancho todavía no tiene potreros trazados, encuadra lo que haya:
      // un corral o un bebedero sueltos también dicen dónde está el rancho.
      const bounds = new mapboxgl.LngLatBounds();
      for (const coleccion of [fc, fcAreas, fcLineas, fcPuntos])
        for (const f of coleccion.features) extender(bounds, f.geometry);
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, maxZoom: 15 });

      // Un solo clic, un solo globo. El corral, la tubería o el bebedero viven
      // encima del potrero, así que si cada capa abriera el suyo se
      // encimarían dos globos sobre el mismo punto: aquí se juntan en uno,
      // con lo más específico arriba y el potrero que lo contiene abajo.
      const capasClic = ["lineas-line", "areas-fill", "potreros-fill"];

      map.on("click", (e) => {
        if (modoRef.current !== "ver") return;
        const capas = capasClic.filter((c) => map.getLayer(c));
        const halladas = capas.length ? map.queryRenderedFeatures(e.point, { layers: capas }) : [];

        const infra = capas
          .filter((c) => c !== "potreros-fill")
          .flatMap((c) => halladas.filter((f) => f.layer?.id === c))[0];
        const potrero = halladas.find((f) => f.layer?.id === "potreros-fill");

        if (!infra && !potrero) {
          popupRef.current?.remove();
          setMoviendo(null);
          setMarca(null);
          setConfirmando(null);
          return;
        }

        setConfirmando(null);
        const suya = infra?.properties as
          | { id: string; nombre: string; tipo: string }
          | undefined;
        setMarca(
          suya?.id ? { id: suya.id, nombre: suya.nombre, tipo: suya.tipo } : null
        );

        const pot = potrero?.properties as
          | { id: string; nombre: string; has: number | null; estado: string }
          | undefined;
        setMoviendo(pot ? { id: pot.id, nombre: pot.nombre } : null);

        const bloques: string[] = [];
        if (infra) {
          const props = infra.properties as { nombre: string; etiqueta: string };
          bloques.push(
            `<p class="popup-titulo">${esc(props.nombre)}</p>
             <p class="popup-dato">${esc(props.etiqueta)}</p>`
          );
        }
        if (pot) {
          // Si arriba ya va un corral, el potrero pasa a ser el renglón de
          // abajo: "esto está dentro de tal potrero".
          bloques.push(
            `<p class="${infra ? "popup-dato" : "popup-titulo"}">${esc(pot.nombre)}</p>
             ${pot.has ? `<p class="popup-dato">${Number(pot.has).toFixed(1)} has</p>` : ""}
             <p class="popup-dato">${esc(pot.estado)}</p>
             <a class="popup-enlace" href="/potreros/${esc(pot.id)}">Ver ficha</a>`
          );
        }

        popupRef.current ??= new mapboxgl.Popup({
          className: "popup-ranch",
          closeButton: false,
        });
        popupRef.current
          .setLngLat(e.lngLat)
          .setHTML(`<div>${bloques.join('<hr class="popup-raya" />')}</div>`)
          .addTo(map);
      });

      // Resaltado al pasar por encima. Va en un solo mousemove y no capa por
      // capa para que se marque una sola zona: la de más arriba bajo el ratón.
      const apagarResaltado = () => {
        if (!resaltadoRef.current) return;
        map.setFeatureState(resaltadoRef.current, { hover: false });
        resaltadoRef.current = null;
      };

      map.on("mousemove", (e) => {
        if (modoRef.current !== "ver") {
          apagarResaltado();
          return;
        }
        const capas = capasClic.filter((c) => map.getLayer(c));
        const halladas = capas.length
          ? map.queryRenderedFeatures(e.point, { layers: capas })
          : [];
        const encima = capas.flatMap((c) =>
          halladas.filter((f) => f.layer?.id === c)
        )[0];

        if (!encima || encima.id == null || !encima.source) {
          apagarResaltado();
          map.getCanvas().style.cursor = "";
          return;
        }

        map.getCanvas().style.cursor = "pointer";
        const cual = { source: encima.source, id: encima.id };
        if (
          resaltadoRef.current?.source === cual.source &&
          resaltadoRef.current?.id === cual.id
        ) {
          return;
        }
        apagarResaltado();
        map.setFeatureState(cual, { hover: true });
        resaltadoRef.current = cual;
      });

      // Sacar el ratón del mapa también apaga el resaltado.
      map.on("mouseout", () => {
        apagarResaltado();
        map.getCanvas().style.cursor = "";
      });
    });

    map.on("draw.create", (e: { features: GeoJSON.Feature[] }) => {
      const f = e.features[0];
      if (!f) return;
      if (f.geometry.type === "Polygon") {
        const hectareas = area(f as GeoJSON.Feature<GeoJSON.Polygon>) / 10000;
        setPendiente({ tipo: "poligono", geom: f, hectareas });
      } else if (f.geometry.type === "LineString") {
        setPendiente({ tipo: "linea", geom: f });
      } else if (f.geometry.type === "Point") {
        setPendiente({ tipo: "punto", geom: f });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
      resaltadoRef.current = null;
      capasListasRef.current = false;
      setMapaListo(false);
    };
  }, [token]);

  // Lo que se acaba de guardar entra al mapa sin recargar la página.
  useEffect(() => {
    // El efecto corre antes de que Mapbox dispare "load", así que el mapa toma
    // de aquí los datos frescos aunque las capas todavía no existan.
    datosRef.current = { fcPotreros, fcAreas, fcLineas, fcPuntos };
    const map = mapRef.current;
    if (!map || !capasListasRef.current) return;
    const fuentes: [string, GeoJSON.FeatureCollection][] = [
      ["potreros", fcPotreros],
      ["areas", fcAreas],
      ["lineas", fcLineas],
    ];
    for (const [id, datos] of fuentes) {
      const fuente = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
      fuente?.setData(datos);
    }
    // setData borra los feature-state, así que el resaltado se vuelve a
    // calcular en el siguiente movimiento del ratón.
    resaltadoRef.current = null;
  }, [fcPotreros, fcAreas, fcLineas, fcPuntos]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapaListo) return;

    const marcadores: mapboxgl.Marker[] = [];
    const puestas: { punto: PuntoMapa; centro: [number, number]; el: HTMLDivElement }[] = [];
    for (const punto of puntos) {
      // La tubería y los cercos se rotulan a lo largo de la línea, no con pin.
      if (!punto.geom || (tipoInfra(punto.tipo)?.geometria ?? "punto") === "linea") continue;
      const centro = centroDe(punto.geom);
      if (!centro) continue;
      const el = document.createElement("div");
      marcadores.push(
        new mapboxgl.Marker({ element: el, anchor: "bottom", offset: [0, -6] })
          .setLngLat(centro)
          .addTo(map)
      );
      puestas.push({ punto, centro, el });
    }
    setAnclas(puestas);

    return () => {
      for (const m of marcadores) m.remove();
      setAnclas([]);
    };
  }, [puntos, mapaListo]);

  const abrirPin = (punto: PuntoMapa, centro: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;
    setMoviendo(null);
    setConfirmando(null);
    setMarca({ id: punto.id, nombre: punto.nombre, tipo: punto.tipo });
    const sub = subDelPin(punto);
    popupRef.current ??= new mapboxgl.Popup({
      className: "popup-ranch",
      closeButton: false,
    });
    popupRef.current
      .setLngLat(centro)
      .setHTML(
        `<div>
          <p class="popup-titulo">${esc(punto.nombre)}</p>
          <p class="popup-dato">${esc(tipoInfra(punto.tipo)?.etiqueta ?? punto.tipo)}</p>
          ${sub ? `<p class="popup-dato">${esc(sub)}</p>` : ""}
        </div>`
      )
      .addTo(map);
  };

  const quitarMarca = async () => {
    if (!marca) return;
    setGuardando(true);
    setError(null);
    const r = await borrarMarcaMapa({
      id: marca.id,
      capa: marca.tipo === "pluviometro" ? "pluviometro" : "infraestructura",
    });
    setGuardando(false);
    if (r?.error) return setError(r.error);
    popupRef.current?.remove();
    setMarca(null);
    setConfirmando(null);
    router.refresh();
  };

  const quitarTrazo = async () => {
    if (!moviendo) return;
    setGuardando(true);
    setError(null);
    const r = await quitarTrazoPotrero(moviendo.id);
    setGuardando(false);
    if (r?.error) return setError(r.error);
    popupRef.current?.remove();
    setMoviendo(null);
    setConfirmando(null);
    router.refresh();
  };

  const limpiar = () => {
    setPendiente(null);
    setMoviendo(null);
    setMarca(null);
    setConfirmando(null);
    setError(null);
    popupRef.current?.remove();
    drawRef.current?.deleteAll();
  };

  /** `tipo` en null es un potrero; lo demás trae su propia geometría. */
  const empezar = (tipo: TipoInfra | null) => {
    limpiar();
    setModo(tipo ? "infra" : "potrero");
    setTipoElegido(tipo);
    const geometria = tipo?.geometria ?? "poligono";
    if (geometria === "punto") drawRef.current?.changeMode("draw_point");
    else if (geometria === "linea") drawRef.current?.changeMode("draw_line_string");
    else drawRef.current?.changeMode("draw_polygon");
  };

  const cancelar = () => {
    limpiar();
    setModo("ver");
    setTipoElegido(null);
    drawRef.current?.changeMode("simple_select");
  };

  const guardarPoligono = async (formData: FormData) => {
    if (!pendiente) return;
    setGuardando(true);
    setError(null);
    const potreroId = String(formData.get("potrero_id") ?? "");
    const nombre = String(formData.get("nombre") ?? "").trim();
    const r = await guardarGeomPotrero({
      potreroId: potreroId || undefined,
      nombre: nombre || undefined,
      geom: pendiente.geom,
      superficieHas: Math.round((pendiente.hectareas ?? 0) * 10) / 10,
    });
    setGuardando(false);
    // Con error se deja el trazo en pantalla: perderlo obliga a redibujarlo.
    if (r?.error) return setError(r.error);
    cancelar();
    router.refresh();
  };

  const guardarMejora = async (formData: FormData) => {
    if (!pendiente || !tipoElegido) return;
    setGuardando(true);
    setError(null);
    const nombre =
      String(formData.get("nombre") ?? "").trim() || tipoElegido.etiqueta;
    const capacidad = formData.get("capacidad");
    const r =
      tipoElegido.capa === "pluviometro"
        ? await guardarPunto({ capa: "pluviometro", nombre, geom: pendiente.geom })
        : await guardarGeometria({
            tipo: tipoElegido.valor,
            nombre,
            geom: pendiente.geom,
            capacidad: capacidad ? Number(capacidad) : null,
          });
    setGuardando(false);
    if (r?.error) return setError(r.error);
    cancelar();
    router.refresh();
  };

  const moverGrupoAqui = async (formData: FormData) => {
    const grupoId = String(formData.get("grupo_id") ?? "");
    if (!moviendo || !grupoId) return;
    setGuardando(true);
    await moverGrupoDesdeMapa({ grupoId, potreroId: moviendo.id });
    setGuardando(false);
    setMoviendo(null);
    router.refresh();
  };

  return (
    <div className="relative h-[calc(100dvh-160px)] min-h-[420px] overflow-hidden rounded-lg border md:h-[calc(100dvh-120px)]">
      <div ref={contenedor} className="h-full w-full" />

      {anclas.map(({ punto, centro, el }) =>
        createPortal(
          <PinMapa
            nombre={punto.nombre}
            tipo={punto.tipo}
            sub={subDelPin(punto)}
            inerte={modo !== "ver"}
            onClick={() => abrirPin(punto, centro)}
          />,
          el,
          punto.id
        )
      )}

      <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
        {modo === "ver" ? (
          <>
            <MenuAgregar
              onPotrero={() => empezar(null)}
              onTipo={(tipo) => empezar(tipo)}
            />
            <ImportarKmz potrerosSinGeom={sinGeom} />
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={cancelar}>
            Cancelar
          </Button>
        )}
      </div>

      <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-card/95 p-2 text-xs ring-1 ring-border backdrop-blur">
        <div className="flex items-center gap-3">
          {[
            ["Ocupado", SEMAFORO.ocupado.hex],
            [`Descansando (<${meta}d)`, SEMAFORO.descansando.hex],
            ["Listo", SEMAFORO.listo.hex],
            ["Sin datos", SEMAFORO.sinDatos.hex],
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

      {modo !== "ver" && !pendiente && (
        <p className="absolute left-1/2 top-14 z-10 -translate-x-1/2 rounded-lg bg-card/95 px-3 py-1.5 text-center text-sm ring-1 ring-border backdrop-blur sm:top-3">
          {!tipoElegido
            ? "Traza el potrero; doble clic para terminar."
            : tipoElegido.geometria === "punto"
              ? `Haz clic donde está ${tipoElegido.etiqueta.toLowerCase()}.`
              : tipoElegido.geometria === "linea"
                ? `Haz clic siguiendo ${tipoElegido.etiqueta.toLowerCase()}; doble clic para terminar.`
                : `Traza ${tipoElegido.etiqueta.toLowerCase()}; doble clic para terminar.`}
        </p>
      )}

      <div className="pointer-events-none absolute right-3 top-3 z-10 flex w-72 max-w-[calc(100%-1.5rem)] flex-col gap-2">
        {pendiente?.tipo === "poligono" && modo === "potrero" && (
          <Card className="pointer-events-auto">
            <CardContent className="pt-4">
              <form action={guardarPoligono} className="space-y-3">
                <p className="text-sm font-medium">
                  Superficie: {pendiente.hectareas?.toFixed(1)} has
                </p>
                {sinGeom.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Asignar a potrero existente</Label>
                    <SelectCampo
                      name="potrero_id"
                      size="sm"
                      opcionVacia="— Crear potrero nuevo —"
                      placeholder="— Crear potrero nuevo —"
                      opciones={sinGeom.map((p) => ({
                        valor: p.id,
                        etiqueta: p.nombre,
                      }))}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Nombre (si es nuevo)</Label>
                  <Input name="nombre" placeholder="El Carricito" />
                </div>
                {error && (
                  <p className="text-xs text-destructive">No se pudo guardar: {error}</p>
                )}
                <Button type="submit" size="sm" className="w-full" disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar potrero"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {pendiente && modo === "infra" && tipoElegido && (
          <Card className="pointer-events-auto">
            <CardContent className="pt-4">
              <form action={guardarMejora} className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{tipoElegido.etiqueta}</p>
                  {pendiente.hectareas != null && (
                    <p className="text-xs text-muted-foreground">
                      {pendiente.hectareas.toFixed(1)} has
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    name="nombre"
                    placeholder={`${tipoElegido.etiqueta} 1`}
                    required
                  />
                </div>
                {tipoElegido.capacidad && (
                  <div className="space-y-1">
                    <Label className="text-xs">Capacidad (litros)</Label>
                    <Input name="capacidad" type="number" step="1" inputMode="numeric" />
                  </div>
                )}
                {error && (
                  <p className="text-xs text-destructive">No se pudo guardar: {error}</p>
                )}
                <Button type="submit" size="sm" className="w-full" disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* El potrero que se acaba de tocar: mover un grupo o borrar el trazo. */}
        {moviendo && modo === "ver" && (
          <Card className="pointer-events-auto">
            <CardContent className="space-y-3 pt-4">
              <p className="text-sm font-medium">{moviendo.nombre}</p>

              {grupos.length > 0 && (
                <form action={moverGrupoAqui} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Mover un grupo aquí</Label>
                    <SelectCampo
                      name="grupo_id"
                      size="sm"
                      placeholder="Elige el grupo"
                      opciones={grupos.map((g) => ({
                        valor: g.id,
                        etiqueta: g.nombre,
                        deshabilitada: g.potrero_actual_id === moviendo.id,
                      }))}
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={guardando}>
                    {guardando ? "Moviendo…" : "Mover aquí"}
                  </Button>
                </form>
              )}

              {error && (
                <p className="text-xs text-destructive">No se pudo: {error}</p>
              )}

              {confirmando === "potrero" ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    Se borra el dibujo. El potrero se queda con su nombre, su
                    historial y sus animales.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={guardando}
                      onClick={quitarTrazo}
                    >
                      {guardando ? "Quitando…" : "Sí, borrar el trazo"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmando(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 border-t pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmando("potrero")}
                  >
                    <Trash2 className="size-4" />
                    Borrar el trazo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setMoviendo(null);
                      popupRef.current?.remove();
                    }}
                  >
                    Cerrar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Área, tubería o punto tocado: lo único que se puede hacer es quitarlo. */}
        {marca && modo === "ver" && (
          <Card className="pointer-events-auto">
            <CardContent className="space-y-3 pt-4">
              <div>
                <p className="text-sm font-medium">{marca.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {marca.tipo === "pluviometro"
                    ? "Pluviómetro"
                    : (tipoInfra(marca.tipo)?.etiqueta ?? marca.tipo)}
                </p>
              </div>

              {error && (
                <p className="text-xs text-destructive">No se pudo quitar: {error}</p>
              )}

              {confirmando === "marca" ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {marca.tipo === "pluviometro"
                      ? "Sale del mapa y de la tabla de lluvias, pero los milímetros que ya registraste no se borran."
                      : "Se quita del mapa y no se puede deshacer."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={guardando}
                      onClick={quitarMarca}
                    >
                      {guardando ? "Quitando…" : "Sí, quitar"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmando(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmando("marca")}
                  >
                    <Trash2 className="size-4" />
                    Quitar del mapa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setMarca(null);
                      popupRef.current?.remove();
                    }}
                  >
                    Cerrar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
