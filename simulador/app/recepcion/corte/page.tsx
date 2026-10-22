import type { Metadata } from "next";
import { declararCorte, repetirCorte } from "@/app/acciones";
import { METODOS, turno } from "@/lib/datos";
import { nombreSucursal, pesos } from "@/lib/dominio";
import { leerSim, sucursalActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Corte de caja" };

export default async function Corte() {
  const [sim, s] = await Promise.all([leerSim(), sucursalActual()]);
  const t = turno(sim, s);
  const diferencia = t.declarado === null ? 0 : t.declarado - t.efectivoEsperado;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Corte de caja · {nombreSucursal(s)}</h1>
          <p>Caja 1 · turno vespertino, de 14:00 a 18:40 · cajero: jefe · {t.numVentas} ventas</p>
        </div>
      </div>

      {t.declarado === null ? (
        <section className="tarjeta" style={{ maxWidth: 560 }} data-guia="declarar">
          <h2>Corte ciego</h2>
          <p>Cuenta el efectivo que hay en la caja, incluido el fondo, y escribe el total. El monto que el sistema espera se muestra <b>después</b> de declararlo.</p>
          <form action={declararCorte} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <label className="campo">
              <span>Efectivo contado en caja (pesos)</span>
              <input name="efectivo" inputMode="decimal" required pattern="[0-9,]+(\.[0-9]{1,2})?" placeholder="Ej. 5,107.00" />
            </label>
            <button className="boton" type="submit">Declarar efectivo</button>
          </form>
          <p className="nota">Así se evita que el cajero ajuste su conteo al número de la pantalla.</p>
        </section>
      ) : (
        <div className="rejilla rejilla--2">
          <section className="tarjeta" data-guia="resultado-corte">
            <h2>Resultado del corte</h2>
            <table className="tabla">
              <tbody>
                <tr><td>Fondo inicial</td><td className="num">{pesos(t.fondo)}</td></tr>
                <tr><td>Ventas en efectivo</td><td className="num">{pesos(t.porMetodo.efectivo)}</td></tr>
                <tr><td><b>Efectivo esperado</b></td><td className="num"><b>{pesos(t.efectivoEsperado)}</b></td></tr>
                <tr><td><b>Efectivo declarado</b></td><td className="num"><b>{pesos(t.declarado)}</b></td></tr>
              </tbody>
            </table>
            <p className={`franja ${diferencia === 0 ? "franja--ok" : "franja--mal"}`}>
              {diferencia === 0 ? "CORTE CUADRADO" : diferencia < 0 ? `FALTANTE DE ${pesos(-diferencia)}` : `SOBRANTE DE ${pesos(diferencia)}`}
              <small>{diferencia === 0 ? "El efectivo coincide con lo registrado." : "La diferencia queda en el reporte del dueño; no se borra, se explica."}</small>
            </p>
            <form action={repetirCorte} style={{ marginTop: 14 }}>
              <button className="boton boton--secundario" type="submit">Repetir el corte</button>
            </form>
          </section>

          <section className="tarjeta">
            <h2>Cobros que no entran a la caja</h2>
            <table className="tabla">
              <tbody>
                <tr><td>{METODOS.tarjeta}</td><td className="num">{pesos(t.porMetodo.tarjeta)}</td></tr>
                <tr><td>{METODOS.transferencia}</td><td className="num">{pesos(t.porMetodo.transferencia)}</td></tr>
              </tbody>
            </table>
            <p className="nota">Se concilian con el estado de cuenta del banco, no con el conteo de billetes.</p>
          </section>
        </div>
      )}
    </>
  );
}
