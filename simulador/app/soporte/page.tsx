import type { Metadata } from "next";
import { resolverIncidencia } from "@/app/acciones";
import { Kpi } from "@/componentes/Graficas";
import { GIMNASIOS, INCIDENCIAS, VERSION_ACTUAL, type EstadoIncidencia } from "@/lib/datos";
import { leerSim } from "@/lib/sesion";

export const metadata: Metadata = { title: "Panel de soporte" };

const ESTADO_INCIDENCIA: Record<EstadoIncidencia, { texto: string; clase: string }> = {
  abierta: { texto: "Abierta", clase: "insignia--mal" },
  proceso: { texto: "En proceso", clase: "insignia--aviso" },
  resuelta: { texto: "Resuelta", clase: "insignia--info" },
};

export default async function Soporte({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [sim, { q = "" }] = await Promise.all([leerSim(), searchParams]);
  const incidencias = INCIDENCIAS.map((i) => (sim.i.includes(i.id) ? { ...i, estado: "resuelta" as const, hace: "ahora" } : i));
  const abiertas = incidencias.filter((i) => i.estado !== "resuelta");
  const busqueda = q.trim().toLowerCase();
  // Resolver la incidencia del respaldo atrasado deja al gimnasio al día.
  const todos = GIMNASIOS.map((g) =>
    g.incidencia && sim.i.includes(g.incidencia) ? { ...g, atencion: false, respaldo: "Hoy, 18:45", sincronizacion: "Hace 1 min" } : g,
  );
  const gimnasios = todos.filter((g) => !busqueda || `${g.nombre} ${g.ciudad}`.toLowerCase().includes(busqueda));
  const nombre = (id: string) => GIMNASIOS.find((g) => g.id === id)!.nombre;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Gimnasios</h1>
          <p>Monitoreo de respaldos, versiones e incidencias de los gimnasios que atiende Totonacapan Digital.</p>
        </div>
        <form className="barra__grupo" role="search">
          <input className="entrada" name="q" defaultValue={q} placeholder="Buscar gimnasio o ciudad" style={{ width: 240 }} />
          <button className="boton boton--secundario" type="submit">Buscar</button>
        </form>
      </div>

      <section className="kpis" data-guia="kpis-soporte">
        <Kpi etiqueta="Sucursales atendidas" valor={GIMNASIOS.length} nota="meta del plan al mes 30" />
        <Kpi etiqueta="Respaldos al día" valor={`${todos.filter((g) => !g.atencion).length} de ${todos.length}`} nota="copia diaria cifrada" />
        <Kpi etiqueta="Incidencias abiertas" valor={abiertas.length} nota="abiertas o en proceso" />
      </section>

      <div className="rejilla rejilla--3-2">
        <section className="tarjeta" data-guia="tabla-gimnasios">
          <h2>Gimnasios <small>versión vigente {VERSION_ACTUAL}</small></h2>
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Gimnasio</th>
                  <th>Ciudad</th>
                  <th>Plan</th>
                  <th>Versión</th>
                  <th>Último respaldo</th>
                  <th>Sincronización</th>
                  <th className="num">Incid.</th>
                </tr>
              </thead>
              <tbody>
                {gimnasios.map((g) => (
                  <tr key={g.id} className={g.atencion ? "resaltado" : undefined}>
                    <td style={{ whiteSpace: "nowrap" }}><b>{g.nombre}</b></td>
                    <td>{g.ciudad}</td>
                    <td><span className={`insignia insignia--plano ${g.plan === "Esencial" ? "" : "insignia--info"}`}>{g.plan}</span></td>
                    <td className={g.version === VERSION_ACTUAL ? "mono" : "mono baja"}>{g.version}</td>
                    <td>{g.atencion ? <b className="baja">{g.respaldo}</b> : g.respaldo}</td>
                    <td className="tenue">{g.sincronizacion === "Local" ? "Solo local" : g.sincronizacion}</td>
                    <td className="num">{abiertas.filter((i) => i.gimnasio === g.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nota">El renglón sombreado necesita atención: no ha respaldado en 72 horas y usa una versión anterior.</p>
        </section>

        <section className="tarjeta" data-guia="incidencias">
          <h2>Incidencias de soporte</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {incidencias.map((i) => (
              <li key={i.id} style={{ display: "grid", gap: 4, paddingBottom: 10, borderBottom: "1px solid var(--linea)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <b>{i.titulo}</b>
                  <span className={`insignia ${ESTADO_INCIDENCIA[i.estado].clase}`}>{ESTADO_INCIDENCIA[i.estado].texto}</span>
                </div>
                <span className="pequeno tenue">{nombre(i.gimnasio)} · {i.responsable} · {i.hace}</span>
                {i.estado !== "resuelta" && (
                  <form action={resolverIncidencia}>
                    <input type="hidden" name="incidencia" value={i.id} />
                    <button className="boton boton--texto pequeno" type="submit">Marcar como resuelta</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
