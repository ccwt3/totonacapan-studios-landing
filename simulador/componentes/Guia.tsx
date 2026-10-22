"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type Paso = { texto: ReactNode; objetivo?: string; ir?: { href: string; texto: string } };

// Cada paso puede señalar un elemento marcado con data-guia="…".
const GUIA: Record<string, Paso[]> = {
  "/login": [
    { texto: <>Hola. Soy la guía de esta simulación de <b>Volador</b>, el sistema de Totonacapan Digital para administrar gimnasios. Te diré qué hacer en cada pantalla; puedes minimizarme cuando quieras.</> },
    { objetivo: "usuario", texto: <>En <b>Usuario</b> escribe <b>jefe</b>.</> },
    { objetivo: "clave", texto: <>En <b>Contraseña</b> escribe <b>123456789</b>.</> },
    { objetivo: "entrar", texto: <>Pulsa <b>Entrar</b>. Entrarás como el dueño de Gimnasio Halcón, que tiene tres sucursales.</> },
  ],
  "/jefe": [
    { objetivo: "kpis", texto: <>Esta es la <b>Vista del jefe</b>: el tablero web del dueño. Arriba, cuatro indicadores del mes comparados con el mismo periodo de septiembre.</> },
    { objetivo: "sucursal", texto: <>En <b>Sucursal</b> eliges Poza Rica Centro, Papantla, Tuxpan o <b>Todas</b>. Todo el tablero se recalcula.</> },
    { objetivo: "graficas", texto: <>Ingresos de cada día y asistencia por hora y día. Pasa el cursor sobre una barra o una celda para ver el dato.</> },
    { objetivo: "riesgo", texto: <><b>Socios en riesgo</b>: tienen la membresía activa pero no vienen desde hace 14 días. <b>Contactar</b> muestra un mensaje sugerido para recuperarlos.</> },
    { objetivo: "menu-gastos", texto: <>Ahora abre <b>Gastos</b> en el menú lateral para ver el reporte de gastos de cada sucursal.</>, ir: { href: "/jefe/gastos", texto: "Ir a Gastos" } },
  ],
  "/jefe/gastos": [
    { objetivo: "balance", texto: <>El reporte de gastos resume ingresos, gastos y utilidad de un mes cerrado.</> },
    { objetivo: "meses", texto: <>Cambia de mes aquí. Con la sucursal en <b>Todas</b> verás la comparación entre sucursales; revisa cómo le fue a Papantla en julio.</> },
    { objetivo: "categorias", texto: <>Gastos por categoría, de mayor a menor, con su cambio frente al mes anterior.</> },
    { objetivo: "cortes", texto: <>Diferencias de corte por cajero: los faltantes de cada turno quedan a la vista del dueño.</> },
    { objetivo: "modo", texto: <>Pasemos a la recepción. En <b>Modo de visión</b> elige <b>Punto de venta</b>.</>, ir: { href: "/recepcion", texto: "Ir al punto de venta" } },
  ],
  "/recepcion": [
    { objetivo: "estado", texto: <>Esta es la pantalla de recepción. Siempre muestra el estado del lector y que la sucursal opera de forma local, aunque se caiga el internet.</> },
    { objetivo: "lector", texto: <>Elige quién pone el dedo y pulsa <b>Colocar huella</b>. Empieza con el socio de <b>Membresía activa</b>.</> },
    { objetivo: "ficha", texto: <>La ficha muestra la foto (aquí en blanco), el plan, la vigencia y el resultado. Ahora prueba con <b>Membresía vencida</b> o con el <b>Plan matutino</b>: verás el motivo del rechazo.</> },
    { objetivo: "alternativa", texto: <>Quien no registró su huella se identifica con su <b>número de socio</b>, y la recepción compara la fotografía.</> },
    { objetivo: "acciones", texto: <>Con el socio vencido en pantalla, pulsa <b>Renovar membresía</b>. Te llevará a Ventas con la membresía ya en el ticket.</> },
    { objetivo: "accesos", texto: <>Cada intento queda en <b>Últimos accesos</b> con su motivo. Los que registras tú aparecen en azul.</> },
  ],
  "/recepcion/ventas": [
    { objetivo: "catalogo", texto: <>Este es el punto de venta. Toca un producto para agregarlo al ticket; las membresías aparecen cuando eliges un socio.</> },
    { objetivo: "metodo", texto: <>Elige el método de pago. Con tarjeta se cobra en la terminal del banco; el sistema nunca recibe los datos de la tarjeta.</> },
    { objetivo: "ticket", texto: <>Si aplicas un descuento, el motivo es obligatorio. Pulsa <b>Cobrar</b>: la venta recibe un folio con el formato sucursal–caja–consecutivo.</> },
    { objetivo: "menu-recepcion", texto: <>Si renovaste a un socio, vuelve a <b>Recepción</b> y coloca su huella otra vez: ahora pasará. Después sigue con <b>Socios</b>.</>, ir: { href: "/recepcion/socios", texto: "Ir a Socios" } },
  ],
  "/recepcion/socios": [
    { objetivo: "alta", texto: <>Da de alta a un socio nuevo: inventa un nombre y un teléfono de 10 dígitos.</> },
    { objetivo: "consentimiento", texto: <>La huella solo se captura con <b>consentimiento expreso</b>. Márcalo y pulsa <b>Capturar huella</b>. A los menores de edad no se les captura.</> },
    { objetivo: "alta", texto: <>Pulsa <b>Registrar y cobrar membresía</b>. Pasarás a Ventas con su primera membresía; cóbrala y regresa a Recepción para probar su huella.</> },
    { objetivo: "menu-corte", texto: <>Al terminar el turno se hace el corte de caja. Abre <b>Corte de caja</b>.</>, ir: { href: "/recepcion/corte", texto: "Ir a Corte de caja" } },
  ],
  "/recepcion/corte": [
    { objetivo: "declarar", texto: <>Es un corte <b>ciego</b>: escribe cuánto efectivo hay sin ver lo esperado. Prueba con una cantidad redonda, por ejemplo 5000.</> },
    { objetivo: "resultado-corte", texto: <>El sistema compara y dice si el corte cuadra, si falta o si sobra. Las diferencias llegan al reporte del dueño.</> },
    { objetivo: "modo", texto: <>Regresa a la <b>Vista del jefe</b>: <b>Ingresos del mes</b> y la barra de hoy ya incluyen tus ventas.</>, ir: { href: "/jefe", texto: "Ir a la vista del jefe" } },
    { objetivo: "modo", texto: <>Por último, el modo <b>Soporte Totonacapan</b> muestra cómo la empresa atiende a todos sus gimnasios.</>, ir: { href: "/soporte", texto: "Ir a Soporte" } },
  ],
  "/soporte": [
    { objetivo: "kpis-soporte", texto: <>Este es el panel interno de Totonacapan Digital: sucursales atendidas, respaldos al día e incidencias abiertas.</> },
    { objetivo: "tabla-gimnasios", texto: <>El renglón sombreado necesita atención: Costa Activa no ha respaldado en 72 horas y tiene una versión anterior.</> },
    { objetivo: "incidencias", texto: <>Cada incidencia tiene un responsable del equipo. Marca una como resuelta.</> },
    { objetivo: "reiniciar", texto: <>Fin del recorrido. Con <b>Reiniciar simulación</b> borras lo que hiciste y empiezas de nuevo; también puedes explorar libremente.</> },
  ],
};

