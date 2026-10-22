import Link from "next/link";
import type { ReactNode } from "react";
import { cerrarSesion, elegirSucursal, reiniciarSimulacion } from "@/app/acciones";
import { GIMNASIO, SUCURSALES } from "@/lib/dominio";
import { alcanceActual, exigirSesion } from "@/lib/sesion";
import NavLateral, { type Modo } from "./NavLateral";

const MODOS: { modo: Modo; href: string; texto: string }[] = [
  { modo: "jefe", href: "/jefe", texto: "Vista del jefe" },
  { modo: "recepcion", href: "/recepcion", texto: "Punto de venta" },
  { modo: "soporte", href: "/soporte", texto: "Soporte Totonacapan" },
];

const CONTEXTO: Record<Modo, { titulo: string; detalle: string; estado: { texto: string; tipo: string }[] }> = {
  jefe: {
    titulo: `${GIMNASIO} · Tablero web`,
    detalle: "Plan Varias sucursales · consulta desde cualquier navegador",
    estado: [{ texto: "Datos sincronizados hace 2 min", tipo: "ok" }],
  },
  recepcion: {
    titulo: `${GIMNASIO} · Recepción`,
    detalle: "Usuario: jefe · turno vespertino · miércoles 21 de octubre de 2026 (hora simulada)",
    estado: [
      { texto: "Lector conectado", tipo: "ok" },
      { texto: "Operación local sin internet", tipo: "info" },
    ],
  },
  soporte: {
    titulo: "Panel de soporte · Totonacapan Digital",
    detalle: "Sesión: área de soporte · vista interna del proveedor",
    estado: [{ texto: "Servicio en la nube operando", tipo: "ok" }],
  },
};

export default async function Marco({ modo, children }: { modo: Modo; children: ReactNode }) {
  await exigirSesion();
  const alcance = await alcanceActual();
  const contexto = CONTEXTO[modo];
  // Recepción trabaja en una sola sucursal; el jefe además puede ver las tres juntas.
  const opciones = modo === "jefe" ? [...SUCURSALES, { id: "todas", nombre: "Todas" }] : SUCURSALES;
  const elegida = modo === "recepcion" && alcance === "todas" ? "pr" : alcance;

  return (
    <div className="app">
      <aside className="lateral">
        <Link className="lateral__marca" href="/jefe">
          <img src="/logo.svg" width={34} height={34} alt="" />
          <span>
            <strong>Volador</strong>
            <small>{modo === "soporte" ? "Totonacapan Digital" : GIMNASIO}</small>
          </span>
        </Link>
        <NavLateral modo={modo} />
        <div className="lateral__pie">
          <span>Sesión: <b>jefe</b></span>
          <form action={reiniciarSimulacion} data-guia="reiniciar">
            <button className="boton--texto" type="submit">Reiniciar simulación</button>
          </form>
          <form action={cerrarSesion}>
            <button className="boton--texto" type="submit">Cerrar sesión</button>
          </form>
        </div>
      </aside>

      <div className="principal">
        <header className="barra">
          <div className="barra__contexto">
            <strong>{contexto.titulo}</strong>
            <span>{contexto.detalle}</span>
          </div>

          <div className="estado-sistema" data-guia="estado">
            {contexto.estado.map((e) => (
              <span key={e.texto} className={`insignia insignia--${e.tipo}`}>{e.texto}</span>
            ))}
          </div>

          {modo !== "soporte" && (
            <form action={elegirSucursal} className="barra__grupo" data-guia="sucursal">
              <span className="barra__etiqueta">Sucursal</span>
              <div className="segmentado">
                {opciones.map((o) => (
                  <button key={o.id} type="submit" name="sucursal" value={o.id} aria-pressed={o.id === elegida}>
                    {o.nombre}
                  </button>
                ))}
              </div>
            </form>
          )}

          <div className="barra__grupo" data-guia="modo">
            <span className="barra__etiqueta">Modo de visión</span>
            <nav className="segmentado segmentado--modo" aria-label="Modo de visión">
              {MODOS.map((m) => (
                <Link key={m.modo} href={m.href} aria-current={m.modo === modo}>
                  {m.texto}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="contenido">{children}</main>
      </div>
    </div>
  );
}
