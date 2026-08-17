import { Beef, CloudRain, Fence, Receipt } from "lucide-react";
import { Marca } from "@/components/marca";

const PILARES = [
  { icono: Beef, texto: "Inventario de ganado con historial por animal" },
  { icono: Fence, texto: "Potreros y días de descanso, con mapa" },
  { icono: CloudRain, texto: "Lluvia por pluviómetro, año contra año" },
  { icono: Receipt, texto: "Costos, ventas y reportes del rancho" },
];

/**
 * Mitad de marca de las pantallas de entrada. Se oculta por debajo de lg:
 * en el celular el formulario se queda con todo el ancho.
 */
export function PanelMarca({ pie }: { pie?: string }) {
  return (
    <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
      {/* Lomeríos: el mismo trazo del logotipo, repetido como textura */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full opacity-[0.14]"
      >
        <defs>
          <pattern
            id="lomerio"
            width="120"
            height="56"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M-10 42C20 22 50 22 80 42s60 20 90 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M-10 14C20 -6 50 -6 80 14s60 20 90 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lomerio)" />
      </svg>

      <div className="relative">
        <Marca tamano="md" tono="claro" />
      </div>

      <div className="relative max-w-md">
        <h2 className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance xl:text-4xl">
          Todo el rancho, en un solo lugar.
        </h2>
        <ul className="mt-8 space-y-4">
          {PILARES.map(({ icono: Icono, texto }) => (
            <li key={texto} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
                <Icono className="size-4" />
              </span>
              <span className="text-sm leading-relaxed text-primary-foreground/85">
                {texto}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-primary-foreground/60">
        {pie ?? "Hecho para trabajarse desde el celular, en el corral."}
      </p>
    </aside>
  );
}
