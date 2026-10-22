"use client";

import { useActionState } from "react";
import { identificar, type EstadoFormulario } from "@/app/acciones";

export type Caso = { valor: string; nombre: string; caso: string };

const LECTURA_MS = 900;

export function Huella() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M10 22a24 24 0 0 1 44 0" />
      <path d="M12 42c1-3 2-6 2-10a18 18 0 0 1 36 0c0 6-1 12-3 17" />
      <path d="M18 50c3-5 4-11 4-18a10 10 0 0 1 20 0c0 4 0 8-1 12" />
      <path d="M26 54c2-5 3-11 3-22a3 3 0 0 1 6 0c0 9-1 17-4 24" />
      <path d="M38 56c1.5-3 2.5-6 3-9" />
    </svg>
  );
}

export default function Lector({ casos }: { casos: Caso[] }) {
  // La pausa solo imita el tiempo de lectura del sensor; la validación ocurre en el servidor.
  const [, leer, leyendo] = useActionState(async (previo: EstadoFormulario, fd: FormData) => {
    await new Promise((listo) => setTimeout(listo, LECTURA_MS));
    return identificar(previo, fd);
  }, {});
  const [porNumero, buscar, buscando] = useActionState(identificar, {});

  return (
    <div className="tarjeta lector">
      <h2 className="tarjeta__titulo" style={{ margin: 0 }}>Lector de huella <small>simulado</small></h2>

      <div className={`lector__pad${leyendo ? " lector__pad--leyendo" : ""}`} aria-live="polite">
        <Huella />
        <p>{leyendo ? "Leyendo huella…" : "Coloque el dedo en el lector"}</p>
      </div>

      <form action={leer} className="lector" data-guia="lector">
        <input type="hidden" name="via" value="huella" />
        <fieldset className="casos">
          <legend>¿Quién pone el dedo?</legend>
          {casos.map((c, i) => (
            <label key={c.valor || "nadie"}>
              <input type="radio" name="socio" value={c.valor} defaultChecked={i === 0} />
              <span>
                <strong>{c.nombre}</strong>
                <small>{c.caso}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <button className="boton boton--ancho" type="submit" disabled={leyendo}>
          {leyendo ? "Leyendo…" : "Colocar huella"}
        </button>
      </form>

      <p className="separador">o bien</p>

      <form action={buscar} data-guia="alternativa" style={{ display: "grid", gap: 8 }}>
        <input type="hidden" name="via" value="numero" />
        <label className="campo">
          <span>Identificación alternativa: número de socio</span>
          <span style={{ display: "flex", gap: 8 }}>
            <input className="entrada" name="socio" inputMode="numeric" pattern="[0-9]+" required placeholder="Ej. 1004" />
            <button className="boton boton--secundario" type="submit" disabled={buscando}>Buscar</button>
          </span>
        </label>
        {porNumero.error && <p className="error" role="alert">{porNumero.error}</p>}
      </form>
    </div>
  );
}
