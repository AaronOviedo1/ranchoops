/** Verificación E2E de RanchOps contra Supabase (con limpieza al final). */
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
  // 1. Esquema aplicado
  const tablas = [
    "ranchos", "rancho_usuarios", "perfiles", "divisiones", "potreros",
    "infraestructura", "pluviometros", "lluvias", "grupos", "grupo_movimientos",
    "animales", "productos", "inventario_movimientos", "eventos",
    "evento_animales", "gastos", "ventas", "venta_renglones", "venta_animales",
    "v_existencias", "v_potrero_estado",
  ];
  for (const t of tablas) {
    const { error } = await admin.from(t).select("*", { head: true, count: "exact" }).limit(1);
    ok(`tabla/vista ${t}`, !error, error?.message ?? "");
  }

  // 2. Bucket de storage
  const { data: buckets } = await admin.storage.listBuckets();
  ok("bucket 'ranchops'", !!buckets?.some((b) => b.name === "ranchops"));

  // 3. E2E: usuario de prueba + rancho + flujo completo
  const correoA = `prueba-a-${Date.now()}@ranchops.test`;
  const correoB = `prueba-b-${Date.now()}@ranchops.test`;
  const pass = "Prueba-12345";

  const { data: uA, error: eA } = await admin.auth.admin.createUser({
    email: correoA, password: pass, email_confirm: true,
  });
  const { data: uB } = await admin.auth.admin.createUser({
    email: correoB, password: pass, email_confirm: true,
  });
  ok("crear usuarios de prueba", !!uA?.user && !!uB?.user, eA?.message ?? "");
  if (!uA?.user || !uB?.user) return;

  const clienteA = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: eLogin } = await clienteA.auth.signInWithPassword({ email: correoA, password: pass });
  ok("login con contraseña", !eLogin, eLogin?.message ?? "");

  // crear rancho + membresía (como hace el onboarding)
  const { data: rancho, error: eR } = await clienteA
    .from("ranchos").insert({ nombre: "Rancho Prueba E2E" }).select().single();
  ok("crear rancho (RLS insert)", !!rancho, eR?.message ?? "");
  if (!rancho) return;
  const rid = rancho.id;

  const { error: eM } = await clienteA
    .from("rancho_usuarios").insert({ rancho_id: rid, usuario_id: uA.user.id, rol: "admin" });
  ok("crear membresía propia", !eM, eM?.message ?? "");

  // flujo: potrero, grupo, animal, movimiento, producto, evento con consumo
  const { data: potrero } = await clienteA.from("potreros")
    .insert({ rancho_id: rid, nombre: "Potrero Prueba", superficie_has: 100 }).select().single();
  const { data: grupo } = await clienteA.from("grupos")
    .insert({ rancho_id: rid, nombre: "Grupo Prueba", potrero_actual_id: potrero?.id }).select().single();
  const { data: animal } = await clienteA.from("animales")
    .insert({ rancho_id: rid, arete_control: "1", clase: "vaca", sexo: "H", grupo_id: grupo?.id }).select().single();
  ok("crear potrero/grupo/animal", !!potrero && !!grupo && !!animal);

  await clienteA.from("grupo_movimientos").insert({
    rancho_id: rid, grupo_id: grupo!.id, potrero_id: potrero!.id,
    fecha_entrada: "2026-08-01",
  });
  const { data: estado } = await clienteA.from("v_potrero_estado")
    .select("*").eq("rancho_id", rid).single();
  ok("vista estado de potrero (ocupado)", estado?.grupo_actual_id === grupo!.id,
    `dias_ocupado=${estado?.dias_ocupado}`);

  const { data: producto } = await clienteA.from("productos")
    .insert({ rancho_id: rid, nombre: "HP 22 prueba", tipo: "alimento", unidad: "saco", costo_unitario: 275 })
    .select().single();
  await clienteA.from("inventario_movimientos").insert({
    rancho_id: rid, producto_id: producto!.id, tipo: "entrada", cantidad: 10, fecha: "2026-08-10",
  });
  const { data: evento } = await clienteA.from("eventos").insert({
    rancho_id: rid, tipo: "alimentacion", fecha: "2026-08-15",
    grupo_id: grupo!.id, producto_id: producto!.id, cantidad: 4, costo_total: 1100,
  }).select().single();
  await clienteA.from("evento_animales").insert({
    rancho_id: rid, evento_id: evento!.id, animal_id: animal!.id,
  });
  await clienteA.from("inventario_movimientos").insert({
    rancho_id: rid, producto_id: producto!.id, tipo: "salida", cantidad: 4,
    fecha: "2026-08-15", evento_id: evento!.id,
  });
  const { data: existencia } = await clienteA.from("v_existencias")
    .select("existencia").eq("producto_id", producto!.id).single();
  ok("existencias (10 entrada − 4 salida = 6)", Number(existencia?.existencia) === 6,
    `existencia=${existencia?.existencia}`);

  const { data: historial } = await clienteA.from("evento_animales")
    .select("*, eventos(tipo)").eq("animal_id", animal!.id);
  ok("historial del animal registra el evento", historial?.length === 1);

  // RLS: usuario B no ve nada del rancho de A
  const clienteB = createClient(URL, ANON, { auth: { persistSession: false } });
  await clienteB.auth.signInWithPassword({ email: correoB, password: pass });
  const { data: fuga1 } = await clienteB.from("animales").select("*").eq("rancho_id", rid);
  const { data: fuga2 } = await clienteB.from("ranchos").select("*").eq("id", rid);
  ok("RLS: otro usuario NO ve animales", (fuga1 ?? []).length === 0);
  ok("RLS: otro usuario NO ve el rancho", (fuga2 ?? []).length === 0);

  // storage: subir y leer un archivo del rancho propio
  const { error: eSubida } = await clienteA.storage.from("ranchops")
    .upload(`${rid}/gastos/prueba.txt`, new Blob(["hola"]), { contentType: "text/plain" });
  ok("storage: subir comprobante", !eSubida, eSubida?.message ?? "");
  const { data: descargaB } = await clienteB.storage.from("ranchops")
    .download(`${rid}/gastos/prueba.txt`).catch(() => ({ data: null }));
  ok("RLS storage: otro usuario NO descarga", !descargaB);

  // función de invitación
  const { data: invitacion } = await clienteA.rpc("agregar_miembro_por_correo", {
    correo: correoB, r: rid,
  });
  ok("invitar miembro por correo", invitacion === "ok", String(invitacion));
  const { data: fuga3 } = await clienteB.from("ranchos").select("*").eq("id", rid);
  ok("miembro invitado ya ve el rancho", (fuga3 ?? []).length === 1);

  // limpieza total
  await admin.storage.from("ranchops").remove([`${rid}/gastos/prueba.txt`]);
  await admin.from("ranchos").delete().eq("id", rid);
  await admin.auth.admin.deleteUser(uA.user.id);
  await admin.auth.admin.deleteUser(uB.user.id);
  const { count } = await admin.from("animales").select("*", { count: "exact", head: true }).eq("rancho_id", rid);
  ok("limpieza: datos de prueba eliminados", (count ?? 0) === 0);

  console.log(fallos === 0 ? "\nTODO EN ORDEN ✅" : `\n${fallos} FALLOS ❌`);
  process.exit(fallos === 0 ? 0 : 1);
}

principal().catch((e) => {
  console.error("Error inesperado:", e);
  process.exit(1);
});
