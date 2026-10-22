"use client";

import { useActionState, useState } from "react";
import { registrarSocio } from "@/app/acciones";
import { PLANES, pesos } from "@/lib/dominio";
import { Huella } from "./Lector";

const MUESTRAS = 3;

export default function AltaSocio() {
  const [estado, accion, guardando] = useActionState(registrarSocio, {});
  const [menor, setMenor] = useState(false);
  const [consiente, setConsiente] = useState(false);
  const [muestras, setMuestras] = useState(0);
  const puedeCapturar = consiente && !menor;
  const capturada = puedeCapturar && muestras === MUESTRAS;

  // Simula las tres lecturas que pide un lector real para armar la plantilla.
  async function capturar() {
    for (let i = 1; i <= MUESTRAS; i++) {
      await new Promise((listo) => setTimeout(listo, 450));
      setMuestras(i);
    }
  }

  return (
    <form action={accion} style={{ display: "grid", gap: 14 }}>
      <label className="campo">
        <span>Nombre completo</span>
        <input name="nombre" required minLength={5} maxLength={60} placeholder="Nombre y apellidos" />
      </label>
      <label className="campo">
        <span>Teléfono (10 dígitos)</span>
        <input name="telefono" required inputMode="tel" pattern="[0-9]{3} ?[0-9]{3} ?[0-9]{4}" placeholder="782 123 4567" />
      </label>
      <label className="campo">
        <span>Plan</span>
        <select name="plan" defaultValue="mensual">
          {Object.entries(PLANES).map(([id, p]) => (
            <option key={id} value={id}>
              {p.nombre} · {pesos(p.precio)}{p.horario ? " · de 6 a 14 h" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="casilla">
        <input type="checkbox" name="reglamento" required />
        <span>Acepta el reglamento y el aviso de privacidad.</span>
      </label>
      <label className="casilla">
        <input type="checkbox" name="menor" checked={menor} onChange={(e) => setMenor(e.target.checked)} />
        <span>Es menor de edad.</span>
      </label>

      <div className="captura" data-guia="consentimiento">
        <label className="casilla">
          <input type="checkbox" name="consentimiento" checked={consiente} disabled={menor} onChange={(e) => setConsiente(e.target.checked)} />
          <span>Da su <b>consentimiento expreso y por escrito</b> para usar su huella dactilar.</span>
        </label>
        {menor ? (
          <p className="pequeno tenue">A los menores no se les captura la huella. Entrará con su número de socio y fotografía.</p>
        ) : !consiente ? (
          <p className="pequeno tenue">Sin consentimiento no se captura la huella. Entrará con su número de socio y fotografía.</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ width: 40, color: capturada ? "var(--ok)" : "var(--tinta-3)" }}><Huella /></span>
              <div style={{ display: "grid", gap: 6 }}>
                <div className="captura__muestras" aria-hidden="true">
                  {Array.from({ length: MUESTRAS }, (_, i) => <i key={i} className={i < muestras ? "lista" : undefined} />)}
                </div>
                <span className="pequeno" aria-live="polite">
                  {capturada ? "Huella registrada. Se guarda la plantilla cifrada, nunca la imagen." : `Lectura ${muestras} de ${MUESTRAS}`}
                </span>
              </div>
            </div>
            {!capturada && (
              <button className="boton boton--secundario" type="button" onClick={capturar} disabled={muestras > 0}>
                {muestras > 0 ? "Capturando…" : "Capturar huella"}
              </button>
            )}
          </>
        )}
      </div>
      <input type="hidden" name="huella" value={capturada ? "1" : "0"} />

      {estado.error && <p className="error" role="alert">{estado.error}</p>}
      <button className="boton" type="submit" disabled={guardando}>
        {guardando ? "Guardando…" : "Registrar y cobrar membresía"}
      </button>
    </form>
  );
}
