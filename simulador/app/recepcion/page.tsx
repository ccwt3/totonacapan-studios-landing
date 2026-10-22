import type { Metadata } from "next";
import Link from "next/link";
import { accesoManual, congelar } from "@/app/acciones";
import Lector, { type Caso } from "@/componentes/Lector";
import { SOCIOS_BASE, VIAS, accesosDeHoy, buscarSocio, socios } from "@/lib/datos";
import {
  DIAS_CONGELAMIENTO, ESTADOS, HOY, PLANES, TOLERANCIA_ADEUDO, TOLERANCIA_DIAS,
  estado, fecha, finVigencia, hora, nombreSucursal, pesos, type Socio, type SucursalId,
} from "@/lib/dominio";
import { leerSim, sucursalActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Recepción" };

const ULTIMO_ID_BASE = SOCIOS_BASE.at(-1)!.id;

/** Un socio por cada caso que vale la pena probar en el lector. */
function casosDePrueba(lista: Socio[], s: SucursalId, enFicha: Socio | null): Caso[] {
  const propios = lista.filter((x) => x.sucursal === s && x.huella);
  const sinRestricciones = (x: Socio) => x.adeudo === 0 && x.plan !== "matutino";
  const vencidoHace = (x: Socio) => HOY - (finVigencia(x) ?? HOY);
  const casos: [string, Socio | undefined][] = [
    ["Membresía activa", propios.find((x) => estado(x) === "activa" && sinRestricciones(x))],
    ["Vencida hace 3 días o menos", propios.find((x) => estado(x) === "vencida" && vencidoHace(x) <= TOLERANCIA_DIAS && sinRestricciones(x))],
    ["Membresía vencida", propios.find((x) => estado(x) === "vencida" && vencidoHace(x) > TOLERANCIA_DIAS)],
    ["Plan matutino, de 6 a 14 h", propios.find((x) => estado(x) === "activa" && x.plan === "matutino" && x.adeudo === 0)],
    ["Adeudo mayor a la tolerancia", propios.find((x) => estado(x) === "activa" && x.adeudo > TOLERANCIA_ADEUDO && x.plan !== "matutino")],
    ["Membresía congelada", propios.find((x) => estado(x) === "congelada")],
    ...propios.filter((x) => x.id > ULTIMO_ID_BASE).map((x): [string, Socio] => ["Socio registrado en esta sesión", x]),
  ];
  // El último socio identificado se queda en la lista para volver a validarlo después de cobrarle.
  if (enFicha?.huella && !casos.some(([, x]) => x?.id === enFicha.id)) casos.unshift(["Último socio identificado", enFicha]);

  return [
    ...casos.filter((c): c is [string, Socio] => !!c[1]).map(([caso, x]) => ({ valor: String(x.id), nombre: x.nombre, caso })),
    { valor: "", nombre: "Persona sin registro", caso: "Su huella no está en la base" },
  ];
}

export default async function Recepcion() {
  const [sim, s] = await Promise.all([leerSim(), sucursalActual()]);
  const lista = socios(sim);
  const accesos = accesosDeHoy(sim, lista, s);
  const ultimo = accesos.find((a) => a.simulado) ?? null;
  const socio = ultimo?.socio ?? null;
  const fin = socio ? finVigencia(socio) : null;
  const e = socio ? estado(socio) : null;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Recepción · {nombreSucursal(s)}</h1>
          <p>Valida la entrada de los socios. Las reglas se revisan en orden y se detienen en la primera que no se cumple.</p>
        </div>
      </div>

      <div className="rejilla rejilla--recepcion">
        <Lector casos={casosDePrueba(lista, s, socio)} />

        <section className="tarjeta" data-guia="ficha" aria-live="polite">
          <h2>Ficha del socio</h2>
          {!ultimo && (
            <div className="ficha">
              <div className="foto-blanca">Fotografía</div>
              <div>
                <p className="ficha__nombre tenue">Esperando huella…</p>
                <p className="tenue" style={{ marginTop: 8 }}>Cuando un socio ponga el dedo, aquí verás su foto, su plan, su vigencia y si puede pasar.</p>
                <p className="franja franja--espera">SIN LECTURA</p>
              </div>
            </div>
          )}

          {ultimo && (
            <div className="ficha">
              <div className="foto-blanca">{socio ? "Fotografía" : "Sin foto"}</div>
              <div>
                <p className="ficha__nombre">{socio ? socio.nombre : "Persona no identificada"}</p>
                {socio ? (
                  <>
                    <p className="tenue mono">Socio #{socio.id} · {nombreSucursal(socio.sucursal)}</p>
                    <dl className="ficha__datos">
                      <dt>Plan</dt>
                      <dd>{PLANES[socio.plan].nombre} · {pesos(PLANES[socio.plan].precio)}</dd>
                      <dt>Estado</dt>
                      <dd>
                        <span className={`insignia ${e === "activa" ? "insignia--ok" : e === "pendiente" || e === "congelada" ? "insignia--aviso" : "insignia--mal"}`}>{ESTADOS[e!]}</span>
                      </dd>
                      <dt>{fin !== null && fin < HOY ? "Venció el" : "Vigente hasta el"}</dt>
                      <dd>{fin !== null ? fecha(fin) : "—"}</dd>
                      <dt>Asistencias del mes</dt>
                      <dd>{socio.asistenciasMes}</dd>
                      <dt>Adeudo</dt>
                      <dd>{pesos(socio.adeudo)}</dd>
                    </dl>
                  </>
                ) : (
                  <p className="tenue" style={{ marginTop: 6 }}>La huella no coincide con ningún socio de esta sucursal. Pide su número de socio y compara la fotografía.</p>
                )}

                <p className={`franja ${ultimo.codigo === "ACCESO_PERMITIDO" ? "franja--ok" : "franja--mal"}`}>
                  {ultimo.codigo === "ACCESO_PERMITIDO" ? "ACCESO PERMITIDO" : "ACCESO DENEGADO"}
                  <small>
                    {ultimo.motivo}
                    {ultimo.codigo !== "ACCESO_PERMITIDO" && <> · <span className="mono">{ultimo.codigo}</span></>}
                  </small>
                </p>
                {ultimo.aviso && <p className="aviso-tolerancia">{ultimo.aviso}</p>}
                {ultimo.via === "numero" && <p className="aviso-tolerancia">Identificación alternativa: confirma que la fotografía coincide con la persona.</p>}
                <p className="nota">
                  {VIAS[ultimo.via]} · {hora(ultimo.minuto)}. Si cobras o renuevas, vuelve a colocar la huella para validar de nuevo.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="tarjeta acciones" data-guia="acciones">
          <h2 style={{ margin: 0 }}>Acciones</h2>
          {socio ? (
            <>
              <Link className="boton" href={`/recepcion/ventas?socio=${socio.id}${socio.adeudo ? "&agregar=adeudo" : ""}`}>Cobrar</Link>
              <Link className="boton boton--secundario" href={`/recepcion/ventas?socio=${socio.id}&agregar=mem:${socio.plan}`}>Renovar membresía</Link>
              <form action={congelar}>
                <input type="hidden" name="socio" value={socio.id} />
                <button
                  className="boton boton--secundario boton--ancho"
                  type="submit"
                  disabled={e !== "activa" || !!socio.congelado}
                  title={socio.congelado ? "Ya usó su congelamiento del año" : e !== "activa" ? "Solo se congela una membresía activa" : undefined}
                >
                  Congelar {DIAS_CONGELAMIENTO} días
                </button>
              </form>
              <details>
                <summary>Acceso manual con motivo</summary>
                <form action={accesoManual}>
                  <input type="hidden" name="socio" value={socio.id} />
                  <label className="campo">
                    <span>Motivo (queda registrado con tu usuario)</span>
                    <input name="motivo" required minLength={3} maxLength={60} placeholder="Ej. pagará en la salida" />
                  </label>
                  <button className="boton boton--peligro" type="submit">Permitir acceso</button>
                </form>
              </details>
            </>
          ) : (
            <p className="tenue pequeno">Identifica a un socio para cobrarle, renovar, congelar o darle acceso manual.</p>
          )}
          <p className="nota">Congelar recorre la fecha de fin; una vez por año. La vigencia sale de los pagos registrados, no se edita a mano.</p>
        </section>
      </div>

      <section className="tarjeta" data-guia="accesos">
        <h2>Últimos accesos <small>hoy · {accesos.length} intentos</small></h2>
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Socio</th>
                <th>Resultado</th>
                <th>Motivo</th>
                <th>Vía</th>
              </tr>
            </thead>
            <tbody>
              {accesos.slice(0, 10).map((a, i) => (
                <tr key={i} className={a.simulado ? "nuevo" : undefined}>
                  <td className="mono">{hora(a.minuto)}</td>
                  <td>{a.socio?.nombre ?? "No identificado"}</td>
                  <td>
                    <span className={`insignia ${a.codigo === "ACCESO_PERMITIDO" ? "insignia--ok" : "insignia--mal"}`}>
                      {a.codigo === "ACCESO_PERMITIDO" ? "Permitido" : "Denegado"}
                    </span>
                  </td>
                  <td>{a.codigo === "ACCESO_PERMITIDO" && a.via === "huella" ? "—" : a.via === "numero" && a.codigo === "ACCESO_PERMITIDO" ? "Identificación alternativa" : a.motivo}</td>
                  <td className="tenue">{VIAS[a.via]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota">En azul, los accesos que registraste en esta simulación.</p>
      </section>
    </>
  );
}
