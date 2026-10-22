import type { Metadata } from "next";
import Link from "next/link";
import PuntoDeVenta, { type Articulo } from "@/componentes/PuntoDeVenta";
import { METODOS, PRODUCTOS, articulo, buscarSocio, folio, socios, turno } from "@/lib/datos";
import { ESTADOS, PLANES, TOPE_DESCUENTO, estado, hora, nombreSucursal, pesos } from "@/lib/dominio";
import { leerSim, sucursalActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Ventas" };

const nombreArticulo = (id: string) => articulo(id, null)?.nombre ?? "Pago de adeudo";
const resumirTicket = (lineas: [string, number][]) =>
  lineas.map(([id, cantidad]) => `${cantidad > 1 ? `${cantidad} × ` : ""}${nombreArticulo(id)}`).join(", ");

export default async function Ventas({ searchParams }: { searchParams: Promise<{ socio?: string; agregar?: string; folio?: string }> }) {
  const [sim, s, params] = await Promise.all([leerSim(), sucursalActual(), searchParams]);
  const encontrado = params.socio ? buscarSocio(socios(sim), Number(params.socio)) : null;
  const socio = encontrado?.sucursal === s ? encontrado : null;
  const recibo = params.folio ? sim.v.find((v) => v.s === s && v.f === Number(params.folio)) : undefined;
  const t = turno(sim, s);

  const articulos: Articulo[] = [
    ...(socio
      ? [articulo(`mem:${socio.plan}`, socio), articulo("adeudo", socio)]
          .filter((a) => a !== null)
          .map((a) => ({ ...a, detalle: a.id === "adeudo" ? "del socio" : `${PLANES[socio.plan].dias} días` }))
      : []),
    ...PRODUCTOS,
  ];
  const inicial = params.agregar && articulos.some((a) => a.id === params.agregar) ? params.agregar : undefined;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Ventas · {nombreSucursal(s)}</h1>
          <p>Caja 1 · membresías, productos y servicios. Cada venta recibe un folio propio de la caja.</p>
        </div>
      </div>

      {recibo && (
        <section className="tarjeta recibo" role="status">
          <h2>Venta registrada <small className="mono">Folio {folio(s, recibo.f)}</small></h2>
          <p>{resumirTicket(recibo.i)}</p>
          <p className="tenue pequeno" style={{ marginTop: 4 }}>
            {METODOS[recibo.p]} · {hora(recibo.h)}{recibo.d ? ` · ${recibo.d} % de descuento` : ""} · <b>{pesos(recibo.t)}</b>
          </p>
          <p className="nota">
            El folio sigue el formato sucursal–caja–consecutivo, así dos cajas nunca repiten folio aunque trabajen sin internet.
            {recibo.so && <> <Link href="/recepcion">Volver a recepción</Link> para validar al socio de nuevo.</>}
          </p>
        </section>
      )}

      <section className="tarjeta" data-guia="socio-venta">
        <form className="barra__grupo">
          <span className="barra__etiqueta">Socio</span>
          <input className="entrada" name="socio" inputMode="numeric" pattern="[0-9]+" defaultValue={socio?.id ?? ""} placeholder="Número de socio (opcional)" style={{ width: 220 }} />
          <button className="boton boton--secundario" type="submit">Elegir</button>
          {socio && (
            <>
              <span>
                <b>{socio.nombre}</b> · {PLANES[socio.plan].nombre} · <span className="insignia">{ESTADOS[estado(socio)]}</span>
                {socio.adeudo > 0 && <> · adeudo {pesos(socio.adeudo)}</>}
              </span>
              <Link href="/recepcion/ventas" className="pequeno">Quitar socio</Link>
            </>
          )}
          {params.socio && !socio && <span className="baja pequeno">No hay un socio con ese número en esta sucursal.</span>}
        </form>
      </section>

      <PuntoDeVenta
        key={`${socio?.id ?? "mostrador"}-${inicial ?? ""}-${params.folio ?? ""}`}
        articulos={articulos}
        inicial={inicial}
        socio={socio && { id: socio.id, nombre: socio.nombre }}
        tope={TOPE_DESCUENTO}
      />

      <section className="tarjeta">
        <h2>Ventas de este turno <small>{t.numVentas} en total desde las 14:00 · se listan las de esta simulación</small></h2>
        {t.ventasSimuladas.length === 0 ? (
          <p className="tenue pequeno">Todavía no registras ventas en esta simulación.</p>
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Hora</th>
                  <th>Artículos</th>
                  <th>Método</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {t.ventasSimuladas.map((v) => (
                  <tr key={v.f}>
                    <td className="mono">{folio(s, v.f)}</td>
                    <td className="mono">{hora(v.h)}</td>
                    <td>{resumirTicket(v.i)}</td>
                    <td>{METODOS[v.p]}</td>
                    <td className="num">{pesos(v.t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
