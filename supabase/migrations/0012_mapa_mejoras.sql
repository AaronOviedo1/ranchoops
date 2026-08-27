-- Catálogo del mapa: construcciones, fuentes de agua, infraestructura y peligros.
--
-- El menú de agregar del mapa ya no pregunta "¿punto, línea o área?": se elige
-- qué se va a poner (una henera, un cerco eléctrico, una fosa de mortandad) y
-- la herramienta de trazo sale de ahí. Esta lista tiene que coincidir con
-- TIPOS_INFRAESTRUCTURA en src/lib/catalogos.ts.

alter table public.infraestructura drop constraint if exists infraestructura_tipo_check;
alter table public.infraestructura add constraint infraestructura_tipo_check
  check (tipo in (
    -- áreas de manejo y de suelo
    'corral','manga','feedlot','agricola','pivote','humedal','erosion',
    -- construcciones
    'construccion','deposito_quimicos','henera','silo',
    -- fuentes de agua
    'pozo','perforacion','laguna','cuerpo_agua','drenaje','tuberia',
    'canal_agua','bomba','bomba_solar','papalote','llave_agua','bebedero',
    'pila','tanque',
    -- infraestructura
    'cerco','cerco_electrico','comedero','bloque_mineral','botiquin',
    'tranquera','generador','linea_electrica','camino','panel_solar',
    -- peligros
    'cebo','fosa_mortandad','maleza','peligro','area_peligro',
    'otro'
  ));
