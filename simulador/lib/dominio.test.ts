import { test } from "node:test";
import assert from "node:assert/strict";
import { HOY, PLANES, estado, finVigencia, validarAcceso, type Socio } from "./dominio.ts";

const base: Socio = {
  id: 1, sucursal: "pr", nombre: "Prueba", telefono: "", plan: "mensual",
  pagos: [HOY - 10], adeudo: 0, huella: true, ultimaVisita: HOY, asistenciasMes: 0,
};
const socio = (cambios: Partial<Socio>): Socio => ({ ...base, ...cambios });
const MEDIODIA = 12 * 60;
const NOCHE = 19 * 60;

test("la vigencia se deriva de los pagos y una renovación anticipada se encadena", () => {
  assert.equal(finVigencia(base), HOY - 10 + 29);
  assert.equal(finVigencia(socio({ pagos: [HOY - 10, HOY] })), HOY - 10 + 59);
  assert.equal(finVigencia(socio({ pagos: [] })), null);
  // Un pago futuro no cuenta para una fecha anterior.
  assert.equal(estado(socio({ pagos: [HOY] }), HOY - 1), "pendiente");
});

test("estados del ciclo de vida", () => {
  assert.equal(estado(base), "activa");
  assert.equal(estado(socio({ pagos: [] })), "pendiente");
  assert.equal(estado(socio({ pagos: [HOY - 40] })), "vencida");
  assert.equal(estado(socio({ pagos: [HOY - 100] })), "cancelada");
  const congelado = socio({ congelado: { desde: HOY - 2, dias: 7 } });
  assert.equal(estado(congelado), "congelada");
  assert.equal(finVigencia(congelado), HOY - 10 + 29 + 7);
});

test("las reglas de acceso se evalúan en orden y se detienen en la primera que falla", () => {
  const codigo = (s: Socio | null, minuto = MEDIODIA) => validarAcceso(s, minuto).codigo;
  assert.equal(codigo(null), "BIO_SIN_COINCIDENCIA");
  assert.equal(codigo(base), "ACCESO_PERMITIDO");
  assert.equal(codigo(socio({ pagos: [] })), "MEM_PENDIENTE_PAGO");
  assert.equal(codigo(socio({ congelado: { desde: HOY, dias: 7 } })), "MEM_CONGELADA");
  assert.equal(codigo(socio({ pagos: [HOY - 100] })), "MEM_CANCELADA");
  assert.equal(codigo(socio({ pagos: [HOY - 40] })), "MEM_VENCIDA");
  assert.equal(codigo(socio({ plan: "matutino" }), NOCHE), "HORARIO_NO_PERMITIDO");
  assert.equal(codigo(socio({ plan: "matutino" }), MEDIODIA), "ACCESO_PERMITIDO");
  assert.equal(codigo(socio({ adeudo: 25_000 })), "ADEUDO_PENDIENTE");
  // Vencida y fuera de horario: gana la membresía, que va primero.
  assert.equal(codigo(socio({ plan: "matutino", pagos: [HOY - 40] }), NOCHE), "MEM_VENCIDA");
});

test("las tolerancias permiten el paso con aviso", () => {
  const vencidaAyer = validarAcceso(socio({ pagos: [HOY - PLANES.mensual.dias - 1] }), MEDIODIA);
  assert.equal(vencidaAyer.permitido, true);
  assert.match(vencidaAyer.aviso ?? "", /tolerancia/);
  const adeudoMenor = validarAcceso(socio({ adeudo: 5_000 }), MEDIODIA);
  assert.equal(adeudoMenor.permitido, true);
  assert.match(adeudoMenor.aviso ?? "", /Adeudo/);
});
