import {
  BarChart3,
  Beef,
  Boxes,
  CloudRain,
  Fence,
  HandCoins,
  Home,
  Map,
  NotebookPen,
  Package,
  Receipt,
  Settings,
  Syringe,
  type LucideIcon,
} from "lucide-react";

export type GrupoNav = "operacion" | "tierra" | "dinero" | "sistema";

export type Seccion = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  grupo: GrupoNav;
};

export const GRUPOS: { clave: GrupoNav; etiqueta: string }[] = [
  { clave: "operacion", etiqueta: "Operación" },
  { clave: "tierra", etiqueta: "Tierra" },
  { clave: "dinero", etiqueta: "Dinero" },
  { clave: "sistema", etiqueta: "Sistema" },
];

export const SECCIONES: Seccion[] = [
  { href: "/", etiqueta: "Inicio", icono: Home, grupo: "operacion" },
  { href: "/ganado", etiqueta: "Ganado", icono: Beef, grupo: "operacion" },
  { href: "/grupos", etiqueta: "Grupos", icono: Boxes, grupo: "operacion" },
  { href: "/trabajos", etiqueta: "Trabajos", icono: Syringe, grupo: "operacion" },
  { href: "/bitacora", etiqueta: "Bitácora", icono: NotebookPen, grupo: "operacion" },
  { href: "/potreros", etiqueta: "Potreros", icono: Fence, grupo: "tierra" },
  { href: "/mapa", etiqueta: "Mapa", icono: Map, grupo: "tierra" },
  { href: "/lluvias", etiqueta: "Lluvias", icono: CloudRain, grupo: "tierra" },
  { href: "/costos", etiqueta: "Costos", icono: Receipt, grupo: "dinero" },
  { href: "/ventas", etiqueta: "Ventas", icono: HandCoins, grupo: "dinero" },
  { href: "/inventario", etiqueta: "Inventario", icono: Package, grupo: "dinero" },
  { href: "/reportes", etiqueta: "Reportes", icono: BarChart3, grupo: "dinero" },
  { href: "/configuracion", etiqueta: "Configuración", icono: Settings, grupo: "sistema" },
];

export function esActiva(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function seccionActiva(pathname: string): Seccion | undefined {
  // El match más largo gana: /ganado/nuevo debe resolver a /ganado, no a /.
  return [...SECCIONES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((s) => esActiva(pathname, s.href));
}

export function seccionesPorGrupo(grupo: GrupoNav): Seccion[] {
  return SECCIONES.filter((s) => s.grupo === grupo);
}
