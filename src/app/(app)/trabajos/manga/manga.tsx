"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { HandCoins, Loader2, ScanLine, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aviso } from "@/components/aviso";
import { etiquetaClase, etiquetaTrabajo, formatoFecha } from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";
import type { ProductoTrabajo } from "../componentes-trabajo";
import { armarEnvio } from "./armar-envio";
import { guardarBorrador, useBorrador } from "./borrador";
import { fotosDe, jornadaNueva, type Capturado, type EstadoJornada } from "./estado";
import { borrarFotosTrabajo } from "./foto-directa";
import { ListaCapturados } from "./lista-capturados";
import { PrepararJornada, type PlantillaManga } from "./preparar";
import { TarjetaAnimal, type AnimalManga } from "./tarjeta-animal";

export type { AnimalManga };

/**
 * La manga, animal por animal.
 *
 * "Hay animales que se les hacen cosas diferentes": primero se dice qué se le
 * va a hacer a todos, y luego cada animal que pasa por la trampa se busca por
 * su arete y se le anota lo suyo. El teclado nunca se suelta: arete → Enter →
 * dato → Enter → siguiente.
 *
 * Toda la jornada vive en el teléfono (borrador.ts) hasta que se cierra.
 */
export function Manga({
  action,
  existeJornada,
  ranchoId,
  animales,
  grupos,
  productos,
  plantillas,
  huboError,
}: {
  action: (formData: FormData) => Promise<void>;
  existeJornada: (sesionId: string) => Promise<boolean>;
  ranchoId: string;
  animales: AnimalManga[];
  grupos: { id: string; nombre: string }[];
  productos: ProductoTrabajo[];
  plantillas: PlantillaManga[];
  /** Se regresó con un error del servidor: la jornada sigue, sin preguntar. */
  huboError: boolean;
}) {
  const borrador = useBorrador(ranchoId);
  // Una jornada que ya estaba en el teléfono se ofrece; no se retoma sola.
  const [retomada, setRetomada] = useState(huboError);
  const [busqueda, setBusqueda] = useState("");
  const [actualId, setActualId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [yaGuardada, setYaGuardada] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();
  // La jornada en blanco, con su id, se crea una vez: se vuelve borrador en
  // cuanto se le cambia algo.
  const [enBlanco] = useState(() => jornadaNueva(fechaHoy()));
  const campoArete = useRef<HTMLInputElement>(null);

  const porId = useMemo(() => new Map(animales.map((a) => [a.id, a])), [animales]);
  const controlados = useMemo(
    () => new Set(productos.filter((p) => p.controlado).map((p) => p.id)),
    [productos]
  );

  // Si se mandó a guardar y no se supo en qué quedó (se fue la señal), se le
  // pregunta al servidor antes de ofrecerla otra vez.
  const sesionEnviada = borrador?.enviadoEn ? borrador.sesionId : null;
  useEffect(() => {
    if (!sesionEnviada) return;
    let vigente = true;
    existeJornada(sesionEnviada)
      .then((existe) => {
        if (!vigente || !existe) return;
        setYaGuardada(sesionEnviada);
        guardarBorrador(ranchoId, null);
      })
      .catch(() => {
        // Sin señal no se puede saber: se ofrece continuar, y el servidor
        // ignora el reenvío si ya la tenía.
      });
    return () => {
      vigente = false;
    };
  }, [sesionEnviada, existeJornada, ranchoId]);

  if (borrador === undefined) {
    return <div className="mx-auto h-40 max-w-2xl animate-pulse rounded-lg bg-muted" />;
  }

  // Los animales vendidos o dados de baja desde que se guardó ya no cuentan.
  const guardado = borrador
    ? { ...borrador, capturados: borrador.capturados.filter((c) => porId.has(c.animalId)) }
    : null;
  const hayAlgo =
    !!guardado && (guardado.capturados.length > 0 || guardado.fase === "captura");

  if (guardado && hayAlgo && !retomada) {
    const n = guardado.capturados.length;
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <Aviso tono="info" titulo="Hay una jornada sin cerrar en este teléfono">
          <p>
            Del {formatoFecha(guardado.fecha)}, con {n} {n === 1 ? "animal" : "animales"}{" "}
            ya {n === 1 ? "capturado" : "capturados"}
            {guardado.base.length > 0 &&
              `: ${guardado.base.map((b) => etiquetaTrabajo(b.tipo)).join(" + ")}`}
            .
          </p>
        </Aviso>
        <div className="flex flex-wrap gap-2">
          <Button className="flex-1" onClick={() => setRetomada(true)}>
            Continuar la jornada
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void borrarFotosTrabajo(fotosDe(guardado));
              guardarBorrador(ranchoId, null);
              setRetomada(true);
            }}
          >
            Descartarla y empezar otra
          </Button>
        </div>
      </div>
    );
  }

  const estado: EstadoJornada = guardado ?? enBlanco;

  const actualizar = (cambios: Partial<EstadoJornada>) => {
    setRetomada(true);
    // Cualquier cambio después de un envío fallido es una jornada viva otra vez.
    guardarBorrador(ranchoId, { ...estado, ...cambios, enviadoEn: undefined });
  };

  const enfocarArete = () => setTimeout(() => campoArete.current?.focus(), 0);

  /** Busca por arete o SINIIGA, con o sin espacios. */
  const coincidencias = (texto: string) => {
    const t = texto.replace(/\s/g, "").toLowerCase();
    if (!t) return [];
    const exactos = animales.filter(
      (a) => a.arete_control?.toLowerCase() === t || a.siniga?.toLowerCase() === t
    );
    if (exactos.length > 0) return exactos;
    return animales.filter(
      (a) => a.arete_control?.toLowerCase().includes(t) || a.siniga?.toLowerCase().includes(t)
    );
  };

  const encontrados = busqueda ? coincidencias(busqueda) : [];

  const elegir = (a: AnimalManga) => {
    setActualId(a.id);
    setBusqueda("");
    setAviso(
      estado.capturados.some((c) => c.animalId === a.id)
        ? `#${a.arete_control ?? "s/n"} ya había pasado: lo que guardes lo corrige.`
        : null
    );
  };

  const buscarYElegir = () => {
    const r = coincidencias(busqueda);
    if (r.length === 0) setAviso(`No hay ningún animal activo con «${busqueda}».`);
    else if (r.length === 1) elegir(r[0]);
    else setAviso(`${r.length} animales coinciden: elige cuál.`);
  };

  const guardarAnimal = (capturado: Capturado) => {
    actualizar({
      capturados: [
        ...estado.capturados.filter((c) => c.animalId !== capturado.animalId),
        capturado,
      ],
    });
    setActualId(null);
    setAviso(null);
    enfocarArete();
  };

  const quitar = (animalId: string) => {
    const c = estado.capturados.find((x) => x.animalId === animalId);
    if (c) void borrarFotosTrabajo(c.trabajos.flatMap((t) => (t.foto_ruta ? [t.foto_ruta] : [])));
    actualizar({ capturados: estado.capturados.filter((x) => x.animalId !== animalId) });
  };

  const cerrar = (irAVenta: boolean) => {
    const envio = armarEnvio(estado, controlados);
    const sinReceta = envio.acciones.some(
      (a) => a.producto_id && controlados.has(a.producto_id) && !(a.mvz && a.receta_folio)
    );
    if (sinReceta) {
      setAviso(
        "Se usó un producto controlado: toca «Cambiar» y captura el MVZ responsable y el folio de receta."
      );
      return;
    }
    const fd = new FormData();
    fd.set("origen", "manga");
    fd.set("sesion_id", estado.sesionId);
    fd.set("fecha", estado.fecha);
    fd.set("responsable", estado.responsable);
    fd.set("acciones", JSON.stringify(envio.acciones));
    fd.set("valores", JSON.stringify(envio.valores));
    fd.set("separar", JSON.stringify(envio.separar));
    for (const id of envio.animalIds) fd.append("animal_id", id);
    if (irAVenta) fd.set("ir_a_venta", "on");

    // Un mismo grupo para toda la jornada solo si todos vienen del mismo.
    const gruposDeOrigen = new Set(envio.animalIds.map((id) => porId.get(id)?.grupo_id ?? null));
    const [grupoComun] = gruposDeOrigen.size === 1 ? [...gruposDeOrigen] : [null];
    if (grupoComun) fd.set("grupo_id", grupoComun);

    setAviso(null);
    guardarBorrador(ranchoId, { ...estado, enviadoEn: new Date().toISOString() });
    iniciarEnvio(async () => {
      try {
        await action(fd);
      } catch (e) {
        // El redirect del servidor viaja como excepción: ese sí debe pasar.
        unstable_rethrow(e);
        setAviso(
          "No se pudo guardar, seguramente por la señal. Lo capturado sigue aquí: vuelve a cerrar la jornada cuando haya señal."
        );
      }
    });
  };

  if (estado.fase === "preparar") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        {yaGuardada && (
          <Aviso tono="exito">La jornada anterior sí se guardó. Esta es una nueva.</Aviso>
        )}
        <PrepararJornada
          estado={estado}
          productos={productos}
          plantillas={plantillas}
          onCambio={actualizar}
          onEmpezar={() => {
            actualizar({ fase: "captura" });
            enfocarArete();
          }}
        />
      </div>
    );
  }

  const actual = actualId ? (porId.get(actualId) ?? null) : null;
  const aVenta = estado.capturados.filter((c) => c.destino === "venta").length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <p className="min-w-0 truncate">
          <span className="font-medium">{formatoFecha(estado.fecha)}</span>
          <span className="text-muted-foreground">
            {" · "}
            {estado.base.length > 0
              ? estado.base.map((b) => etiquetaTrabajo(b.tipo)).join(" + ")
              : "cada animal lo suyo"}
          </span>
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => actualizar({ fase: "preparar" })}
        >
          <Settings2 /> Cambiar
        </Button>
      </div>

      {/* El input que nunca se suelta */}
      <div className="rounded-lg border-2 border-primary/30 bg-card p-4">
        {!actual ? (
          <div className="space-y-2">
            <Label htmlFor="arete-manga" className="text-base">
              Arete o SINIIGA
            </Label>
            <div className="relative">
              <ScanLine className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="arete-manga"
                ref={campoArete}
                autoFocus
                value={busqueda}
                inputMode="numeric"
                placeholder="Teclea o escanea…"
                className="h-14 pl-10 text-2xl"
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setAviso(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscarYElegir();
                  }
                }}
              />
            </div>

            {encontrados.length > 1 && (
              <div className="max-h-48 divide-y overflow-y-auto rounded-md border">
                {encontrados.slice(0, 20).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => elegir(a)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-medium">#{a.arete_control ?? "s/n"}</span>
                    <span className="font-mono text-xs text-muted-foreground">{a.siniga}</span>
                    <span className="ml-auto text-muted-foreground">
                      {etiquetaClase(a.clase)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <TarjetaAnimal
            // Cada animal estrena tarjeta: nada del anterior se le queda pegado.
            key={actual.id}
            animal={actual}
            previo={estado.capturados.find((c) => c.animalId === actual.id)}
            base={estado.base}
            fecha={estado.fecha}
            ranchoId={ranchoId}
            productos={productos}
            grupos={grupos}
            onGuardar={guardarAnimal}
            onCancelar={() => {
              setActualId(null);
              setAviso(null);
              enfocarArete();
            }}
          />
        )}

        {aviso && (
          <Aviso tono="alerta" className="mt-3">
            {aviso}
          </Aviso>
        )}
      </div>

      {estado.capturados.length > 0 && (
        <ListaCapturados
          capturados={estado.capturados}
          animales={porId}
          grupos={grupos}
          onEditar={(id) => {
            const a = porId.get(id);
            if (a) elegir(a);
          }}
          onMarcar={(id, destino) =>
            actualizar({
              capturados: estado.capturados.map((c) =>
                c.animalId === id ? { ...c, destino } : c
              ),
            })
          }
          onQuitar={quitar}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1"
          disabled={estado.capturados.length === 0 || enviando || !!actual}
          onClick={() => cerrar(false)}
        >
          {enviando && <Loader2 className="animate-spin" />}
          Cerrar jornada ({estado.capturados.length})
        </Button>
        {aVenta > 0 && (
          <Button
            variant="secondary"
            className="flex-1"
            disabled={enviando || !!actual}
            onClick={() => cerrar(true)}
          >
            <HandCoins /> Cerrar y hacer la venta ({aVenta})
          </Button>
        )}
      </div>
    </div>
  );
}
