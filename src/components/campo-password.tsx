"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo de contraseña con botón de ver/ocultar.
 *
 * Mientras está oculta usa la fuente de vaquitas: el navegador dibuja el
 * carácter de máscara con la fuente del campo, así que basta sustituir ese
 * glifo. Sigue siendo un input type="password" normal — no se toca el valor,
 * ni el autocompletado, ni los gestores de contraseñas.
 */
export function CampoPassword({
  id,
  name = "password",
  autoComplete = "current-password",
  required,
  minLength,
  defaultValue,
  className,
}: {
  id?: string;
  name?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const generado = useId();
  const idCampo = id ?? generado;

  return (
    <div className="relative">
      <Input
        id={idCampo}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        className={cn(
          "pr-11",
          // La fuente solo trae el glifo de la máscara: al mostrar el texto
          // real hay que volver a la tipografía normal.
          !visible && "font-vaquitas tracking-[0.14em]",
          className
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        aria-controls={idCampo}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {visible ? (
          <EyeOff className="size-4" />
        ) : (
          <Eye className="size-4" />
        )}
      </button>
    </div>
  );
}
