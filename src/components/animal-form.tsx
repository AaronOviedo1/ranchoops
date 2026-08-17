import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLASES_ANIMAL } from "@/lib/catalogos";
import type { Animal, Division, Grupo } from "@/lib/tipos";

function SelectNativo({
  name,
  defaultValue,
  children,
  required,
}: {
  name: string;
  defaultValue?: string | null;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      required={required}
      className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {children}
    </select>
  );
}

export function AnimalForm({
  action,
  animal,
  divisiones,
  grupos,
  madres,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  animal?: Animal;
  divisiones: Division[];
  grupos: Grupo[];
  madres: { id: string; arete_control: string | null; siniga: string | null }[];
  error?: string | null;
}) {
  return (
    <form action={action} className="max-w-2xl space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="arete_control">Arete control</Label>
          <Input
            id="arete_control"
            name="arete_control"
            defaultValue={animal?.arete_control ?? ""}
            inputMode="numeric"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="siniga">Arete SINIIGA</Label>
          <Input
            id="siniga"
            name="siniga"
            defaultValue={animal?.siniga ?? ""}
            inputMode="numeric"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre (opcional)</Label>
          <Input id="nombre" name="nombre" defaultValue={animal?.nombre ?? ""} />
        </div>
        <div className="space-y-2">
          <Label>Sexo</Label>
          <SelectNativo name="sexo" defaultValue={animal?.sexo}>
            <option value="">—</option>
            <option value="H">Hembra</option>
            <option value="M">Macho</option>
          </SelectNativo>
        </div>
        <div className="space-y-2">
          <Label>Clase</Label>
          <SelectNativo name="clase" defaultValue={animal?.clase ?? "vaca"} required>
            {CLASES_ANIMAL.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </SelectNativo>
        </div>
        <div className="space-y-2">
          <Label htmlFor="raza">Raza</Label>
          <Input id="raza" name="raza" defaultValue={animal?.raza ?? ""} placeholder="UltraRed" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
          <Input
            id="fecha_nacimiento"
            name="fecha_nacimiento"
            type="date"
            defaultValue={animal?.fecha_nacimiento ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="peso_nacimiento">Peso al nacer (kg)</Label>
          <Input
            id="peso_nacimiento"
            name="peso_nacimiento"
            type="number"
            step="0.1"
            defaultValue={animal?.peso_nacimiento ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="procedencia">Procedencia</Label>
          <Input
            id="procedencia"
            name="procedencia"
            defaultValue={animal?.procedencia ?? ""}
            placeholder="El Seri (Camou)"
          />
        </div>
        <div className="space-y-2">
          <Label>Madre</Label>
          <SelectNativo name="madre_id" defaultValue={animal?.madre_id}>
            <option value="">—</option>
            {madres.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.arete_control ?? "s/n"} {m.siniga ? `· ${m.siniga}` : ""}
              </option>
            ))}
          </SelectNativo>
        </div>
        <div className="space-y-2">
          <Label htmlFor="padre_texto">Padre / semental</Label>
          <Input
            id="padre_texto"
            name="padre_texto"
            defaultValue={animal?.padre_texto ?? ""}
            placeholder="Elemental"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status_reproductivo">Status reproductivo</Label>
          <Input
            id="status_reproductivo"
            name="status_reproductivo"
            defaultValue={animal?.status_reproductivo ?? ""}
            placeholder="C3, vacía, parida…"
          />
        </div>
        <div className="space-y-2">
          <Label>División</Label>
          <SelectNativo name="division_id" defaultValue={animal?.division_id}>
            <option value="">—</option>
            {divisiones.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </SelectNativo>
        </div>
        <div className="space-y-2">
          <Label>Grupo</Label>
          <SelectNativo name="grupo_id" defaultValue={animal?.grupo_id}>
            <option value="">—</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </SelectNativo>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea id="notas" name="notas" defaultValue={animal?.notas ?? ""} rows={3} />
      </div>

      <Button type="submit">{animal ? "Guardar cambios" : "Registrar animal"}</Button>
    </form>
  );
}
