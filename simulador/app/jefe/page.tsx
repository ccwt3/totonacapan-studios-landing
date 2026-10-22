import type { Metadata } from "next";
import { Calor, Columnas, Kpi } from "@/componentes/Graficas";
import { resumen } from "@/lib/datos";
import { GIMNASIO, HOY, INICIO_MES, PLANES, SUCURSALES, fecha, finVigencia, nombreSucursal, pesos, pesosEnteros, porcentaje } from "@/lib/dominio";
import { alcanceActual, leerSim } from "@/lib/sesion";

export const metadata: Metadata = { title: "Tablero del dueño" };

export default async function TableroJefe() {
  const [sim, alcance] = await Promise.all([leerSim(), alcanceActual()]);
  const r = resumen(sim, alcance);
  const todas = alcance === "todas";
  const porSucursal = todas ? SUCURSALES.map((s) => ({ ...s, r: resumen(sim, s.id) })) : [];

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Resumen · octubre de 2026</h1>
          <p>
            {todas ? "Las tres sucursales" : `Sucursal ${nombreSucursal(alcance)}`} · del 1 al 21 de octubre, comparado con el mismo periodo de septiembre
          </p>
        </div>
      </div>

      <section className="kpis" data-guia="kpis" aria-label="Indicadores del mes">
        <Kpi etiqueta="Socios activos" valor={r.activos} actual={r.activos} anterior={r.activosAntes} />
        <Kpi etiqueta="Ingresos del mes" valor={pesosEnteros(r.ingresosMes)} actual={r.ingresosMes} anterior={r.ingresosMesAntes} />
        <Kpi etiqueta="Socios en riesgo" valor={r.enRiesgo.length} nota="sin asistir en 14 días" />
        <Kpi etiqueta="Vencen en 7 días" valor={r.vencen7} nota="membresías por renovar" />
      </section>

      <section className="rejilla rejilla--3-2" data-guia="graficas">
        <div className="tarjeta">
          <h2>Ingresos diarios <small>membresías y tienda · hoy en turquesa</small></h2>
          <Columnas
            descripcion={`Ingresos diarios de octubre. Hoy van ${pesos(r.diarios.at(-1)!)}.`}
            datos={r.diarios.map((valor, i) => ({
              etiqueta: String(i + 1),
              valor,
              detalle: fecha(INICIO_MES + i, { weekday: "long", day: "numeric", month: "long" }),
              destacado: INICIO_MES + i === HOY,
            }))}
          />
        </div>
        <div className="tarjeta">
          <h2>Asistencia por hora y día <small>entradas promedio por semana</small></h2>
          <Calor matriz={r.calor} horas={r.horas} />
        </div>
      </section>

      <section className="kpis" aria-label="Indicadores de retención">
        <Kpi secundario etiqueta="Ingreso recurrente mensual" valor={pesosEnteros(r.ingresoRecurrente)} nota="suma de cada membresía activa entre los meses que cubre" />
        <Kpi secundario etiqueta="Tasa de cancelación mensual" valor={porcentaje(r.cancelacion)} nota={`${r.bajas} bajas entre los socios activos al 1 de octubre`} />
        <Kpi secundario etiqueta="Entradas de hoy" valor={r.accesosHoy} nota="accesos permitidos hasta ahora" />
      </section>

      {todas && (
        <section className="tarjeta">
          <h2>Comparativo por sucursal <small>octubre, al día 21</small></h2>
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th className="num">Socios activos</th>
                  <th className="num">Ingresos del mes</th>
                  <th className="num">Ingreso recurrente</th>
                  <th className="num">En riesgo</th>
                  <th className="num">Entradas hoy</th>
                </tr>
              </thead>
              <tbody>
                {porSucursal.map((s) => (
                  <tr key={s.id}>
                    <td>{s.nombre}</td>
                    <td className="num">{s.r.activos}</td>
                    <td className="num">{pesosEnteros(s.r.ingresosMes)}</td>
                    <td className="num">{pesosEnteros(s.r.ingresoRecurrente)}</td>
                    <td className="num">{s.r.enRiesgo.length}</td>
                    <td className="num">{s.r.accesosHoy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="tarjeta" data-guia="riesgo">
        <h2>Socios en riesgo <small>membresía activa, sin asistir en los últimos 14 días</small></h2>
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Socio</th>
                {todas && <th>Sucursal</th>}
                <th>Plan</th>
                <th>Última visita</th>
                <th>Teléfono</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {r.enRiesgo.slice(0, 8).map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.nombre} <span className="tenue mono">#{s.id}</span>
                  </td>
                  {todas && <td>{nombreSucursal(s.sucursal)}</td>}
                  <td>{PLANES[s.plan].nombre}</td>
                  <td>
                    {fecha(s.ultimaVisita!, { day: "numeric", month: "short" })} <span className="tenue">· hace {HOY - s.ultimaVisita!} días</span>
                  </td>
                  <td className="mono">{s.telefono}</td>
                  <td>
                    <details className="contactar">
                      <summary className="boton boton--secundario boton--chico">Contactar</summary>
                      <p className="contactar__mensaje">
                        Mensaje sugerido: «Hola, {s.nombre.split(" ")[0]}. Te extrañamos en {GIMNASIO}. Tu membresía sigue vigente hasta el{" "}
                        {fecha(finVigencia(s)!, { day: "numeric", month: "long" })}. ¿Te apartamos un lugar en la clase de esta semana?»
                      </p>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {r.enRiesgo.length > 8 && <p className="nota">Se muestran los 8 con más días sin venir, de {r.enRiesgo.length}.</p>}
      </section>
    </>
  );
}
