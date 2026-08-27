"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SelectCampo } from "@/components/ui/select-campo";

/**
 * Buscador en vivo del ganado.
 *
 * Antes era un form GET que había que enviar a mano; ahora escribe y busca.
 * La normalización de lo que se teclea (espacios en el SINIIGA) pasa del lado
 * del servidor, en `normalizarBusqueda`.
 */
export function BuscadorGanado({ valorInicial }: { valorInicial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [texto, setTexto] = useState(valorInicial);
  const [anterior, setAnterior] = useState(valorInicial);
  const [cargando, empezar] = useTransition();

  // Si la URL cambia por otro lado (los chips, el botón de atrás), el input la
  // sigue. Se ajusta durante el render, no en un efecto.
  if (valorInicial !== anterior) {
    setAnterior(valorInicial);
    setTexto(valorInicial);
  }

  useEffect(() => {
    if (texto === valorInicial) return;
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      if (texto.trim()) p.set("q", texto.trim());
      else p.delete("q");
      empezar(() => router.replace(`${pathname}?${p}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(t);
  }, [texto, valorInicial, pathname, router, searchParams]);

  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Arete, SINIIGA o nombre…"
        inputMode="search"
        className="pr-8 pl-8"
      />
      <span className="absolute top-1/2 right-2.5 -translate-y-1/2">
        {cargando ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          texto && (
            <button type="button" aria-label="Limpiar" onClick={() => setTexto("")}>
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          )
        )}
      </span>
    </div>
  );
}

/** Select que navega al elegir (grupo, especie…). */
export function FiltroSelect({
  parametro,
  valor,
  opciones,
  placeholder,
}: {
  parametro: string;
  valor: string;
  opciones: { valor: string; etiqueta: string }[];
  placeholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <SelectCampo
      value={valor}
      placeholder={placeholder}
      opcionVacia={placeholder}
      className="w-full sm:w-48"
      opciones={opciones}
      onValueChange={(v) => {
        const p = new URLSearchParams(searchParams);
        if (v) p.set(parametro, v);
        else p.delete(parametro);
        router.replace(`${pathname}?${p}`, { scroll: false });
      }}
    />
  );
}
