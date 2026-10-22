import type { Metadata } from "next";
import Link from "next/link";
import { BarrasH, Kpi } from "@/componentes/Graficas";
import { MESES, reporteGastos } from "@/lib/datos";
import { nombreSucursal, pesos, pesosEnteros, porcentaje } from "@/lib/dominio";
import { alcanceActual, leerSim } from "@/lib/sesion";

export const metadata: Metadata = { title: "Reporte de gastos" };

export default async function Gastos({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const [sim, alcance, { mes: clave }] = await Promise.all([leerSim(), alcanceActual(), searchParams]);
  const r = reporteGastos(sim, alcance, clave ?? MESES.at(-1)!.clave);
  const todas = alcance === "todas";
  const utilidad = r.ingresos - r.gastos;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Reporte de gastos · {r.mes.nombre}</h1>
          <p>{todas ? "Las tres sucursales" : `Sucursal ${nombreSucursal(alcance)}`} · mes cerrado · montos en pesos</p>
        </div>
        <nav className="segmentado" aria-label="Mes del reporte" data-guia="meses">
          {MESES.map((m) => (
            <Link key={m.clave} href={`?mes=${m.clave}`} aria-current={m.clave === r.mes.clave}>
              {m.nombre.replace(" 2026", "")}
            </Link>
          ))}
        </nav>
      </div>

      <section className="kpis" data-guia="balance" aria-label="Balance del mes">
        <Kpi etiqueta="Ingresos" valor={pesosEnteros(r.ingresos)} nota="membresías y tienda" />
        <Kpi etiqueta="Gastos" valor={pesosEnteros(r.gastos)} nota={`${r.categorias.length} categorías`} />
        <Kpi
          etiqueta="Utilidad"
          valor={<span className={utilidad < 0 ? "baja" : undefined}>{pesosEnteros(utilidad)}</span>}
          nota={`margen de ${porcentaje(r.ingresos ? utilidad / r.ingresos : 0)}`}
        />
      </section>

      {todas && (
        <section className="tarjeta">
          <h2>Ingresos y gastos por sucursal</h2>
          <div className="leyenda">
            <span><i className="serie-ingresos" /> Ingresos</span>
            <span><i className="serie-gastos" /> Gastos</span>
          </div>
          <BarrasH
            descripcion="Ingresos y gastos del mes de cada sucursal."
            filas={r.sucursales.map((s) => ({
              etiqueta: s.nombre,
              barras: [
                { valor: s.ingresos, clase: "serie-ingresos", nombre: "Ingresos" },
                { valor: s.gastos, clase: "serie-gastos", nombre: "Gastos" },
              ],
            }))}
          />
          <div className="tabla-envoltura" style={{ marginTop: 18 }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th className="num">Ingresos</th>
                  <th className="num">Gastos</th>
                  <th className="num">Utilidad</th>
                  <th className="num">Margen</th>
                </tr>
              </thead>
              <tbody>
                {r.sucursales.map((s) => {
                  const u = s.ingresos - s.gastos;
                  return (
                    <tr key={s.id} className={u < 0 ? "resaltado" : undefined}>
                      <td>{s.nombre}</td>
                      <td className="num">{pesos(s.ingresos)}</td>
                      <td className="num">{pesos(s.gastos)}</td>
                      <td className={`num ${u < 0 ? "baja" : ""}`}>{pesos(u)}</td>
                      <td className="num">{porcentaje(u / s.ingresos)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rejilla rejilla--2" data-guia="categorias">
        <div className="tarjeta">
          <h2>Gastos por categoría</h2>
          <BarrasH
            descripcion="Gastos del mes por categoría, de mayor a menor."
            filas={[...r.categorias]
              .sort((a, b) => b.monto - a.monto)
              .map((c) => ({ etiqueta: c.categoria, barras: [{ valor: c.monto, clase: "serie-gastos", nombre: "Gasto" }] }))}
          />
        </div>
        <div className="tarjeta">
          <h2>Detalle <small>frente al mes anterior</small></h2>
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th className="num">Monto</th>
                  <th className="num">% del total</th>
                  <th className="num">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {r.categorias.map((c) => {
                  const cambio = c.anterior ? (c.monto - c.anterior) / c.anterior : 0;
                  return (
                    <tr key={c.categoria}>
                      <td>{c.categoria}</td>
                      <td className="num">{pesos(c.monto)}</td>
                      <td className="num">{porcentaje(c.monto / r.gastos)}</td>
                      {/* En gastos, subir es malo. */}
                      <td className={`num ${cambio > 0.005 ? "baja" : cambio < -0.005 ? "sube" : "tenue"}`}>
                        {Math.abs(cambio) < 0.005 ? "igual" : `${cambio > 0 ? "+" : ""}${porcentaje(cambio)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{pesos(r.gastos)}</td>
                  <td className="num">100 %</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      <section className="tarjeta" data-guia="cortes">
        <h2>Diferencias de corte por cajero <small>faltantes en negativo, sobrantes en positivo</small></h2>
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Cajero</th>
                {todas && <th>Sucursal</th>}
                <th className="num">Cortes</th>
                <th className="num">Cortes con diferencia</th>
                <th className="num">Diferencia acumulada</th>
              </tr>
            </thead>
            <tbody>
              {r.cortes.map((c) => (
                <tr key={c.cajero} className={c.diferencia <= -3_000 ? "resaltado" : undefined}>
                  <td>{c.cajero}</td>
                  {todas && <td>{nombreSucursal(c.sucursal)}</td>}
                  <td className="num">{c.cortes}</td>
                  <td className="num">{c.conDiferencia}</td>
                  <td className={`num ${c.diferencia < 0 ? "baja" : ""}`}>{pesos(c.diferencia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota">Se resaltan los cajeros con faltantes de $30 o más en el mes. Cada corte es ciego: el cajero declara el efectivo antes de ver lo esperado.</p>
      </section>
    </>
  );
}
