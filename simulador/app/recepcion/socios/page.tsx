import type { Metadata } from "next";
import AltaSocio from "@/componentes/AltaSocio";
import { SOCIOS_BASE, socios } from "@/lib/datos";
import { ESTADOS, HOY, PLANES, estado, fecha, finVigencia, nombreSucursal } from "@/lib/dominio";
import { leerSim, sucursalActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Socios" };

const ULTIMO_ID_BASE = SOCIOS_BASE.at(-1)!.id;
const INSIGNIA = { activa: "insignia--ok", pendiente: "insignia--aviso", congelada: "insignia--aviso", vencida: "insignia--mal", cancelada: "" };

export default async function Socios({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [sim, s, { q = "" }] = await Promise.all([leerSim(), sucursalActual(), searchParams]);
  const busqueda = q.trim().toLowerCase();
  const propios = socios(sim).filter((x) => x.sucursal === s);
  const encontrados = propios
    .filter((x) => !busqueda || x.nombre.toLowerCase().includes(busqueda) || String(x.id).includes(busqueda))
    .sort((a, b) => b.id - a.id);

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Socios · {nombreSucursal(s)}</h1>
          <p>{propios.length} socios registrados en esta sucursal, contando bajas.</p>
        </div>
      </div>

      <div className="rejilla rejilla--3-2">
        <section className="tarjeta">
          <form className="barra__grupo" style={{ marginBottom: 14 }} role="search">
            <input className="entrada" name="q" defaultValue={q} placeholder="Buscar por nombre o número" style={{ flex: 1, minWidth: 180 }} />
            <button className="boton boton--secundario" type="submit">Buscar</button>
          </form>
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Nombre</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Vigencia</th>
                  <th>Identificación</th>
                </tr>
              </thead>
              <tbody>
                {encontrados.slice(0, 25).map((x) => {
                  const e = estado(x);
                  const fin = finVigencia(x);
                  return (
                    <tr key={x.id} className={x.id > ULTIMO_ID_BASE ? "nuevo" : undefined}>
                      <td className="mono">{x.id}</td>
                      <td>{x.nombre}</td>
                      <td>{PLANES[x.plan].nombre}</td>
                      <td><span className={`insignia ${INSIGNIA[e]}`}>{ESTADOS[e]}</span></td>
                      <td className="cifra">{fin === null ? "—" : `${fin < HOY ? "venció " : "hasta "}${fecha(fin)}`}</td>
                      <td className="tenue">{x.huella ? "Huella" : "Número y foto"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="nota">
            {encontrados.length > 25 ? `Se muestran 25 de ${encontrados.length} resultados.` : `${encontrados.length} resultados.`} En azul, los socios que diste de alta en esta simulación.
          </p>
        </section>

        <section className="tarjeta" data-guia="alta">
          <h2>Alta de socio <small>queda pendiente de pago hasta cobrarle</small></h2>
          <AltaSocio />
        </section>
      </div>
    </>
  );
}
