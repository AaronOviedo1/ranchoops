"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Foto con captura de cámara.
 *
 * `capture="environment"` hace que el teléfono abra la cámara trasera en vez
 * del carrete: en las curaciones se pidió que la foto sea del momento, no una
 * imagen vieja de la galería.
 */
export function CampoFoto({
  name,
  actual,
  etiqueta = "Foto",
  requerida = false,
  ayuda,
  className,
}: {
  name: string;
  /** URL firmada de la foto ya guardada. */
  actual?: string | null;
  etiqueta?: string;
  requerida?: boolean;
  ayuda?: string;
  className?: string;
}) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [quitada, setQuitada] = useState(false);

  const mostrada = previa ?? (quitada ? null : actual ?? null);

  const alElegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    // El otro input se limpia para que solo viaje un archivo en el FormData.
    const otro = e.target === camara.current ? galeria.current : camara.current;
    if (otro) otro.value = "";
    setPrevia(URL.createObjectURL(archivo));
    setQuitada(false);
  };

  const quitar = () => {
    if (camara.current) camara.current.value = "";
    if (galeria.current) galeria.current.value = "";
    if (previa) URL.revokeObjectURL(previa);
    setPrevia(null);
    setQuitada(true);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {etiqueta}
        {requerida && <span className="ml-1 text-destructive">*</span>}
      </Label>

      <input
        ref={camara}
        type="file"
        name={name}
        accept="image/*"
        capture="environment"
        className="hidden"
        required={requerida && !mostrada}
        onChange={alElegir}
      />
      <input
        ref={galeria}
        type="file"
        name={name}
        accept="image/*"
        className="hidden"
        onChange={alElegir}
      />

      {mostrada ? (
        <div className="relative w-fit">
          <Image
            src={mostrada}
            alt={etiqueta}
            width={160}
            height={160}
            unoptimized
            className="h-40 w-40 rounded-lg border object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute -top-2 -right-2 shadow-sm"
            aria-label="Quitar foto"
            onClick={quitar}
          >
            <X />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => camara.current?.click()}>
            <Camera /> Tomar foto
          </Button>
          <Button type="button" variant="ghost" onClick={() => galeria.current?.click()}>
            <ImageUp /> Subir archivo
          </Button>
        </div>
      )}

      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
      {/* Marca que la foto existente se borró (el archivo vacío no lo diría). */}
      {quitada && !previa && <input type="hidden" name={`${name}_quitar`} value="1" />}
    </div>
  );
}
