"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ESPECIES,
  ESTADOS_REPRODUCTIVOS,
  OPCIONES_PELAJE,
  clasesDe,
  claseAnimal,
  especieDeClase,
  usaColorPelaje,
} from "@/lib/catalogos";
import { OPCIONES_RAZA } from "@/lib/razas";
import type { Animal, Division, Grupo, Potrero } from "@/lib/tipos";
import { Aviso } from "@/components/aviso";
import { AyudaInfo } from "@/components/ayuda-info";
import { RegistrosAlta } from "@/components/registros-alta";
import { mesesYDias, mesesYDiasTexto } from "@/lib/ciclo-vida";
import { cn } from "@/lib/utils";
import { SelectCampo } from "@/components/ui/select-campo";
import { ComboCampo, opcionAnimal } from "@/components/ui/combo-campo";
import { CampoFoto } from "@/components/campo-foto";
import { CampoFecha } from "@/components/ui/campo-fecha";

export type AnimalMini = {
  id: string;
  arete_control: string | null;
  siniga: string | null;
  nombre?: string | null;
  clase?: string;
};

/**
 * Alta y edición de un animal, en cuatro pantallas.
 *
 * Los pasos que no se ven siguen montados (escondidos con `hidden`), no
 * desmontados: así el formulario se manda completo de una sola vez y no hay
 * que ir guardando lo capturado en cada paso.
 */