const CLAVE_MINIMIZADA = "volador-guia-minimizada";

export default function Guia() {
  const ruta = usePathname();
  const pasos = GUIA[ruta];
  const [paso, setPaso] = useState(0);
  const [abierta, setAbierta] = useState(true);

  useEffect(() => setPaso(0), [ruta]);

  // La guía va arriba a la derecha, pero nunca encima del aviso ni de la barra superior,
  // donde están "Sucursal" y "Modo de visión". Al bajar, sube hasta la esquina.
  useEffect(() => {
    const ajustar = () => {
      const fondo = Math.max(...[...document.querySelectorAll(".listones, .barra")].map((el) => el.getBoundingClientRect().bottom));
      document.documentElement.style.setProperty("--guia-top", `${Math.max(16, fondo + 16)}px`);
    };
    ajustar();
    window.addEventListener("scroll", ajustar, { passive: true });
    window.addEventListener("resize", ajustar);
    return () => {
      window.removeEventListener("scroll", ajustar);
      window.removeEventListener("resize", ajustar);
    };
  }, [ruta]);

  useEffect(() => {
    try {
      setAbierta(localStorage.getItem(CLAVE_MINIMIZADA) !== "1");
    } catch {
      // Sin almacenamiento la guía simplemente empieza abierta.
    }
  }, []);

  const objetivo = abierta ? pasos?.[paso]?.objetivo : undefined;
  useEffect(() => {
    if (!objetivo) return;
    const el = document.querySelector(`[data-guia="${objetivo}"]`);
    if (!el) return;
    el.classList.add("guia-resalte");
    const caja = el.getBoundingClientRect();
    if (caja.top < 0 || caja.bottom > window.innerHeight) el.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => el.classList.remove("guia-resalte");
  }, [objetivo, ruta]);

  if (!pasos) return null;

  const alternar = (valor: boolean) => {
    setAbierta(valor);
    try {
      localStorage.setItem(CLAVE_MINIMIZADA, valor ? "0" : "1");
    } catch {}
  };

  if (!abierta) {
    return (
      <button className="guia-boton" type="button" onClick={() => alternar(true)}>
        Guía · paso {Math.min(paso, pasos.length - 1) + 1} de {pasos.length}
      </button>
    );
  }

  const actual = pasos[Math.min(paso, pasos.length - 1)];
  const ultimo = paso >= pasos.length - 1;

  return (
    <aside className="guia" aria-label="Guía de la simulación" aria-live="polite">
      <div className="guia__cabeza">
        <strong>Guía</strong>
        <span>Paso {paso + 1} de {pasos.length}</span>
        <button type="button" onClick={() => alternar(false)} aria-label="Minimizar la guía">–</button>
      </div>
      <div className="guia__cuerpo">
        <div className="guia__pasos" aria-hidden="true">
          {pasos.map((_, i) => <i key={i} className={i <= paso ? "hecho" : undefined} />)}
        </div>
        <p>{actual.texto}</p>
        <div className="guia__botones">
          <button className="boton boton--texto" type="button" onClick={() => setPaso(paso - 1)} disabled={paso === 0}>
            Anterior
          </button>
          {actual.ir && (
            <Link className="boton boton--secundario boton--chico" href={actual.ir.href}>{actual.ir.texto}</Link>
          )}
          {!ultimo ? (
            <button className="boton boton--chico" type="button" onClick={() => setPaso(paso + 1)}>Siguiente</button>
          ) : (
            !actual.ir && <button className="boton boton--chico" type="button" onClick={() => alternar(false)}>Entendido</button>
          )}
        </div>
      </div>
    </aside>
  );
}
