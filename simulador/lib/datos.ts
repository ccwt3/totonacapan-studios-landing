// Datos ficticios del "Gimnasio Halcón" con tres sucursales. Se generan con una
// semilla fija, así que cada visita ve los mismos números. Lo que el visitante
// hace en la simulación (ventas, accesos, socios nuevos) llega como `Sim` y se
// suma encima de la base.

import {
  HOY, INICIO_MES, HORA_SIMULADA, PLANES, SUCURSALES, DIAS_CONGELAMIENTO,
  dia, estado, finVigencia, validarAcceso, esPlan,
  type Codigo, type Dia, type PlanId, type Socio, type SucursalId,
} from "./dominio.ts";

// ---------------------------------------------------------------- Estado de la simulación

export type Metodo = "efectivo" | "tarjeta" | "transferencia";
export const METODOS: Record<Metodo, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta (terminal)", transferencia: "Transferencia" };

export type VentaSim = { f: number; s: SucursalId; i: [string, number][]; t: number; p: Metodo; d: number; so?: number; h: number };
/** Intento de acceso. `m` y `w` guardan el motivo y el aviso tal como se mostraron. */
export type AccesoSim = { s: SucursalId; so: number | null; c: Codigo; via: Via; m: string; w?: string; h: number };
export type SocioSim = { id: number; s: SucursalId; n: string; t: string; p: PlanId; hu: boolean };
export type Sim = {
  v: VentaSim[];
  a: AccesoSim[];
  s: SocioSim[];
  /** Congelamientos: [socio, día de inicio]. */
  z: [number, Dia][];
  /** Cortes de caja declarados en el turno actual. */
  c: { s: SucursalId; e: number }[];
  /** Incidencias de soporte marcadas como resueltas. */
  i: string[];
};
export type Via = "huella" | "numero" | "manual";
export const VIAS: Record<Via, string> = { huella: "Huella", numero: "Número de socio", manual: "Acceso manual" };

export type Alcance = SucursalId | "todas";
const enAlcance = (s: SucursalId, alcance: Alcance) => alcance === "todas" || s === alcance;

/** Hora del reloj simulado: avanza un minuto por cada operación registrada. */
export const minutoActual = (sim: Sim) => HORA_SIMULADA + sim.v.length + sim.a.length;

// ---------------------------------------------------------------- Azar con semilla

function azar(semilla: number) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const entre = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
const uno = <T,>(r: () => number, lista: readonly T[]) => lista[Math.floor(r() * lista.length)];
/** Índice elegido al azar en proporción a su peso. */
function ponderado(r: () => number, pesos: number[]) {
  let x = r() * pesos.reduce((t, p) => t + p, 0);
  for (let i = 0; i < pesos.length; i++) if ((x -= pesos[i]) < 0) return i;
  return pesos.length - 1;
}

// ---------------------------------------------------------------- Socios base