export function AnimalForm({
  action,
  animal,
  divisiones,
  grupos,
  madres,
  padres,
  potreros = [],
  fotoUrl,
  prellenado,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  animal?: Animal;
  divisiones: Division[];
  grupos: Grupo[];
  madres: AnimalMini[];
  /** Machos activos del rancho, para ligar el padre en vez de escribirlo. */
  padres: AnimalMini[];
  /** Potreros activos; solo se usan al dar de alta, para el movimiento. */
  potreros?: Potrero[];
  /** URL firmada de la foto actual, si ya tiene. */
  fotoUrl?: string | null;
  /** Alta que llega desde una compra: precarga y liga el animal. */
  prellenado?: {
    compra_id?: string | null;
    procedencia?: string | null;
    fecha_en_campo?: string | null;
  };
  error?: string | null;
}) {
  // La especie manda sobre la clase: al cambiarla se repueblan las clases.
  const [especie, setEspecie] = useState<string>(
    animal?.especie ?? (animal ? especieDeClase(animal.clase) : "bovino")
  );
  const [clase, setClase] = useState<string>(animal?.clase ?? "vaca");
  // La clase ya dice el sexo ("si es hembra es vaquilla, si es macho con
  // huevos es un toro"), así que arranca de ahí y se puede corregir.
  const [sexo, setSexo] = useState<string>(
    animal?.sexo ?? claseAnimal(animal?.clase ?? "vaca")?.sexo ?? ""
  );

  // Controladas para poder decir de cuántos meses se destetó.
  const [nacimiento, setNacimiento] = useState<string>(animal?.fecha_nacimiento ?? "");
  const [destete, setDestete] = useState<string>(animal?.fecha_destete ?? "");

  const clases = clasesDe(especie);

  const edadAlDestete = mesesYDias(nacimiento, destete);
  // Referencia de la nota: el destete tradicional va de los 6 a los 7 meses.
  const desteteFueraDeRango =
    edadAlDestete !== null && (edadAlDestete.meses < 6 || edadAlDestete.meses > 7);

  const cambiarEspecie = (nueva: string) => {
    setEspecie(nueva);
    // Si la clase ya no pertenece a la especie nueva, se cae a la primera.
    const permitidas = clasesDe(nueva);
    if (!permitidas.some((c) => c.valor === clase)) {
      setClase(permitidas[0]?.valor ?? "otro");
    }
  };

  const cambiarClase = (nueva: string) => {
    setClase(nueva);
    // "Si es hembra es vaquilla, si es macho con huevos es un toro": la clase
    // ya dice el sexo, así que se autocompleta si está vacío.
    const implicito = claseAnimal(nueva)?.sexo;
    if (implicito && !sexo) setSexo(implicito);
  };

  const esHembra = sexo === "H";

  /**
   * De dónde viene cada padre.
   *
   * "Quise meterle al toro que compré la mamá y el papá, pero sólo me deja
   * poner opciones del mismo rancho": un animal de registro traído de fuera
   * tiene padres que no están en el hato y solo existen en su certificado.
   */
  const [origenMadre, setOrigenMadre] = useState<"rancho" | "fuera">(
    animal?.madre_id ? "rancho" : animal?.madre_texto ? "fuera" : "rancho"
  );
  const [origenPadre, setOrigenPadre] = useState<"rancho" | "fuera">(
    animal?.padre_id ? "rancho" : animal?.padre_texto ? "fuera" : "rancho"
  );
  // Animales viejos podían traer el toro ligado y el nombre escrito a la vez.
  // Si se guardara sin más, el texto se perdería sin que nadie lo decidiera.
  const [sementalViejo, setSementalViejo] = useState<string | null>(
    animal?.padre_id && animal?.padre_texto ? animal.padre_texto : null
  );

  const pasos = [
    { titulo: "Identificación", pie: "Quién es el animal y cómo se reconoce." },
    { titulo: "Nacimiento", pie: "Cuándo nació, cuánto pesó y de quién viene." },
    { titulo: "Ubicación", pie: "En qué división y en qué grupo anda." },
    animal
      ? { titulo: "Foto y notas", pie: "Cómo se ve y qué hay que recordar de él." }
      : { titulo: "Registros de hoy", pie: "Lo que le hiciste al recibirlo." },
  ];

  const [paso, setPaso] = useState(0);
  const enElUltimo = paso === pasos.length - 1;
  const secciones = useRef<(HTMLElement | null)[]>([]);
  const formulario = useRef<HTMLFormElement>(null);

  /** Cambiar de paso sube al principio: en el teléfono si no, cae a media hoja. */
  const irAPaso = (i: number) => {
    setPaso(i);
    formulario.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * El navegador no puede señalar un campo escondido: si algo quedó mal en un
   * paso que no se está viendo, primero lo abrimos y luego mostramos el aviso.
   */
  const revisarAntesDeGuardar = (e: React.FormEvent<HTMLFormElement>) => {
    for (let i = 0; i < secciones.current.length; i++) {
      const campos = secciones.current[i]?.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input, select, textarea");
      const malo = Array.from(campos ?? []).find((c) => !c.checkValidity());
      if (!malo) continue;

      e.preventDefault();
      setPaso(i);
      // Hasta el siguiente pintado el campo sigue escondido y el globo del
      // navegador no tendría dónde salir.
      setTimeout(() => malo.reportValidity(), 0);
      return;
    }
  };

  return (
    <form
      ref={formulario}
      action={action}
      // La validación la corremos nosotros, para poder abrir el paso del error.
      noValidate
      onSubmit={revisarAntesDeGuardar}
      className="max-w-2xl space-y-6"
    >
      {error && <Aviso tono="peligro">{error}</Aviso>}
      {prellenado?.compra_id && (
        <input type="hidden" name="compra_id" value={prellenado.compra_id} />
      )}

      <div>
        <ol className="flex gap-1.5">
          {pasos.map((p, i) => (
            <li key={p.titulo} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => irAPaso(i)}
                aria-current={i === paso ? "step" : undefined}
                className="w-full text-left"
              >
                <span
                  className={cn(
                    "block h-1 rounded-full transition-colors",
                    i <= paso ? "bg-primary" : "bg-muted"
                  )}
                />
                <span
                  className={cn(
                    "mt-1.5 block truncate text-xs",
                    i === paso ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {i + 1}. {p.titulo}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">{pasos[paso].pie}</p>
      </div>

      {/* Paso 1 — quién es */}
      <section
        ref={(el) => {
          secciones.current[0] = el;
        }}
        hidden={paso !== 0}
        className="grid grid-cols-2 gap-4 md:grid-cols-3"
      >
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
          <div className="flex items-center gap-1.5">
            <Label htmlFor="num_registro">Número de registro</Label>
            <AyudaInfo titulo="Animal de registro">
              El folio que le dio su asociación de criadores. Solo lo traen los
              animales de registro; los demás se quedan con su arete.
            </AyudaInfo>
          </div>
          <Input
            id="num_registro"
            name="num_registro"
            defaultValue={animal?.num_registro ?? ""}
            placeholder="Folio de la asociación"
          />
        </div>

        <div className="space-y-2">
          <Label>Especie</Label>
          <SelectCampo
            name="especie"
            required
            opcionVacia={false}
            value={especie}
            onValueChange={cambiarEspecie}
            opciones={ESPECIES.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Clase</Label>
          <SelectCampo
            name="clase"
            required
            opcionVacia={false}
            value={clase}
            onValueChange={cambiarClase}
            opciones={clases.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Sexo</Label>
          <SelectCampo
            name="sexo"
            value={sexo}
            onValueChange={setSexo}
            opciones={[
              { valor: "H", etiqueta: "Hembra" },
              { valor: "M", etiqueta: "Macho" },
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="raza">Raza</Label>
          {/* 354 razas: se busca escribiendo. `textoLibre` deja capturar la
              que no esté en la lista sin trabar el alta. */}
          <ComboCampo
            id="raza"
            name="raza"
            opciones={OPCIONES_RAZA}
            defaultValue={animal?.raza ?? ""}
            placeholder="Elige o escribe la raza"
            textoBuscar="Angus, charolés, cara blanca…"
            vacio="Ninguna raza con ese nombre."
            textoLibre
          />
        </div>
        {/* El pelaje solo se pregunta donde sirve para identificar al animal:
            en bovinos y equinos. Al cambiar a otra especie el campo se va y
            el color deja de guardarse. */}
        {usaColorPelaje(especie) && (
          <div className="space-y-2">
            <Label htmlFor="color_pelaje">Color de pelaje</Label>
            <ComboCampo
              id="color_pelaje"
              name="color_pelaje"
              opciones={OPCIONES_PELAJE}
              defaultValue={animal?.color_pelaje ?? ""}
              placeholder="Elige el color"
              textoBuscar="Colorado, tordillo, prieto…"
              vacio="Ningún color con ese nombre."
            />
          </div>
        )}
      </section>

      {/* Paso 2 — de dónde viene */}
      <section
        ref={(el) => {
          secciones.current[1] = el;
        }}
        hidden={paso !== 1}
        className="space-y-6"
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
            <CampoFecha
              id="fecha_nacimiento"
              name="fecha_nacimiento"
              value={nacimiento}
              onValueChange={setNacimiento}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="fecha_en_campo">Fecha en el campo</Label>
              <AyudaInfo titulo="Fecha en el campo">
                La fecha en que el animal aparecerá en la reconciliación de
                ganado. Si cuentas los animales desde su fecha de nacimiento,
                deja este campo en blanco. Si los cuentas desde que se
                identificaron, pon esa fecha aquí.
              </AyudaInfo>
            </div>
            <CampoFecha
              id="fecha_en_campo"
              name="fecha_en_campo"
              defaultValue={animal?.fecha_en_campo ?? prellenado?.fecha_en_campo ?? ""}
              placeholder="Desde que nació"
            />
            <p className="text-xs text-muted-foreground">
              Si no la especificas, toma la fecha de nacimiento del animal.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="procedencia">Procedencia</Label>
            <Input
              id="procedencia"
              name="procedencia"
              defaultValue={animal?.procedencia ?? prellenado?.procedencia ?? ""}
              placeholder="El Seri (Camou)"
            />
          </div>
        </div>

        {/* Pesos: la diferencia entre nacer y destetar es el dato del negocio
            (nacen de 40 kg y se destetan de 200). */}
        <fieldset className="grid grid-cols-2 gap-4 rounded-lg border p-3 md:grid-cols-3">
          <legend className="px-1 text-sm font-medium">Pesos</legend>
          <div className="space-y-2">
            <Label htmlFor="peso_nacimiento">Al nacer (kg)</Label>
            <Input
              id="peso_nacimiento"
              name="peso_nacimiento"
              type="number"
              step="0.1"
              inputMode="decimal"
              defaultValue={animal?.peso_nacimiento ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="peso_destete">Al destete (kg)</Label>
            <Input
              id="peso_destete"
              name="peso_destete"
              type="number"
              step="0.1"
              inputMode="decimal"
              defaultValue={animal?.peso_destete ?? ""}
            />
          </div>
          <div className="space-y-2">
            {/* La "i" va fuera del <Label> para que tocarla no dispare también
                el campo al que apunta htmlFor. */}
            <div className="flex items-center gap-1.5">
              <Label htmlFor="fecha_destete">Fecha de destete</Label>
              <AyudaInfo titulo="¿Cuándo se desteta?">
                En la ganadería (como en bovinos), el destete tradicional se
                hace entre los 6 y 7 meses de edad. Esto ayuda a que la madre
                recupere sus energías y pueda quedar preñada otra vez.
              </AyudaInfo>
            </div>
            <CampoFecha
              id="fecha_destete"
              name="fecha_destete"
              value={destete}
              onValueChange={setDestete}
            />
            {edadAlDestete && (
              <p
                className={cn(
                  "text-xs",
                  desteteFueraDeRango
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-muted-foreground"
                )}
              >
                Se destetó de {mesesYDiasTexto(edadAlDestete)}.
              </p>
            )}
            {!edadAlDestete && destete && !nacimiento && (
              <p className="text-xs text-muted-foreground">
                Pon la fecha de nacimiento para saber de cuántos meses se
                destetó.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="peso_objetivo">Meta de peso (kg)</Label>
              <AyudaInfo titulo="¿Para qué la meta?">
                Con una meta y su fecha, la ficha calcula cuántos kilos diarios
                necesita ganar y si al paso que lleva va a llegar. Útil en
                repasto y engorda.
              </AyudaInfo>
            </div>
            <Input
              id="peso_objetivo"
              name="peso_objetivo"
              type="number"
              step="1"
              inputMode="decimal"
              defaultValue={animal?.peso_objetivo ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha_objetivo">Fecha de la meta</Label>
            <CampoFecha
              id="fecha_objetivo"
              name="fecha_objetivo"
              defaultValue={animal?.fecha_objetivo}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border p-3">
          <legend className="flex items-center gap-1.5 px-1 text-sm font-medium">
            Padres
            <AyudaInfo titulo="Padres del rancho o de fuera">
              Si el papá o la mamá andan en el rancho, búscalos por su arete y
              quedan ligados: sus crías salen en su ficha. Si compraste un
              animal de registro, sus padres no están aquí: captúralos con su
              nombre y su número de registro, tal como vienen en el certificado.
            </AyudaInfo>
          </legend>

          <div className="grid gap-4 md:grid-cols-2">
            <CampoPadre
              etiqueta="Madre"
              origen={origenMadre}
              onOrigen={setOrigenMadre}
              nombreId="madre_id"
              nombreTexto="madre_texto"
              nombreRegistro="madre_registro"
              valorId={animal?.madre_id}
              valorTexto={animal?.madre_texto}
              valorRegistro={animal?.madre_registro}
              opciones={madres}
              placeholderRancho="Buscar por arete o SINIIGA…"
              placeholderFuera="Nombre de la vaca"
            />
            <CampoPadre
              etiqueta="Padre / semental"
              origen={origenPadre}
              onOrigen={setOrigenPadre}
              nombreId="padre_id"
              nombreTexto="padre_texto"
              nombreRegistro="padre_registro"
              valorId={animal?.padre_id}
              valorTexto={animal?.padre_texto}
              valorRegistro={animal?.padre_registro}
              opciones={padres}
              placeholderRancho="Toro del rancho…"
              placeholderFuera="Pajilla o semental: Elemental"
            />
          </div>

          {origenPadre === "rancho" && sementalViejo && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="hidden" name="padre_texto" value={sementalViejo} />
              Semental capturado antes: <strong>{sementalViejo}</strong>
              <button
                type="button"
                className="underline"
                onClick={() => setSementalViejo(null)}
              >
                quitar
              </button>
            </p>
          )}
        </fieldset>
      </section>

      {/* Paso 3 — dónde anda */}
      <section
        ref={(el) => {
          secciones.current[2] = el;
        }}
        hidden={paso !== 2}
        className="grid grid-cols-2 gap-4 md:grid-cols-3"
      >
        {esHembra && (
          <div className="space-y-2">
            <Label>Estado reproductivo</Label>
            <SelectCampo
              name="status_reproductivo"
              defaultValue={animal?.status_reproductivo}
              placeholder="—"
              opciones={estadosCon(animal?.status_reproductivo)}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label>División</Label>
          <SelectCampo
            name="division_id"
            defaultValue={animal?.division_id}
            opciones={divisiones.map((d) => ({ valor: d.id, etiqueta: d.nombre }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Grupo</Label>
          <SelectCampo
            name="grupo_id"
            defaultValue={animal?.grupo_id}
            opciones={grupos.map((g) => ({ valor: g.id, etiqueta: g.nombre }))}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="fecha_ingreso_grupo">Fecha de ingreso</Label>
            <AyudaInfo titulo="Fecha de ingreso al grupo">
              Desde cuándo está el animal en esta división y en este grupo de
              manejo. Sirve para saber cuánto lleva en pie de cría, en repasto o
              en engorda.
            </AyudaInfo>
          </div>
          <CampoFecha
            id="fecha_ingreso_grupo"
            name="fecha_ingreso_grupo"
            defaultValue={animal?.fecha_ingreso_grupo ?? ""}
          />
        </div>
      </section>

      {/* Paso 4 — lo de hoy, la foto y las notas */}
      <section
        ref={(el) => {
          secciones.current[3] = el;
        }}
        hidden={paso !== 3}
        className="space-y-6"
      >
        {/* Solo al dar de alta: en la edición estos registros ya son eventos
            con su propia fecha y se corrigen desde la ficha del animal. */}
        {!animal && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cada bloque guarda su propia fecha, por si el arete se lo pusiste
              el martes y lo pesaste el jueves.
            </p>
            <RegistrosAlta potreros={potreros} />
          </div>
        )}

        <CampoFoto name="foto" actual={fotoUrl} etiqueta="Foto del animal" />

        <div className="space-y-2">
          <Label htmlFor="notas">Notas</Label>
          <Textarea id="notas" name="notas" defaultValue={animal?.notas ?? ""} rows={3} />
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => irAPaso(paso - 1)}
          disabled={paso === 0}
        >
          <ChevronLeft className="size-4" /> Atrás
        </Button>

        <div className="flex items-center gap-2">
          {/* Se puede guardar desde cualquier paso: lo que falte se llena
              después, nadie tiene que llegar hasta el final para no perder lo
              que ya capturó. */}
          {!enElUltimo && (
            <Button type="submit" variant="outline">
              {animal ? "Guardar cambios" : "Registrar animal"}
            </Button>
          )}
          {enElUltimo ? (
            <Button type="submit">
              {animal ? "Guardar cambios" : "Registrar animal"}
            </Button>
          ) : (
            <Button type="button" onClick={() => irAPaso(paso + 1)}>
              Siguiente <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

/**
 * Un progenitor: o se busca en el rancho, o se escribe el de fuera.
 *
 * La rama que no se eligió se DESMONTA, no se esconde: `datosAnimal` escribe
 * siempre las dos llaves, así que si el campo escondido siguiera mandando su
 * valor, el animal acabaría con madre del rancho y madre de fuera a la vez.
 */
function CampoPadre({
  etiqueta,
  origen,
  onOrigen,
  nombreId,
  nombreTexto,
  nombreRegistro,
  valorId,
  valorTexto,
  valorRegistro,
  opciones,
  placeholderRancho,
  placeholderFuera,
}: {
  etiqueta: string;
  origen: "rancho" | "fuera";
  onOrigen: (o: "rancho" | "fuera") => void;
  nombreId: string;
  nombreTexto: string;
  nombreRegistro: string;
  valorId?: string | null;
  valorTexto?: string | null;
  valorRegistro?: string | null;
  opciones: AnimalMini[];
  placeholderRancho: string;
  placeholderFuera: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{etiqueta}</Label>
        <div className="flex gap-1">
          {(["rancho", "fuera"] as const).map((o) => (
            <Button
              key={o}
              type="button"
              size="sm"
              variant={origen === o ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => onOrigen(o)}
            >
              {o === "rancho" ? "Del rancho" : "De fuera"}
            </Button>
          ))}
        </div>
      </div>

      {origen === "rancho" ? (
        <ComboCampo
          name={nombreId}
          defaultValue={valorId}
          placeholder={placeholderRancho}
          opciones={opciones.map(opcionAnimal)}
        />
      ) : (
        <>
          <Input
            name={nombreTexto}
            defaultValue={valorTexto ?? ""}
            placeholder={placeholderFuera}
          />
          <Input
            name={nombreRegistro}
            defaultValue={valorRegistro ?? ""}
            placeholder="Número de registro"
          />
        </>
      )}
    </div>
  );
}

/**
 * El catálogo, más el valor viejo capturado a mano ("C3", "vacía") si no
 * coincide con ninguno: así editar un animal importado no borra su estado.
 */
function estadosCon(actual: string | null | undefined) {
  const opciones = ESTADOS_REPRODUCTIVOS.map((e) => ({
    valor: e.valor,
    etiqueta: e.etiqueta,
  }));
  if (actual && !opciones.some((o) => o.valor === actual)) {
    opciones.unshift({ valor: actual, etiqueta: `${actual} (capturado antes)` });
  }
  return opciones;
}
