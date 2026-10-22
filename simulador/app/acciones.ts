"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CLAVE_DEMO, USUARIO_DEMO, borrarSim, exigirSesion, guardarSim, leerSim, sucursalActual } from "@/lib/sesion";
import { INCIDENCIAS, articulo, buscarSocio, minutoActual, siguienteFolio, socios, type Metodo, type Via } from "@/lib/datos";
import { HOY, SUCURSALES, TOPE_DESCUENTO, esPlan, estado, validarAcceso } from "@/lib/dominio";

export type EstadoFormulario = { error?: string };

const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? "").trim();

// ---------------------------------------------------------------- Sesión

export async function iniciarSesion(fd: FormData) {
  if (texto(fd, "usuario").toLowerCase() !== USUARIO_DEMO || texto(fd, "clave") !== CLAVE_DEMO) {
    redirect("/login?error=1");
  }
  (await cookies()).set("sesion", USUARIO_DEMO, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/jefe");
}

export async function cerrarSesion() {
  (await cookies()).delete("sesion");
  redirect("/login");
}

export async function reiniciarSimulacion() {
  await exigirSesion();
  await borrarSim();
}

export async function elegirSucursal(fd: FormData) {
  await exigirSesion();
  const valor = texto(fd, "sucursal");
  if (valor === "todas" || SUCURSALES.some((s) => s.id === valor)) {
    (await cookies()).set("sucursal", valor, { sameSite: "lax", path: "/" });
  }
}

// ---------------------------------------------------------------- Recepción

/** Identifica a un socio por huella o por número y registra el intento de acceso. */
export async function identificar(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  await exigirSesion();
  const [sim, s] = await Promise.all([leerSim(), sucursalActual()]);
  const via: Via = texto(fd, "via") === "numero" ? "numero" : "huella";
  const encontrado = buscarSocio(socios(sim), Number(texto(fd, "socio")));
  // Cada sucursal tiene su propia base: un socio de otra sucursal no aparece aquí.
  let socio = encontrado?.sucursal === s ? encontrado : null;
  if (via === "huella" && socio && !socio.huella) socio = null;
  if (via === "numero" && !socio) return { error: "No hay un socio con ese número en esta sucursal." };

  const minuto = minutoActual(sim);
  const r = validarAcceso(socio, minuto);
  await guardarSim("a", [...sim.a, { s, so: socio?.id ?? null, c: r.codigo, via, m: r.motivo, w: r.aviso, h: minuto }]);
  return {};
}

export async function accesoManual(fd: FormData) {
  await exigirSesion();
  const [sim, s] = await Promise.all([leerSim(), sucursalActual()]);
  const socio = buscarSocio(socios(sim), Number(texto(fd, "socio")));
  const motivo = texto(fd, "motivo").slice(0, 60);
  if (!socio || socio.sucursal !== s || motivo.length < 3) return;
  await guardarSim("a", [...sim.a, { s, so: socio.id, c: "ACCESO_PERMITIDO", via: "manual", m: `Acceso manual: ${motivo}`, h: minutoActual(sim) }]);
}

export async function congelar(fd: FormData) {
  await exigirSesion();
  const [sim, s] = await Promise.all([leerSim(), sucursalActual()]);
  const socio = buscarSocio(socios(sim), Number(texto(fd, "socio")));
  // Tope anual: un congelamiento por socio.
  if (!socio || socio.sucursal !== s || socio.congelado || estado(socio) !== "activa") return;
  await guardarSim("z", [...sim.z, [socio.id, HOY]]);
}

export async function registrarSocio(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  await exigirSesion();
  const [sim, s] = await Promise.all([leerSim(), sucursalActual()]);
  const nombre = texto(fd, "nombre").replace(/\s+/g, " ");
  const telefono = texto(fd, "telefono").replace(/\D/g, "");
  const plan = texto(fd, "plan");

  if (nombre.length < 5 || nombre.length > 60) return { error: "Escribe nombre y apellidos (5 a 60 caracteres)." };
  if (telefono.length !== 10) return { error: "El teléfono debe tener 10 dígitos." };
  if (!esPlan(plan)) return { error: "Elige un plan." };
  if (fd.get("reglamento") !== "on") return { error: "El socio debe aceptar el reglamento y el aviso de privacidad." };

  // Sin consentimiento expreso no hay huella, y a los menores no se les captura.
  const huella = fd.get("consentimiento") === "on" && fd.get("menor") !== "on" && fd.get("huella") === "1";
  const id = Math.max(...socios(sim).map((x) => x.id)) + 1;
  await guardarSim("s", [
    ...sim.s,
    { id, s, n: nombre, t: `${telefono.slice(0, 3)} ${telefono.slice(3, 6)} ${telefono.slice(6)}`, p: plan, hu: huella },
  ]);
  redirect(`/recepcion/ventas?socio=${id}&agregar=mem:${plan}`);
}

// ---------------------------------------------------------------- Punto de venta

const METODOS_VALIDOS: Metodo[] = ["efectivo", "tarjeta", "transferencia"];

export async function cobrar(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  await exigirSesion();
  const [sim, s] = await Promise.all([leerSim(), sucursalActual()]);

  let lineas: unknown;
  try {
    lineas = JSON.parse(texto(fd, "lineas"));
  } catch {
    return { error: "El ticket no es válido." };
  }
  if (!Array.isArray(lineas) || lineas.length === 0) return { error: "Agrega al menos un artículo." };
  if (lineas.length > 12) return { error: "Demasiados artículos en un solo ticket." };

  const idSocio = texto(fd, "socio");
  const socio = idSocio ? buscarSocio(socios(sim), Number(idSocio)) : null;
  if (idSocio && (!socio || socio.sucursal !== s)) return { error: "El socio no pertenece a esta sucursal." };

  let subtotal = 0;
  const limpias: [string, number][] = [];
  for (const l of lineas) {
    const [id, cantidad] = Array.isArray(l) ? l : [];
    const a = typeof id === "string" ? articulo(id, socio) : null;
    if (!a || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 12) return { error: "Hay un artículo no válido en el ticket." };
    if (a.requiereSocio && !socio) return { error: `«${a.nombre}» requiere elegir un socio.` };
    if (a.id === "adeudo" && cantidad !== 1) return { error: "El adeudo se paga una sola vez." };
    subtotal += a.precio * cantidad;
    limpias.push([a.id, cantidad]);
  }

  const metodo = texto(fd, "metodo") as Metodo;
  if (!METODOS_VALIDOS.includes(metodo)) return { error: "Elige el método de pago." };

  const descuento = Number(texto(fd, "descuento") || 0);
  const motivo = texto(fd, "motivo");
  if (!Number.isInteger(descuento) || descuento < 0 || descuento > TOPE_DESCUENTO) {
    return { error: `El descuento va de 0 a ${TOPE_DESCUENTO} %.` };
  }
  if (descuento > 0 && motivo.length < 3) return { error: "Todo descuento necesita un motivo." };

  const f = siguienteFolio(sim, s);
  const total = subtotal - Math.round((subtotal * descuento) / 100);
  await guardarSim("v", [
    ...sim.v,
    { f, s, i: limpias, t: total, p: metodo, d: descuento, so: socio?.id, h: minutoActual(sim) },
  ]);
  redirect(`/recepcion/ventas?folio=${f}`);
}

// ---------------------------------------------------------------- Corte de caja

export async function declararCorte(fd: FormData) {
  await exigirSesion();
  const [sim, s] = await Promise.all([leerSim(), sucursalActual()]);
  const pesos = Number(texto(fd, "efectivo").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(pesos) || pesos < 0 || pesos > 1_000_000) return;
  await guardarSim("c", [...sim.c.filter((c) => c.s !== s), { s, e: Math.round(pesos * 100) }]);
}

export async function repetirCorte() {
  await exigirSesion();
  const [sim, s] = await Promise.all([leerSim(), sucursalActual()]);
  await guardarSim("c", sim.c.filter((c) => c.s !== s));
}

// ---------------------------------------------------------------- Soporte

export async function resolverIncidencia(fd: FormData) {
  await exigirSesion();
  const sim = await leerSim();
  const id = texto(fd, "incidencia");
  if (!INCIDENCIAS.some((x) => x.id === id) || sim.i.includes(id)) return;
  await guardarSim("i", [...sim.i, id]);
}
