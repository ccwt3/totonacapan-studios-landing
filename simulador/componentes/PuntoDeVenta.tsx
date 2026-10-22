"use client";

import { useActionState, useState } from "react";
import { cobrar } from "@/app/acciones";
import { pesos } from "@/lib/dominio";

export type Articulo = { id: string; nombre: string; precio: number; detalle?: string };

const METODOS = [
  { id: "efectivo", texto: "Efectivo" },
  { id: "tarjeta", texto: "Tarjeta" },
  { id: "transferencia", texto: "Transferencia" },
];

/** El ticket vive en el navegador para que agregar artículos sea inmediato; el cobro lo valida el servidor. */
export default function PuntoDeVenta({ articulos, inicial, socio, tope }: {
  articulos: Articulo[];
  inicial?: string;
  socio: { id: number; nombre: string } | null;
  tope: number;
}) {
  const [ticket, setTicket] = useState<Record<string, number>>(inicial ? { [inicial]: 1 } : {});
  const [metodo, setMetodo] = useState("efectivo");
  const [descuento, setDescuento] = useState(0);
  const [estado, accion, cobrando] = useActionState(cobrar, {});

  const lineas = Object.entries(ticket).filter(([, cantidad]) => cantidad > 0);
  const precio = (id: string) => articulos.find((a) => a.id === id)?.precio ?? 0;
  const subtotal = lineas.reduce((t, [id, cantidad]) => t + precio(id) * cantidad, 0);
  const total = subtotal - Math.round((subtotal * descuento) / 100);

  const cambiar = (id: string, delta: number) =>
    setTicket((t) => {
      const maximo = id === "adeudo" ? 1 : 12;
      return { ...t, [id]: Math.min(maximo, Math.max(0, (t[id] ?? 0) + delta)) };
    });

  return (
    <div className="rejilla rejilla--3-2">
      <section className="tarjeta" data-guia="catalogo">
        <h2>Catálogo <small>toca para agregar al ticket</small></h2>
        <div className="catalogo">
          {articulos.map((a) => (
            <button key={a.id} type="button" className={`producto${a.detalle ? " producto--membresia" : ""}`} onClick={() => cambiar(a.id, 1)}>
              <strong>{a.nombre}</strong>
              <span>{pesos(a.precio)}{a.detalle ? ` · ${a.detalle}` : ""}</span>
            </button>
          ))}
        </div>
        {!socio && <p className="nota">Las membresías y los adeudos aparecen al elegir un socio.</p>}
      </section>

      <form action={accion} className="tarjeta ticket" data-guia="ticket">
        <h2 style={{ margin: 0 }}>Ticket <small>{socio ? `${socio.nombre} · #${socio.id}` : "venta de mostrador"}</small></h2>
        <input type="hidden" name="lineas" value={JSON.stringify(lineas)} />
        <input type="hidden" name="socio" value={socio?.id ?? ""} />

        {lineas.length === 0 ? (
          <p className="tenue pequeno">El ticket está vacío.</p>
        ) : (
          <ul className="ticket__lineas">
            {lineas.map(([id, cantidad]) => (
              <li key={id} className="ticket__linea">
                <span>{articulos.find((a) => a.id === id)?.nombre}</span>
                <span className="ticket__cantidad">
                  <button type="button" onClick={() => cambiar(id, -1)} aria-label="Quitar uno">−</button>
                  <span className="cifra">{cantidad}</span>
                  <button type="button" onClick={() => cambiar(id, 1)} aria-label="Agregar uno">+</button>
                </span>
                <span className="cifra">{pesos(precio(id) * cantidad)}</span>
              </li>
            ))}
          </ul>
        )}

        <fieldset className="metodos" data-guia="metodo" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="barra__etiqueta" style={{ marginBottom: 6 }}>Método de pago</legend>
          {METODOS.map((m) => (
            <label key={m.id}>
              <input type="radio" name="metodo" value={m.id} checked={metodo === m.id} onChange={() => setMetodo(m.id)} />
              {m.texto}
            </label>
          ))}
        </fieldset>
        {metodo === "tarjeta" && (
          <p className="aviso-tolerancia" style={{ margin: 0 }}>Cobra en la terminal bancaria del gimnasio. Volador solo registra el monto; nunca recibe los datos de la tarjeta.</p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8 }}>
          <label className="campo">
            <span>Descuento %</span>
            <input name="descuento" type="number" min={0} max={tope} value={descuento} onChange={(e) => setDescuento(Math.min(tope, Math.max(0, Math.trunc(Number(e.target.value) || 0))))} />
          </label>
          <label className="campo">
            <span>Motivo {descuento > 0 ? "(obligatorio)" : ""}</span>
            <input name="motivo" required={descuento > 0} disabled={descuento === 0} maxLength={60} placeholder={descuento > 0 ? "Ej. promoción de aniversario" : `Tope de tu rol: ${tope} %`} />
          </label>
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          {descuento > 0 && (
            <div className="pequeno tenue" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Subtotal {pesos(subtotal)} · descuento {descuento} %</span>
              <span>−{pesos(subtotal - total)}</span>
            </div>
          )}
          <div className="ticket__total"><span>Total</span><span className="cifra">{pesos(total)}</span></div>
        </div>

        {estado.error && <p className="error" role="alert">{estado.error}</p>}
        <button className="boton" type="submit" disabled={cobrando || lineas.length === 0}>
          {cobrando ? "Cobrando…" : `Cobrar ${pesos(total)}`}
        </button>
      </form>
    </div>
  );
}
