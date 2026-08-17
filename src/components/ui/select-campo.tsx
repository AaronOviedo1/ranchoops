"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OpcionSelect = {
  valor: string;
  etiqueta: string;
  deshabilitada?: boolean;
};

/**
 * Select unificado para formularios.
 *
 * Base UI emite un input oculto con el `name`, así que sustituye a un
 * <select> nativo sin tocar las server actions que leen formData.get(name).
 */
export function SelectCampo({
  name,
  opciones,
  defaultValue,
  value,
  onValueChange,
  placeholder = "—",
  opcionVacia = "—",
  required,
  disabled,
  id,
  size = "default",
  className,
  contentClassName,
}: {
  name?: string;
  opciones: OpcionSelect[];
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (valor: string) => void;
  placeholder?: string;
  opcionVacia?: string | false;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  size?: "sm" | "default";
  className?: string;
  contentClassName?: string;
}) {
  const lista: OpcionSelect[] =
    opcionVacia === false
      ? opciones
      : [{ valor: "", etiqueta: opcionVacia }, ...opciones];

  const controlado = value !== undefined;

  return (
    <Select
      name={name}
      required={required}
      disabled={disabled}
      items={lista.map((o) => ({ value: o.valor, label: o.etiqueta }))}
      {...(controlado
        ? { value, onValueChange: (v: unknown) => onValueChange?.(String(v ?? "")) }
        : {
            defaultValue: defaultValue ?? "",
            onValueChange: onValueChange
              ? (v: unknown) => onValueChange(String(v ?? ""))
              : undefined,
          })}
    >
      <SelectTrigger id={id} size={size} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {lista.map((o) => (
          <SelectItem key={o.valor} value={o.valor} disabled={o.deshabilitada}>
            {o.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
