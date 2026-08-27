"use client";

import { ComboCampo, type OpcionCombo } from "@/components/ui/combo-campo";

export type OpcionSelect = {
  valor: string;
  etiqueta: string;
  deshabilitada?: boolean;
};

/**
 * Select unificado para formularios.
 *
 * Por dentro es el mismo ComboCampo del buscador de animales y razas: un solo
 * menú en toda la app, con el mismo aspecto se elija ganado o estado
 * reproductivo. El buscador solo se enfoca solo cuando la lista es larga, para
 * no abrir el teclado del teléfono encima de tres opciones.
 *
 * Emite un input oculto con el `name`, así que sustituye a un <select> nativo
 * sin tocar las server actions que leen formData.get(name).
 */
export function SelectCampo({
  name,
  opciones,
  defaultValue,
  value,
  onValueChange,
  placeholder = "—",
  opcionVacia,
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
  /**
   * Renglón que representa "sin valor" cuando vaciar el campo significa algo
   * ("Sin grupo", "— Crear potrero nuevo —"). Si no se pasa, la lista arranca
   * en la primera opción real: para dejarlo vacío está la ✕ del campo.
   */
  opcionVacia?: string | false;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  size?: "sm" | "default";
  className?: string;
  contentClassName?: string;
}) {
  const lista: OpcionCombo[] = (
    opcionVacia
      ? [{ valor: "", etiqueta: opcionVacia }, ...opciones]
      : opciones
  ).map((o) => ({
    valor: o.valor,
    etiqueta: o.etiqueta,
    deshabilitada: "deshabilitada" in o ? o.deshabilitada : undefined,
  }));

  return (
    <ComboCampo
      id={id}
      name={name}
      opciones={lista}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      textoBuscar="Escribe para buscar…"
      vacio="Sin opciones."
      required={required}
      disabled={disabled}
      size={size}
      className={className}
      contentClassName={contentClassName}
    />
  );
}
