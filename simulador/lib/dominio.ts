// Reglas de negocio de la simulación: catálogos, vigencia y validación de acceso.
// No importa nada para poder probarse con `node --test`.

/** Días desde 1970-01-01 (UTC). */
export type Dia = number;
export const dia = (iso: string): Dia => Date.parse(iso + "T00:00:00Z") / 86_400_000;

// La simulación vive en un día fijo para que los datos no cambien con la fecha real.
export const HOY: Dia = dia("2026-10-21");
export const INICIO_MES: Dia = dia("2026-10-01");
export const HORA_SIMULADA = 18 * 60 + 40; // 18:40, turno vespertino

export const GIMNASIO = "Gimnasio Halcón";

export type SucursalId = "pr" | "pa" | "tx";
export const SUCURSALES: { id: SucursalId; nombre: string; clave: string; lada: string }[] = [
  { id: "pr", nombre: "Poza Rica Centro", clave: "PR", lada: "782" },
  { id: "pa", nombre: "Papantla", clave: "PA", lada: "784" },
  { id: "tx", nombre: "Tuxpan", clave: "TX", lada: "783" },
];
export const nombreSucursal = (id: SucursalId) => SUCURSALES.find((s) => s.id === id)!.nombre;

export type PlanId = "mensual" | "matutino" | "trimestral" | "anual";
export type Plan = { nombre: string; precio: number; dias: number; meses: number; horario?: [number, number] };

// Precios en centavos.
export const PLANES: Record<PlanId, Plan> = {
  mensual: { nombre: "Mensual", precio: 45_000, dias: 30, meses: 1 },
  matutino: { nombre: "Matutino", precio: 35_000, dias: 30, meses: 1, horario: [6 * 60, 14 * 60] },
  trimestral: { nombre: "Trimestral", precio: 120_000, dias: 90, meses: 3 },
  anual: { nombre: "Anual", precio: 420_000, dias: 365, meses: 12 },
};
export const esPlan = (x: unknown): x is PlanId => typeof x === "string" && x in PLANES;

export type Socio = {
  id: number;
  sucursal: SucursalId;
  nombre: string;
  telefono: string;
  plan: PlanId;
  /** Inicio de cada periodo pagado. Solo se agregan, nunca se editan. */
  pagos: Dia[];
  congelado?: { desde: Dia; dias: number };
  adeudo: number;
  huella: boolean;
  ultimaVisita: Dia | null;
  asistenciasMes: number;
};

export type Estado = "pendiente" | "activa" | "congelada" | "vencida" | "cancelada";
export const ESTADOS: Record<Estado, string> = {
  pendiente: "Pendiente de pago",
  activa: "Activa",
  congelada: "Congelada",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

export const DIAS_PARA_CANCELAR = 60;
export const TOLERANCIA_DIAS = 3;
export const TOLERANCIA_ADEUDO = 10_000;
export const DIAS_CONGELAMIENTO = 7;
/** Tope de descuento del rol "dueño", en porcentaje. */
export const TOPE_DESCUENTO = 20;

/** La vigencia no se guarda: se deriva de los pagos hechos hasta `hoy` y del congelamiento. */
export function finVigencia(s: Socio, hoy: Dia = HOY): Dia | null {
  let fin: Dia | null = null;
  for (const p of s.pagos.filter((p) => p <= hoy).sort((a, b) => a - b)) {
    fin = Math.max(p, fin === null ? p : fin + 1) + PLANES[s.plan].dias - 1;
  }
  const c = s.congelado;
  if (fin !== null && c && c.desde <= hoy && c.desde <= fin) fin += c.dias;
  return fin;
}

export function estado(s: Socio, hoy: Dia = HOY): Estado {
  const fin = finVigencia(s, hoy);
  if (fin === null) return "pendiente";
  const c = s.congelado;
  if (c && hoy >= c.desde && hoy < c.desde + c.dias) return "congelada";
  if (hoy <= fin) return "activa";
  return hoy - fin > DIAS_PARA_CANCELAR ? "cancelada" : "vencida";
}

export type Codigo =
  | "ACCESO_PERMITIDO"
  | "BIO_SIN_COINCIDENCIA"
  | "MEM_PENDIENTE_PAGO"
  | "MEM_CONGELADA"
  | "MEM_CANCELADA"
  | "MEM_VENCIDA"
  | "HORARIO_NO_PERMITIDO"
  | "ADEUDO_PENDIENTE";

export type Resultado = { permitido: boolean; codigo: Codigo; motivo: string; aviso?: string };

const negar = (codigo: Codigo, motivo: string): Resultado => ({ permitido: false, codigo, motivo });

/**
 * Figura 4 del plan: huella reconocida, membresía activa, horario permitido y
 * adeudo dentro de tolerancia, en ese orden. Se detiene en la primera que falla.
 * `socio` es null cuando la huella no coincide con nadie.
 */
export function validarAcceso(socio: Socio | null, minuto: number, hoy: Dia = HOY): Resultado {
  if (!socio) return negar("BIO_SIN_COINCIDENCIA", "Huella no reconocida");

  let aviso: string | undefined;
  const e = estado(socio, hoy);
  if (e === "pendiente") return negar("MEM_PENDIENTE_PAGO", "Membresía pendiente de pago");
  if (e === "congelada") return negar("MEM_CONGELADA", "Membresía congelada");
  if (e === "cancelada") return negar("MEM_CANCELADA", "Membresía cancelada");
  if (e === "vencida") {
    const dias = hoy - finVigencia(socio, hoy)!;
    if (dias > TOLERANCIA_DIAS) return negar("MEM_VENCIDA", `Membresía vencida hace ${dias} días`);
    aviso = `Venció hace ${dias} ${dias === 1 ? "día" : "días"}; está dentro de la tolerancia de ${TOLERANCIA_DIAS}`;
  }

  const plan = PLANES[socio.plan];
  if (plan.horario && (minuto < plan.horario[0] || minuto >= plan.horario[1])) {
    return negar("HORARIO_NO_PERMITIDO", `Plan ${plan.nombre}: de ${hora(plan.horario[0])} a ${hora(plan.horario[1])}`);
  }

  if (socio.adeudo > TOLERANCIA_ADEUDO) return negar("ADEUDO_PENDIENTE", `Adeudo de ${pesos(socio.adeudo)}`);
  if (socio.adeudo > 0) aviso = `Adeudo de ${pesos(socio.adeudo)}, dentro de la tolerancia`;

  return { permitido: true, codigo: "ACCESO_PERMITIDO", motivo: e === "vencida" ? "Membresía en días de tolerancia" : "Membresía activa", aviso };
}

// ---------------------------------------------------------------- Formato

const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const MXN_ENTERO = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export const pesos = (centavos: number) => MXN.format(centavos / 100);
export const pesosEnteros = (centavos: number) => MXN_ENTERO.format(Math.round(centavos / 100));
export const hora = (minuto: number) =>
  `${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`;
export const fecha = (d: Dia, opciones: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }) =>
  new Date(d * 86_400_000).toLocaleDateString("es-MX", { timeZone: "UTC", ...opciones });
export const porcentaje = (x: number, decimales = 1) =>
  `${(x * 100).toLocaleString("es-MX", { maximumFractionDigits: decimales })} %`;
