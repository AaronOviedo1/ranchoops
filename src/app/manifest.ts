import type { MetadataRoute } from "next";

/**
 * Manifiesto de la app instalable.
 *
 * Next lo sirve en /manifest.webmanifest. Los iconos "maskable" son los que
 * Android recorta a la forma del sistema (círculo, cuadrado redondeado); el
 * logo va más chico dentro para que el recorte no se lo coma.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RanchOps — Administración del rancho",
    short_name: "RanchOps",
    description:
      "Ganado, potreros, lluvias, costos y ventas del rancho, desde el celular.",
    lang: "es-MX",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF7F0",
    theme_color: "#FAF7F0",
    categories: ["productivity", "business", "utilities"],
    icons: [
      {
        src: "/iconos/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/iconos/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/iconos/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/iconos/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Capturar trabajo",
        short_name: "Capturar",
        description: "Vacunar, palpar, pesar…",
        url: "/trabajos/nuevo",
        icons: [{ src: "/iconos/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Ganado",
        short_name: "Ganado",
        description: "Inventario de animales",
        url: "/ganado",
        icons: [{ src: "/iconos/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Potreros",
        short_name: "Potreros",
        description: "Días de descanso y ocupación",
        url: "/potreros",
        icons: [{ src: "/iconos/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