const NOMBRES = ["María", "José", "Guadalupe", "Juan", "Fernanda", "Luis", "Daniela", "Carlos", "Valeria", "Miguel", "Sofía", "Jorge", "Ximena", "Ricardo", "Andrea", "Alejandro", "Paola", "Eduardo", "Camila", "Roberto", "Itzel", "Diego", "Karla", "Óscar", "Mariana", "Héctor", "Brenda", "Arturo", "Natalia", "Raúl", "Abril", "Emilio"];
const APELLIDOS = ["Hernández", "García", "Martínez", "López", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Cruz", "Flores", "Gómez", "Morales", "Vázquez", "Reyes", "Jiménez", "Torres", "Díaz", "Gutiérrez", "Ruiz", "Mendoza", "Aguilar", "Castillo", "Olarte", "Santiago", "Solís", "Méndez", "Juárez", "Domínguez", "Xochitl"];

const TAMANO: Record<SucursalId, number> = { pr: 340, pa: 225, tx: 190 };
const PLAN_ORDEN: PlanId[] = ["mensual", "matutino", "trimestral", "anual"];
const PLAN_PESOS = [55, 15, 20, 10];

function generarSocios(): Socio[] {
  const r = azar(2026);
  const lista: Socio[] = [];
  let id = 1001;
  for (const suc of SUCURSALES) {
    for (let i = 0; i < TAMANO[suc.id]; i++) {
      const plan = PLAN_ORDEN[ponderado(r, PLAN_PESOS)];
      const dias = PLANES[plan].dias;
      const tipo = r();
      const activa = tipo < 0.72;
      const fin = activa ? HOY + Math.floor(r() * dias)
        : tipo < 0.85 ? HOY - entre(r, 1, 45)
        : tipo < 0.995 ? HOY - entre(r, 61, 220)
        : null;
      // Una de cada cinco membresías activas es de un socio que se inscribió este periodo.
      const nuevo = activa && r() < 0.22;
      const periodos = nuevo ? 1 : plan === "anual" ? entre(r, 1, 2) : entre(r, 2, 8);
      const pagos = fin === null ? [] : Array.from({ length: periodos }, (_, k) => fin - dias + 1 - (periodos - 1 - k) * dias);
      const enRiesgo = activa && r() < 0.09;
      const ultimaVisita = fin === null ? null
        : activa ? HOY - (enRiesgo ? entre(r, 15, 40) : entre(r, 0, 6))
        : Math.min(fin, HOY) - entre(r, 0, 10);
      const adeudoAzar = r();
      lista.push({
        id: id++,
        sucursal: suc.id,
        nombre: `${uno(r, NOMBRES)} ${uno(r, APELLIDOS)} ${uno(r, APELLIDOS)}`,
        telefono: `${suc.lada} ${entre(r, 100, 999)} ${entre(r, 1000, 9999)}`,
        plan,
        pagos,
        congelado: activa && r() < 0.025 ? { desde: HOY - entre(r, 0, 4), dias: 14 } : undefined,
        adeudo: adeudoAzar < 0.06 ? 25_000 : adeudoAzar < 0.14 ? 5_000 : 0,
        huella: r() < 0.88,
        ultimaVisita,
        asistenciasMes: activa ? (enRiesgo ? entre(r, 0, 2) : entre(r, 3, 17)) : 0,
      });
    }
  }
  return lista;
}

export const SOCIOS_BASE = generarSocios();

/** Socios base más lo que la simulación agregó: socios nuevos, pagos, congelamientos y visitas. */
export function socios(sim: Sim): Socio[] {
  const pagos = new Map<number, Dia[]>();
  const adeudoPagado = new Set<number>();
  for (const v of sim.v) {
    if (!v.so) continue;
    for (const [id, cantidad] of v.i) {
      if (id.startsWith("mem:")) pagos.set(v.so, [...(pagos.get(v.so) ?? []), ...Array(cantidad).fill(HOY)]);
      if (id === "adeudo") adeudoPagado.add(v.so);
    }
  }
  const visitas = new Map<number, number>();
  for (const a of sim.a) if (a.so && a.c === "ACCESO_PERMITIDO") visitas.set(a.so, (visitas.get(a.so) ?? 0) + 1);
  const congelados = new Map(sim.z);

  const nuevos: Socio[] = sim.s.map((n) => ({
    id: n.id, sucursal: n.s, nombre: n.n, telefono: n.t, plan: n.p, pagos: [],
    adeudo: 0, huella: n.hu, ultimaVisita: null, asistenciasMes: 0,
  }));

  return [...SOCIOS_BASE, ...nuevos].map((s) => {
    const extra = pagos.get(s.id);
    const vino = visitas.get(s.id);
    const desde = congelados.get(s.id);
    if (!extra && !vino && desde === undefined && !adeudoPagado.has(s.id)) return s;
    return {
      ...s,
      pagos: extra ? [...s.pagos, ...extra] : s.pagos,
      adeudo: adeudoPagado.has(s.id) ? 0 : s.adeudo,
      congelado: desde !== undefined ? { desde, dias: DIAS_CONGELAMIENTO } : s.congelado,
      asistenciasMes: s.asistenciasMes + (vino ?? 0),
      ultimaVisita: vino ? HOY : s.ultimaVisita,
    };
  });
}

export const buscarSocio = (lista: Socio[], id: number) => lista.find((s) => s.id === id) ?? null;

// ---------------------------------------------------------------- Catálogo del punto de venta

export const PRODUCTOS = [
  { id: "agua", nombre: "Agua 1 L", precio: 2_000 },
  { id: "isotonica", nombre: "Bebida isotónica", precio: 3_500 },
  { id: "barra", nombre: "Barra de proteína", precio: 4_000 },
  { id: "proteina", nombre: "Batido de proteína", precio: 5_500 },
  { id: "toalla", nombre: "Renta de toalla", precio: 1_500 },
  { id: "casillero", nombre: "Casillero por día", precio: 2_000 },
  { id: "pase", nombre: "Pase de día", precio: 7_000 },
  { id: "playera", nombre: "Playera del gimnasio", precio: 25_000 },
];

export type Linea = { id: string; nombre: string; precio: number; requiereSocio: boolean };

/** Resuelve un artículo del ticket. El precio siempre sale del servidor, nunca del navegador. */
export function articulo(id: string, socio: Socio | null): Linea | null {
  if (id.startsWith("mem:")) {
    const plan = id.slice(4);
    // Solo se renueva el plan que el socio ya tiene.
    if (!esPlan(plan) || (socio && socio.plan !== plan)) return null;
    return { id, nombre: `Membresía ${PLANES[plan].nombre}`, precio: PLANES[plan].precio, requiereSocio: true };
  }
  if (id === "adeudo") {
    return socio && socio.adeudo > 0 ? { id, nombre: "Pago de adeudo", precio: socio.adeudo, requiereSocio: true } : null;
  }
  const p = PRODUCTOS.find((p) => p.id === id);
  return p ? { ...p, requiereSocio: false } : null;
}

const FOLIO_BASE: Record<SucursalId, number> = { pr: 18_452, pa: 9_210, tx: 7_733 };
export const siguienteFolio = (sim: Sim, s: SucursalId) =>
  Math.max(FOLIO_BASE[s], ...sim.v.filter((v) => v.s === s).map((v) => v.f)) + 1;
export const folio = (s: SucursalId, f: number) =>
  `${SUCURSALES.find((x) => x.id === s)!.clave}-C1-${String(f).padStart(6, "0")}`;

// ---------------------------------------------------------------- Ingresos

const FACTOR_DIA = [0.35, 1, 0.95, 0.95, 0.9, 0.8, 0.6]; // domingo a sábado
const diaSemana = (d: Dia) => new Date(d * 86_400_000).getUTCDay();
const PRODUCTOS_DIA: Record<SucursalId, number> = { pr: 110_000, pa: 68_000, tx: 60_000 };
const INDICE: Record<SucursalId, number> = { pr: 1, pa: 2, tx: 3 };

/** Ventas de tienda de un día. El día simulado solo cuenta hasta las 18:40. */
function tiendaDelDia(s: SucursalId, d: Dia) {
  if (d > HOY) return 0;
  const r = azar(d * 10 + INDICE[s]);
  const total = PRODUCTOS_DIA[s] * FACTOR_DIA[diaSemana(d)] * (0.7 + 0.6 * r());
  return Math.round((d === HOY ? total * 0.8 : total) / 100) * 100;
}

const membresiasPorDia = (() => {
  const mapa = new Map<string, number>();
  for (const s of SOCIOS_BASE) {
    for (const p of s.pagos) {
      const k = `${s.sucursal}:${p}`;
      mapa.set(k, (mapa.get(k) ?? 0) + PLANES[s.plan].precio);
    }
  }
  return mapa;
})();

/** Ingresos de un día: membresías cobradas, tienda y, si es hoy, las ventas de la simulación. */
export function ingresosDelDia(sim: Sim, alcance: Alcance, d: Dia) {
  let total = 0;
  for (const { id } of SUCURSALES) {
    if (!enAlcance(id, alcance)) continue;
    total += (membresiasPorDia.get(`${id}:${d}`) ?? 0) + tiendaDelDia(id, d);
  }
  if (d === HOY) for (const v of sim.v) if (enAlcance(v.s, alcance)) total += v.t;
  return total;
}

const sumaDias = (sim: Sim, alcance: Alcance, desde: Dia, hasta: Dia) => {
  let total = 0;
  for (let d = desde; d <= hasta; d++) total += ingresosDelDia(sim, alcance, d);
  return total;
};

// ---------------------------------------------------------------- Asistencia

const HORAS = [6, 8, 10, 12, 14, 16, 18, 20];
const PESO_HORA = [0.9, 0.6, 0.35, 0.3, 0.25, 0.45, 1, 0.7];

/** Entradas promedio por semana, por franja de dos horas (filas) y día lunes a domingo (columnas). */
function calor(alcance: Alcance) {
  return HORAS.map((_, h) =>
    [1, 2, 3, 4, 5, 6, 0].map((dsem) => {
      let total = 0;
      for (const { id } of SUCURSALES) {
        if (!enAlcance(id, alcance)) continue;
        const r = azar(h * 100 + dsem * 10 + INDICE[id]);
        total += TAMANO[id] * 0.075 * PESO_HORA[h] * FACTOR_DIA[dsem] * (0.8 + 0.4 * r());
      }
      return Math.round(total);
    }),
  );
}

export type Acceso = { minuto: number; socio: Socio | null; codigo: Codigo; via: Via; motivo: string; aviso?: string; simulado: boolean };

/** Accesos de hoy antes de que empiece la simulación. Se validan con las mismas reglas. */
const ACCESOS_BASE: Acceso[] = (() => {
  const r = azar(77);
  const lista: Acceso[] = [];
  for (const { id } of SUCURSALES) {
    const propios = SOCIOS_BASE.filter((s) => s.sucursal === id);
    const habituales = propios.filter((s) => estado(s) === "activa" && s.ultimaVisita !== null && s.ultimaVisita >= HOY - 6);
    const otros = propios.filter((s) => estado(s) !== "activa" && estado(s) !== "cancelada");
    const total = Math.round(habituales.length * 0.4);
    for (let i = 0; i < total; i++) {
      // Franjas que ya empezaron antes de las 18:40 (la de las 20 h todavía no).
      const franja = ponderado(r, PESO_HORA.slice(0, 7));
      const minuto = HORAS[franja] * 60 + Math.floor(r() * Math.min(120, HORA_SIMULADA - HORAS[franja] * 60));
      const socio = r() < 0.92 ? uno(r, habituales) : uno(r, otros);
      const { codigo, motivo, aviso } = validarAcceso(socio, minuto);
      lista.push({ minuto, socio, codigo, motivo, aviso, via: socio.huella ? "huella" : "numero", simulado: false });
    }
  }
  return lista.sort((a, b) => b.minuto - a.minuto);
})();

export function accesosDeHoy(sim: Sim, lista: Socio[], s: SucursalId): Acceso[] {
  const simulados = sim.a
    .filter((a) => a.s === s)
    .map((a) => ({ minuto: a.h, socio: a.so ? buscarSocio(lista, a.so) : null, codigo: a.c, via: a.via, motivo: a.m, aviso: a.w, simulado: true }))
    .reverse();
  return [...simulados, ...ACCESOS_BASE.filter((a) => a.socio?.sucursal === s)];
}

// ---------------------------------------------------------------- Tablero del dueño

export function resumen(sim: Sim, alcance: Alcance) {
  const lista = socios(sim).filter((s) => enAlcance(s.sucursal, alcance));
  const activos = lista.filter((s) => estado(s) === "activa");
  const mesAnterior = HOY - 30;
  const activosAntes = lista.filter((s) => estado(s, mesAnterior) === "activa").length;
  const activosAlInicio = lista.filter((s) => estado(s, INICIO_MES - 1) === "activa").length;
  // Bajas del mes: membresías que pasaron a canceladas en octubre.
  const bajas = lista.filter((s) => {
    const fin = finVigencia(s);
    return fin !== null && estado(s) === "cancelada" && fin + 61 >= INICIO_MES;
  }).length;

  const accesosHoy = SUCURSALES.filter((x) => enAlcance(x.id, alcance))
    .flatMap((x) => accesosDeHoy(sim, lista, x.id))
    .filter((a) => a.codigo === "ACCESO_PERMITIDO" || a.via === "manual").length;

  return {
    activos: activos.length,
    activosAntes,
    ingresosMes: sumaDias(sim, alcance, INICIO_MES, HOY),
    ingresosMesAntes: sumaDias(sim, alcance, INICIO_MES - 30, HOY - 30),
    // Fórmulas de la sección 4.5 del plan.
    ingresoRecurrente: activos.reduce((t, s) => t + PLANES[s.plan].precio / PLANES[s.plan].meses, 0),
    cancelacion: activosAlInicio ? bajas / activosAlInicio : 0,
    bajas,
    enRiesgo: activos
      .filter((s) => s.ultimaVisita !== null && s.ultimaVisita < HOY - 14)
      .sort((a, b) => a.ultimaVisita! - b.ultimaVisita!),
    vencen7: activos.filter((s) => finVigencia(s)! - HOY <= 7).length,
    diarios: Array.from({ length: HOY - INICIO_MES + 1 }, (_, i) => ingresosDelDia(sim, alcance, INICIO_MES + i)),
    calor: calor(alcance),
    horas: HORAS,
    accesosHoy,
  };
}

// ---------------------------------------------------------------- Reporte de gastos

export const MESES = [
  { clave: "2026-07", nombre: "Julio 2026", desde: dia("2026-07-01"), hasta: dia("2026-07-31") },
  { clave: "2026-08", nombre: "Agosto 2026", desde: dia("2026-08-01"), hasta: dia("2026-08-31") },
  { clave: "2026-09", nombre: "Septiembre 2026", desde: dia("2026-09-01"), hasta: dia("2026-09-30") },
];
const JUNIO = { clave: "2026-06", nombre: "Junio 2026", desde: dia("2026-06-01"), hasta: dia("2026-06-30") };
type Mes = (typeof MESES)[number];

const FIJOS: Record<SucursalId, { renta: number; nomina: number; luz: number; agua: number; internet: number; limpieza: number }> = {
  pr: { renta: 2_800_000, nomina: 5_400_000, luz: 980_000, agua: 140_000, internet: 89_900, limpieza: 260_000 },
  pa: { renta: 1_650_000, nomina: 3_300_000, luz: 610_000, agua: 90_000, internet: 69_900, limpieza: 170_000 },
  tx: { renta: 1_400_000, nomina: 2_900_000, luz: 560_000, agua: 85_000, internet: 69_900, limpieza: 150_000 },
};
const VOLADOR = 91_640; // plan Varias sucursales, $790 + IVA

function gastosDelMes(s: SucursalId, mes: Mes) {
  const r = azar(Number(mes.clave.replace("-", "")) * 10 + INDICE[s]);
  const f = FIJOS[s];
  const calorVerano = mes.clave === "2026-07" || mes.clave === "2026-08" ? 1.18 : 1;
  let tienda = 0;
  for (let d = mes.desde; d <= mes.hasta; d++) tienda += tiendaDelDia(s, d);
  const redondear = (x: number) => Math.round(x / 100) * 100;
  return [
    { categoria: "Nómina de recepción e instructores", monto: f.nomina },
    { categoria: "Renta del local", monto: f.renta },
    { categoria: "Compras para la tienda", monto: redondear(tienda * (0.42 + 0.08 * r())) },
    { categoria: "Electricidad", monto: redondear(f.luz * calorVerano * (0.9 + 0.2 * r())) },
    { categoria: "Mantenimiento de equipo", monto: redondear(f.renta * (0.04 + 0.16 * r())) },
    { categoria: "Limpieza e insumos", monto: redondear(f.limpieza * (0.9 + 0.2 * r())) },
    { categoria: "Publicidad", monto: redondear(80_000 + 220_000 * r()) },
    { categoria: "Agua", monto: redondear(f.agua * (0.9 + 0.2 * r())) },
    { categoria: "Suscripción a Volador", monto: VOLADOR },
    { categoria: "Internet y teléfono", monto: f.internet },
  ];
}

const CAJEROS: Record<SucursalId, string[]> = {
  pr: ["Mariana S.", "Luis A.", "Karla P."],
  pa: ["Fernanda R.", "Óscar M."],
  tx: ["Daniela V.", "Iván T."],
};

/** Diferencias de los cortes de caja de un mes, por cajero (reporte local de la sección 4.5). */
function cortesDelMes(s: SucursalId, mes: Mes) {
  const r = azar(Number(mes.clave.replace("-", "")) * 7 + INDICE[s]);
  const dias = mes.hasta - mes.desde + 1;
  return CAJEROS[s].map((cajero) => {
    const cortes = Math.round((dias * 2) / CAJEROS[s].length);
    let conDiferencia = 0;
    let diferencia = 0;
    for (let i = 0; i < cortes; i++) {
      if (r() < 0.9) continue;
      conDiferencia++;
      diferencia += (r() < 0.7 ? -1 : 1) * entre(r, 1, 8) * 1_000;
    }
    return { cajero, sucursal: s, cortes, conDiferencia, diferencia };
  });
}

export function reporteGastos(sim: Sim, alcance: Alcance, clave: string) {
  const i = Math.max(0, MESES.findIndex((m) => m.clave === clave));
  const mes = MESES[i] ?? MESES[MESES.length - 1];
  const anterior = i > 0 ? MESES[i - 1] : JUNIO;
  const sucursales = SUCURSALES.filter((s) => enAlcance(s.id, alcance)).map((s) => {
    const gastos = gastosDelMes(s.id, mes);
    const previos = gastosDelMes(s.id, anterior);
    const ingresos = sumaDias(sim, s.id, mes.desde, mes.hasta);
    return {
      ...s,
      ingresos,
      gastos: gastos.reduce((t, g) => t + g.monto, 0),
      categorias: gastos.map((g, k) => ({ ...g, anterior: previos[k].monto })),
    };
  });
  // Categorías sumadas para la vista de todas las sucursales.
  const categorias = sucursales[0].categorias.map((c, k) => ({
    categoria: c.categoria,
    monto: sucursales.reduce((t, s) => t + s.categorias[k].monto, 0),
    anterior: sucursales.reduce((t, s) => t + s.categorias[k].anterior, 0),
  }));
  return {
    mes,
    sucursales,
    categorias,
    ingresos: sucursales.reduce((t, s) => t + s.ingresos, 0),
    gastos: sucursales.reduce((t, s) => t + s.gastos, 0),
    cortes: sucursales.flatMap((s) => cortesDelMes(s.id, mes)),
  };
}

// ---------------------------------------------------------------- Turno y corte de caja

const FONDO_CAJA = 50_000;

/** Ventas del turno vespertino (14:00 a 18:40) más las que registró la simulación. */
export function turno(sim: Sim, s: SucursalId) {
  const r = azar(INDICE[s] * 31);
  const escala = PRODUCTOS_DIA[s] / PRODUCTOS_DIA.pr;
  const base: Record<Metodo, number> = {
    efectivo: Math.round((380_000 + 120_000 * r()) * escala / 100) * 100,
    tarjeta: Math.round((210_000 + 90_000 * r()) * escala / 100) * 100,
    transferencia: Math.round((80_000 + 60_000 * r()) * escala / 100) * 100,
  };
  const ventas = sim.v.filter((v) => v.s === s);
  for (const v of ventas) base[v.p] += v.t;
  return {
    fondo: FONDO_CAJA,
    porMetodo: base,
    efectivoEsperado: FONDO_CAJA + base.efectivo,
    numVentas: entre(r, 18, 30) + ventas.length,
    ventasSimuladas: ventas.slice().reverse(),
    declarado: sim.c.find((c) => c.s === s)?.e ?? null,
  };
}

// ---------------------------------------------------------------- Panel de soporte

export const VERSION_ACTUAL = "1.2.0";

export const GIMNASIOS = [
  { id: "halcon-pr", nombre: "Halcón · Centro", ciudad: "Poza Rica", plan: "Varias suc.", version: "1.2.0", respaldo: "Hoy, 03:00", sincronizacion: "Hace 2 min" },
  { id: "halcon-pa", nombre: "Halcón · Papantla", ciudad: "Papantla", plan: "Varias suc.", version: "1.2.0", respaldo: "Hoy, 03:00", sincronizacion: "Hace 3 min" },
  { id: "halcon-tx", nombre: "Halcón · Tuxpan", ciudad: "Tuxpan", plan: "Varias suc.", version: "1.2.0", respaldo: "Hoy, 03:05", sincronizacion: "Hace 2 min" },
  { id: "fuerza", nombre: "Fuerza Norte", ciudad: "Poza Rica", plan: "Completo", version: "1.2.0", respaldo: "Hoy, 03:00", sincronizacion: "Hace 5 min" },
  { id: "costa", nombre: "Costa Activa", ciudad: "Tuxpan", plan: "Completo", version: "1.1.4", respaldo: "Hace 3 días", sincronizacion: "Hace 3 días", atencion: true, incidencia: "inc-31" },
  { id: "impulso", nombre: "Impulso", ciudad: "Papantla", plan: "Esencial", version: "1.2.0", respaldo: "Hoy, 03:00", sincronizacion: "Local" },
  { id: "rio", nombre: "Río Fitness", ciudad: "Poza Rica", plan: "Esencial", version: "1.2.0", respaldo: "Hoy, 03:00", sincronizacion: "Local" },
];

export type EstadoIncidencia = "abierta" | "proceso" | "resuelta";
export const INCIDENCIAS: { id: string; gimnasio: string; titulo: string; responsable: string; estado: EstadoIncidencia; hace: string }[] = [
  { id: "inc-31", gimnasio: "costa", titulo: "Sin respaldo en 72 h", responsable: "Programador", estado: "proceso", hace: "hace 2 h" },
  { id: "inc-30", gimnasio: "costa", titulo: "Lector de huella desconectado", responsable: "Analista", estado: "abierta", hace: "hace 4 h" },
  { id: "inc-29", gimnasio: "impulso", titulo: "Duda sobre el corte de caja", responsable: "Analista", estado: "abierta", hace: "hace 6 h" },
  { id: "inc-28", gimnasio: "halcon-tx", titulo: "Alta de usuario de recepción", responsable: "Analista", estado: "proceso", hace: "hace 1 día" },
  { id: "inc-27", gimnasio: "fuerza", titulo: "Actualización a la versión 1.2.0", responsable: "Tester", estado: "resuelta", hace: "hace 2 días" },
];
