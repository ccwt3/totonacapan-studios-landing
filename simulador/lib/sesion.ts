import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Alcance, Sim } from "./datos.ts";
import type { SucursalId } from "./dominio.ts";

// Credenciales de la demostración. No es autenticación real: no hay datos que proteger.
export const USUARIO_DEMO = "jefe";
export const CLAVE_DEMO = "123456789";

export async function exigirSesion() {
  const usuario = (await cookies()).get("sesion")?.value;
  if (usuario !== USUARIO_DEMO) redirect("/login");
  return usuario;
}

export async function alcanceActual(): Promise<Alcance> {
  const valor = (await cookies()).get("sucursal")?.value;
  return valor === "pr" || valor === "pa" || valor === "tx" || valor === "todas" ? valor : "todas";
}

/** Recepción siempre opera en una sola sucursal. */
export async function sucursalActual(): Promise<SucursalId> {
  const alcance = await alcanceActual();
  return alcance === "todas" ? "pr" : alcance;
}

// Lo que el visitante hace se guarda en una cookie por colección, en JSON base64url.
// ponytail: cada cookie admite ~4 KB, por eso se conservan solo los últimos registros.
// Si la demo necesita historial completo, cambiar esto por una base de datos.
const LIMITES: Record<keyof Sim, number> = { v: 15, a: 15, s: 5, z: 5, c: 3, i: 10 };
const CLAVES = Object.keys(LIMITES) as (keyof Sim)[];

export async function leerSim(): Promise<Sim> {
  const jar = await cookies();
  const sim = {} as Record<keyof Sim, unknown[]>;
  for (const k of CLAVES) {
    try {
      const valor = JSON.parse(Buffer.from(jar.get(`sim_${k}`)?.value ?? "", "base64url").toString());
      sim[k] = Array.isArray(valor) ? valor : [];
    } catch {
      sim[k] = [];
    }
  }
  // La cookie la controla el navegador; si alguien la altera, lo peor es ver datos raros en su propia demo.
  return sim as Sim;
}

const BYTES_MAXIMOS = 3_800;
const codificar = (valor: unknown[]) => Buffer.from(JSON.stringify(valor)).toString("base64url");

export async function guardarSim<K extends keyof Sim>(k: K, valor: Sim[K]) {
  const recortado = valor.slice(-LIMITES[k]);
  // Un navegador descarta en silencio una cookie demasiado grande: se sueltan los registros más viejos.
  while (recortado.length > 1 && codificar(recortado).length > BYTES_MAXIMOS) recortado.shift();
  (await cookies()).set(`sim_${k}`, codificar(recortado), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function borrarSim() {
  const jar = await cookies();
  for (const k of CLAVES) jar.delete(`sim_${k}`);
}
