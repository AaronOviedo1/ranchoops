"use client";

import {
  ArrowDownToDot,
  ArrowDownToLine,
  Barrel,
  BatteryCharging,
  Beef,
  Blocks,
  BriefcaseMedical,
  Building2,
  Cable,
  CloudRain,
  Container,
  Cylinder,
  DoorOpen,
  Droplet,
  Droplets,
  Fan,
  Fence,
  FlaskConical,
  Gauge,
  GlassWater,
  MapPin,
  Milestone,
  Mountain,
  OctagonAlert,
  RotateCw,
  Route,
  Shovel,
  ShowerHead,
  Shrub,
  Skull,
  Sprout,
  Sun,
  SunMedium,
  TriangleAlert,
  Utensils,
  Warehouse,
  Waves,
  Waypoints,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { GRAFICAS_HEX, colorMapa } from "@/lib/colores";
import { cn } from "@/lib/utils";

/**
 * Un punto azul no dice si es un bebedero o un panel solar. Cada cosa del
 * rancho lleva su dibujo, que es como se lee un mapa desde la camioneta.
 */
const ICONOS: Record<string, LucideIcon> = {
  // Áreas de manejo y de suelo
  corral: Fence,
  manga: Route,
  feedlot: Warehouse,
  agricola: Sprout,
  pivote: RotateCw,
  humedal: Waves,
  erosion: Mountain,
  // Construcciones
  construccion: Building2,
  deposito_quimicos: FlaskConical,
  henera: Wheat,
  silo: Barrel,
  // Agua
  pozo: Droplet,
  perforacion: ArrowDownToDot,
  laguna: Droplets,
  cuerpo_agua: Waves,
  drenaje: ArrowDownToLine,
  tuberia: Waves,
  canal_agua: Waypoints,
  bomba: Gauge,
  bomba_solar: Sun,
  papalote: Fan,
  llave_agua: ShowerHead,
  bebedero: GlassWater,
  pila: Container,
  tanque: Cylinder,
  pluviometro: CloudRain,
  // Infraestructura
  cerco: Fence,
  cerco_electrico: Zap,
  comedero: Utensils,
  bloque_mineral: Blocks,
  botiquin: BriefcaseMedical,
  tranquera: DoorOpen,
  generador: BatteryCharging,
  linea_electrica: Cable,
  camino: Milestone,
  panel_solar: SunMedium,
  // Peligros
  cebo: Skull,
  fosa_mortandad: Shovel,
  maleza: Shrub,
  peligro: TriangleAlert,
  area_peligro: OctagonAlert,
  otro: MapPin,
};

/** Icono de un tipo, para el menú de agregar y para el pin del mapa. */
export function iconoInfra(tipo: string): LucideIcon {
  return ICONOS[tipo] ?? Beef;
}

export function colorPin(tipo: string): string {
  return tipo === "pluviometro" ? GRAFICAS_HEX[3] : colorMapa(tipo);
}

/**
 * Marcador de gota con el icono adentro. Vive dentro de un `mapboxgl.Marker`,
 * así que se dibuja en HTML: el texto no se voltea ni se estira al girar el
 * mapa, y el dedo tiene dónde picarle en el teléfono.
 */
export function PinMapa({
  nombre,
  tipo,
  sub,
  inerte,
  onClick,
}: {
  nombre: string;
  tipo: string;
  /** Segundo renglón: hectáreas del área o capacidad del tanque. */
  sub?: string | null;
  /** Mientras se traza algo, los pines no estorban el clic. */
  inerte?: boolean;
  onClick?: () => void;
}) {
  const Icono = ICONOS[tipo] ?? Beef;
  const color = colorPin(tipo);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={nombre}
      className={cn(
        "group relative block cursor-pointer",
        inerte && "pointer-events-none"
      )}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full shadow-md ring-2 ring-white/90 transition-transform group-hover:scale-110"
        style={{ backgroundColor: color }}
      >
        <Icono className="h-3.5 w-3.5 text-white" strokeWidth={2.25} />
      </span>
      {/* La punta de la gota, que es la que cae sobre la coordenada. */}
      <span
        className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 -translate-y-px border-x-[5px] border-t-[7px] border-x-transparent"
        style={{ borderTopColor: color }}
      />
      <span className="pointer-events-none absolute left-1/2 top-full mt-2 flex -translate-x-1/2 flex-col items-center whitespace-nowrap leading-tight">
        <span className="text-[11px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
          {nombre}
        </span>
        {sub && (
          <span className="text-[10px] text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
            {sub}
          </span>
        )}
      </span>
    </button>
  );
}
