import type { Metadata } from "next";
import { iniciarSesion } from "@/app/acciones";
import { GIMNASIO } from "@/lib/dominio";
import { CLAVE_DEMO, USUARIO_DEMO } from "@/lib/sesion";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="acceso">
      <section className="acceso__lado">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src="/logo.svg" width={44} height={44} alt="" />
          <div>
            <strong style={{ color: "#fff", fontSize: 18 }}>Volador</strong>
            <div style={{ fontSize: 13, color: "#a9b5ea" }}>por Totonacapan Digital</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 18 }}>
          <h1>Socios, caja y acceso de tu gimnasio en un solo lugar.</h1>
          <p>Esta simulación muestra a {GIMNASIO}, un gimnasio ficticio con tres sucursales en el norte de Veracruz. Podrás verlo como:</p>
          <ul>
            <li><b>Jefe:</b> tablero de ingresos, asistencia, socios en riesgo y gastos de cada sucursal.</li>
            <li><b>Punto de venta:</b> recepción con lector de huella, alta de socios, ventas y corte de caja.</li>
            <li><b>Soporte:</b> el panel con el que Totonacapan Digital atiende a sus gimnasios.</li>
          </ul>
        </div>
        <p style={{ fontSize: 13, color: "#a9b5ea" }}>
          Trabajo de la asignatura Cultura Empresarial, ITSPR. Las personas, los gimnasios y las cifras son ficticios.
        </p>
      </section>

      <section className="acceso__formulario">
        <form action={iniciarSesion} className="acceso__caja">
          <div>
            <h2 style={{ fontSize: 24 }}>Iniciar sesión</h2>
            <p className="tenue">{GIMNASIO} · sistema de gestión</p>
          </div>

          {error && <p className="error" role="alert">Usuario o contraseña incorrectos. Revisa los datos de demostración.</p>}

          <label className="campo" data-guia="usuario">
            <span>Usuario</span>
            <input name="usuario" autoComplete="username" required autoFocus />
          </label>
          <label className="campo" data-guia="clave">
            <span>Contraseña</span>
            <input name="clave" type="password" autoComplete="current-password" required />
          </label>
          <button className="boton boton--ancho" type="submit" data-guia="entrar">Entrar</button>

          <p className="credenciales">
            Datos de demostración: usuario <b className="mono">{USUARIO_DEMO}</b> y contraseña <b className="mono">{CLAVE_DEMO}</b>.
          </p>
        </form>
      </section>
    </div>
  );
}
