/**
 * Verificación de punta a punta de RanchOps contra Supabase.
 * Crea datos de prueba, valida el flujo completo y limpia todo al terminar.
 *
 * Uso: pnpm tsx scripts/verificar-supabase.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

let fallos = 0;
function ok(nombre: string, cond: boolean, extra = "") {
  console.log(`${cond ? "✓" : "✗"} ${nombre}${extra ? ` — ${extra}` : ""}`);
  if (!cond) fallos++;
}

async function principal() {
  console.log(`Proyecto: ${URL}\n`);

  // ---- 1. Esquema ----
  const tablas = [
    "ranchos", "rancho_usuarios", "perfiles", "divisiones", "potreros",
    "infraestructura", "pluviometros", "lluvias", "grupos", "grupo_movimientos",
    "animales", "productos", "inventario_movimientos", "eventos",
    "evento_animales", "gastos", "ventas", "venta_renglones", "venta_animales",
    "v_existencias", "v_potrero_estado",
  ];
  let faltantes = 0;
  for (const t of tablas) {
    const { error } = await admin.from(t).select("*", { head: true, count: "exact" }).limit(1);
    if (error) {
      console.log(`✗ tabla/vista ${t} — ${error.message}`);
      faltantes++;
      fallos++;
    }
  }
  ok(`esquema: ${tablas.length} tablas y vistas`, faltantes === 0);

  const { data: buckets } = await admin.storage.listBuckets();
  ok("bucket 'ranchops'", !!buckets?.some((b) => b.name === "ranchops"));

  // ---- 2. Usuarios de prueba ----
  const sufijo = Date.now();
  const correoA = `prueba-a-${sufijo}@ranchops.test`;
  const correoB = `prueba-b-${sufijo}@ranchops.test`;
  const pass = "Prueba-12345";

  const { data: uA } = await admin.auth.admin.createUser({
    email: correoA, password: pass, email_confirm: true,
  });
  const { data: uB } = await admin.auth.admin.createUser({
    email: correoB, password: pass, email_confirm: true,
  });
  ok("crear usuarios de prueba", !!uA?.user && !!uB?.user);
  if (!uA?.user || !uB?.user) return terminar();

  const cliA = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: eLogin } = await cliA.auth.signInWithPassword({ email: correoA, password: pass });
  ok("login con contraseña", !eLogin, eLogin?.message ?? "");

  const cliB = createClient(URL, ANON, { auth: { persistSession: false } });
  await cliB.auth.signInWithPassword({ email: correoB, password: pass });

  // ---- 3. Onboarding (flujo real de la app) ----
  const { data: rid, error: eRancho } = await cliA.rpc("crear_rancho_con_membresia", {
    p_nombre: `Rancho Prueba ${sufijo}`, p_upp: "260291521001",
  });
  ok("crear rancho + membresía (onboarding)", !!rid, eRancho?.message ?? "");
  if (!rid) return terminar([uA.user.id, uB.user.id]);

  const { data: ranchoVisible } = await cliA.from("ranchos").select("*").eq("id", rid);
  ok("el creador ve su rancho", (ranchoVisible ?? []).length === 1);

  // ---- 4. Flujo operativo ----
  const { data: potrero } = await cliA.from("potreros")
    .insert({ rancho_id: rid, nombre: "Potrero Prueba", superficie_has: 100 }).select().single();
  const { data: grupo } = await cliA.from("grupos")
    .insert({ rancho_id: rid, nombre: "Grupo Prueba", potrero_actual_id: potrero?.id }).select().single();
  const { data: vaca } = await cliA.from("animales")
    .insert({ rancho_id: rid, arete_control: "1", clase: "vaca", sexo: "H", grupo_id: grupo?.id })
    .select().single();
  ok("crear potrero, grupo y animal", !!potrero && !!grupo && !!vaca);
  if (!potrero || !grupo || !vaca) return terminar([uA.user.id, uB.user.id], rid);

  // pastoreo: entrada al potrero → días de ocupación
  await cliA.from("grupo_movimientos").insert({
    rancho_id: rid, grupo_id: grupo.id, potrero_id: potrero.id, fecha_entrada: "2026-08-01",
  });
  const { data: estadoOcupado } = await cliA.from("v_potrero_estado").select("*").eq("potrero_id", potrero.id).single();
  ok("potrero marcado como ocupado", estadoOcupado?.grupo_actual_id === grupo.id,
    `días ocupado: ${estadoOcupado?.dias_ocupado}`);

  // salida → días de descanso
  await cliA.from("grupo_movimientos").update({ fecha_salida: "2026-08-10", calif_buniga: 3, residuo: "medio" })
    .eq("grupo_id", grupo.id).is("fecha_salida", null);
  const { data: estadoDescanso } = await cliA.from("v_potrero_estado").select("*").eq("potrero_id", potrero.id).single();
  ok("días de descanso se calculan solos",
    estadoDescanso?.grupo_actual_id === null && (estadoDescanso?.dias_descanso ?? -1) >= 0,
    `días descanso: ${estadoDescanso?.dias_descanso}`);

  // inventario: entrada 10, consumo 4 → 6
  const { data: producto } = await cliA.from("productos")
    .insert({ rancho_id: rid, nombre: "HP 22 prueba", tipo: "alimento", unidad: "saco", costo_unitario: 275 })
    .select().single();
  await cliA.from("inventario_movimientos").insert({
    rancho_id: rid, producto_id: producto!.id, tipo: "entrada", cantidad: 10, fecha: "2026-08-10",
  });
  const { data: evento } = await cliA.from("eventos").insert({
    rancho_id: rid, tipo: "alimentacion", fecha: "2026-08-15",
    grupo_id: grupo.id, producto_id: producto!.id, cantidad: 4, costo_total: 1100,
  }).select().single();
  await cliA.from("evento_animales").insert({
    rancho_id: rid, evento_id: evento!.id, animal_id: vaca.id, valores: { obs: "prueba" },
  });
  await cliA.from("inventario_movimientos").insert({
    rancho_id: rid, producto_id: producto!.id, tipo: "salida", cantidad: 4,
    fecha: "2026-08-15", evento_id: evento!.id,
  });
  const { data: existencia } = await cliA.from("v_existencias").select("existencia").eq("producto_id", producto!.id).single();
  ok("inventario descuenta el consumo (10 − 4 = 6)", Number(existencia?.existencia) === 6,
    `existencia: ${existencia?.existencia}`);

  const { data: historial } = await cliA.from("evento_animales").select("*, eventos(tipo)").eq("animal_id", vaca.id);
  ok("el evento aparece en el historial del animal", historial?.length === 1);

  // parto: crea cría ligada a la madre
  const { data: cria } = await cliA.from("animales").insert({
    rancho_id: rid, arete_control: "1-A", clase: "becerra", sexo: "H",
    fecha_nacimiento: "2026-08-16", madre_id: vaca.id, grupo_id: grupo.id,
  }).select().single();
  ok("parto: cría ligada a su madre", cria?.madre_id === vaca.id);

  // venta: el animal sale del inventario activo pero conserva historial
  const { data: venta } = await cliA.from("ventas")
    .insert({ rancho_id: rid, fecha: "2026-08-16", comprador: "Subasta", guia: "A-0133245", reemo: "1336517" })
    .select().single();
  await cliA.from("venta_renglones").insert({
    rancho_id: rid, venta_id: venta!.id, clase: "becerras", cabezas: 1,
    kilos_venta: 170, precio_kg: 100, total: 17000,
  });
  await cliA.from("venta_animales").insert({ rancho_id: rid, venta_id: venta!.id, animal_id: cria!.id });
  await cliA.from("animales").update({ status: "vendido", fecha_salida: "2026-08-16" }).eq("id", cria!.id);
  const { data: activos } = await cliA.from("animales").select("id").eq("rancho_id", rid).eq("status", "activo");
  const { data: histCria } = await cliA.from("animales").select("id, status, madre_id").eq("id", cria!.id).single();
  ok("venta: sale del inventario activo conservando historial",
    (activos ?? []).length === 1 && histCria?.status === "vendido" && histCria?.madre_id === vaca.id);

  // gasto con categoría
  const { error: eGasto } = await cliA.from("gastos").insert({
    rancho_id: rid, fecha: "2026-08-16", concepto: "Prueba", monto: 500, categoria: "Alimento",
  });
  ok("registrar gasto", !eGasto, eGasto?.message ?? "");

  // ---- 5. Aislamiento entre ranchos (RLS) ----
  const { data: fugaAnimales } = await cliB.from("animales").select("*").eq("rancho_id", rid);
  const { data: fugaRancho } = await cliB.from("ranchos").select("*").eq("id", rid);
  const { data: fugaGastos } = await cliB.from("gastos").select("*").eq("rancho_id", rid);
  ok("RLS: otro usuario no ve animales, rancho ni gastos",
    (fugaAnimales ?? []).length === 0 && (fugaRancho ?? []).length === 0 && (fugaGastos ?? []).length === 0);

  // escalada de privilegios: auto-agregarse a un rancho ajeno
  const { error: eEscalada } = await cliB.from("rancho_usuarios")
    .insert({ rancho_id: rid, usuario_id: uB.user.id, rol: "admin" });
  const { data: fugaTrasEscalada } = await cliB.from("animales").select("*").eq("rancho_id", rid);
  ok("RLS: no puede auto-agregarse a un rancho ajeno",
    !!eEscalada && (fugaTrasEscalada ?? []).length === 0, eEscalada ? "bloqueado" : "¡SE AUTO-AGREGÓ!");

  // escribir en rancho ajeno
  const { error: eEscritura } = await cliB.from("animales")
    .insert({ rancho_id: rid, arete_control: "999", clase: "vaca" });
  ok("RLS: no puede escribir en rancho ajeno", !!eEscritura);

  // ---- 6. Storage ----
  const { error: eSubida } = await cliA.storage.from("ranchops")
    .upload(`${rid}/gastos/prueba.txt`, new Blob(["comprobante"]), { contentType: "text/plain" });
  ok("storage: subir comprobante", !eSubida, eSubida?.message ?? "");
  const { data: bajaB, error: eBajaB } = await cliB.storage.from("ranchops").download(`${rid}/gastos/prueba.txt`);
  ok("RLS storage: otro usuario no lo descarga", !bajaB || !!eBajaB);

  // ---- 7. Invitación de miembros ----
  const { data: invitacion } = await cliA.rpc("agregar_miembro_por_correo", { correo: correoB, r: rid });
  ok("invitar miembro por correo", invitacion === "ok", String(invitacion));
  const { data: veDueno } = await cliA.from("animales").select("id").eq("rancho_id", rid);
  const { data: veInvitado } = await cliB.from("animales").select("id").eq("rancho_id", rid);
  ok("el invitado ve los mismos datos que el dueño",
    (veInvitado ?? []).length > 0 && (veInvitado ?? []).length === (veDueno ?? []).length,
    `dueño: ${(veDueno ?? []).length}, invitado: ${(veInvitado ?? []).length}`);

  await terminar([uA.user.id, uB.user.id], rid);
}

async function terminar(usuarios: string[] = [], ranchoId?: string) {
  if (ranchoId) {
    const { data: archivos } = await admin.storage.from("ranchops").list(`${ranchoId}/gastos`);
    if (archivos?.length) {
      await admin.storage.from("ranchops").remove(archivos.map((a) => `${ranchoId}/gastos/${a.name}`));
    }
    await admin.from("ranchos").delete().eq("id", ranchoId);
    const { count } = await admin.from("animales").select("*", { count: "exact", head: true }).eq("rancho_id", ranchoId);
    ok("limpieza: datos de prueba eliminados", (count ?? 0) === 0);
  }
  for (const id of usuarios) await admin.auth.admin.deleteUser(id);

  console.log(fallos === 0 ? "\nTODO EN ORDEN ✅" : `\n${fallos} FALLO(S) ❌`);
  process.exit(fallos === 0 ? 0 : 1);
}

principal().catch((e) => {
  console.error("Error inesperado:", e);
  process.exit(1);
});
