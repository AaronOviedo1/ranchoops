import {
  BarChart3,
  Beef,
  CalendarDays,
  CloudRain,
  Fence,
  HandCoins,
  Home,
  Map,
  Mountain,
  NotebookPen,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Sprout,
  Syringe,
  Wallet,
  Boxes,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

/** Rol mínimo que ve la sección. Sin `rol`, la ve cualquiera. */
export type RolNav = "admin" | "operador";

export type Pestana = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  rol?: RolNav;
};

export type Seccion = {
  /** A dónde lleva el renglón del menú: la primera pestaña de la sección. */
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  rol?: RolNav;
  /**
   * Las pantallas que viven bajo el mismo renglón. Se recorren con pestañas
   * arriba del contenido en vez de con un renglón cada una en el menú.
   */
  pestanas?: Pestana[];
  /** Configuración no va en la lista: vive en el pie, junto a cerrar sesión. */
  alPie?: boolean;
};

/**
 * El menú del rancho.
 *
 * Eran diecisiete renglones repartidos en cuatro rótulos, y con eso el menú se
 * volvía una lista que hay que leer entera. Lo que trata del mismo asunto se
 * juntó en una sección: la tierra es una sola aunque se mire por potrero, por
 * pastoreo, por mapa o por lluvia.
 */
export const SECCIONES: Seccion[] = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  {
    href: "/ganado",
    etiqueta: "Ganado",
    icono: Beef,
    pestanas: [
      { href: "/ganado", etiqueta: "Animales", icono: Beef },
      { href: "/grupos", etiqueta: "Grupos", icono: Boxes },
    ],
  },
  { href: "/trabajos", etiqueta: "Trabajos", icono: Syringe },
  {
    href: "/agenda",
    etiqueta: "Agenda",
    icono: CalendarDays,
    pestanas: [
      { href: "/agenda", etiqueta: "Agenda", icono: CalendarDays },
      { href: "/bitacora", etiqueta: "Bitácora", icono: NotebookPen },
      { href: "/registros", etiqueta: "Registros", icono: ClipboardList },
    ],
  },
  {
    href: "/potreros",
    etiqueta: "Tierra",
    icono: Mountain,
    rol: "operador",
    pestanas: [
      { href: "/potreros", etiqueta: "Potreros", icono: Fence },
      { href: "/pastoreo", etiqueta: "Pastoreo", icono: Sprout },
      { href: "/mapa", etiqueta: "Mapa", icono: Map },
      { href: "/lluvias", etiqueta: "Lluvias", icono: CloudRain },
    ],
  },
  {
    href: "/costos",
    etiqueta: "Dinero",
    icono: Wallet,
    rol: "admin",
    pestanas: [
      { href: "/costos", etiqueta: "Costos", icono: Receipt },
      { href: "/compras", etiqueta: "Compras", icono: ShoppingCart },
      { href: "/ventas", etiqueta: "Ventas", icono: HandCoins },
    ],
  },
  { href: "/inventario", etiqueta: "Inventario", icono: Package, rol: "operador" },
  { href: "/reportes", etiqueta: "Reportes", icono: BarChart3, rol: "admin" },
  {
    href: "/configuracion",
    etiqueta: "Configuración",
    icono: Settings,
    rol: "admin",
    alPie: true,
  },
];

/** Jerarquía: admin ve todo, operador ve lo suyo, capturista solo lo abierto. */
const ALCANCE: Record<string, RolNav[]> = {
  admin: ["admin", "operador"],
  operador: ["operador"],
  capturista: [],
};

function alcanza(rol: string, pide?: RolNav): boolean {
  return !pide || (ALCANCE[rol] ?? []).includes(pide);
}

/** Los renglones del menú (sin lo que va al pie). */
export function seccionesPara(rol: string): Seccion[] {
  return SECCIONES.filter((s) => !s.alPie && alcanza(rol, s.rol));
}

export function seccionesAlPie(rol: string): Seccion[] {
  return SECCIONES.filter((s) => s.alPie && alcanza(rol, s.rol));
}

export function pestanasPara(seccion: Seccion, rol: string): Pestana[] {
  return (seccion.pestanas ?? []).filter((p) => alcanza(rol, p.rol));
}

function coincide(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Una sección se prende también cuando estás en cualquiera de sus pestañas. */
export function esActiva(pathname: string, seccion: Seccion): boolean {
  if (seccion.pestanas?.length) {
    return seccion.pestanas.some((p) => coincide(pathname, p.href));
  }
  return coincide(pathname, seccion.href);
}

/** Todas las rutas, aplanadas y de la más larga a la más corta. */
function rutas(): { href: string; seccion: Seccion; pestana?: Pestana }[] {
  const todas: { href: string; seccion: Seccion; pestana?: Pestana }[] = [];
  for (const s of SECCIONES) {
    if (s.pestanas?.length) {
      for (const p of s.pestanas) todas.push({ href: p.href, seccion: s, pestana: p });
    } else {
      todas.push({ href: s.href, seccion: s });
    }
  }
  // El match más largo gana: /ganado/nuevo resuelve a /ganado, no a /.
  return todas.sort((a, b) => b.href.length - a.href.length);
}

export function seccionActiva(pathname: string): Seccion | undefined {
  return rutas().find((r) => coincide(pathname, r.href))?.seccion;
}

/** La pestaña en la que estás parado, para el título del encabezado. */
export function pestanaActiva(pathname: string): Pestana | undefined {
  return rutas().find((r) => coincide(pathname, r.href))?.pestana;
}
