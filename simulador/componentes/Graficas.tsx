// Gráficas hechas con HTML y CSS en el servidor. El atributo `title` da el
// detalle al pasar el cursor y cada gráfica tiene su descripción para lectores de pantalla.

import type { ReactNode } from "react";
import { pesos, porcentaje } from "@/lib/dominio";

/** Marcas redondas para el eje: el tope es el primer múltiplo "limpio" que cubre el máximo. */
function marcas(maximo: number, pasos = 4) {
  const bruto = Math.max(maximo, 1) / pasos;
  const magnitud = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * magnitud).find((p) => p * pasos >= maximo)!;
  return Array.from({ length: pasos + 1 }, (_, i) => paso * (pasos - i));
}

const pesosCortos = (centavos: number) => {
  const p = centavos / 100;
  return p >= 1000 ? `$${(p / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k` : `$${p}`;
};

export function Kpi({ etiqueta, valor, actual, anterior, nota, secundario }: {
  etiqueta: string;
  valor: ReactNode;
  actual?: number;
  anterior?: number;
  nota?: ReactNode;
  secundario?: boolean;
}) {
  const cambio = actual !== undefined && anterior ? (actual - anterior) / anterior : null;
  return (
    <div className={`tarjeta kpi${secundario ? " kpi--secundario" : ""}`}>
      <span className="kpi__etiqueta">{etiqueta}</span>
      <span className="kpi__valor">{valor}</span>
      <span className="kpi__nota">
        {cambio !== null && (
          <>
            <span className={cambio >= 0 ? "sube" : "baja"}>
              {cambio >= 0 ? "▲ +" : "▼ "}{porcentaje(cambio)}
            </span>{" "}
            frente al mes anterior
          </>
        )}
        {nota}
      </span>
    </div>
  );
}

export function Columnas({ datos, descripcion }: {
  datos: { etiqueta: string; valor: number; detalle: string; destacado?: boolean }[];
  descripcion: string;
}) {
  const ejes = marcas(Math.max(...datos.map((d) => d.valor)));
  const tope = ejes[0];
  return (
    <figure className="columnas" role="img" aria-label={descripcion} style={{ margin: 0 }}>
      <div className="columnas__eje" aria-hidden="true">
        {ejes.map((m) => <span key={m}>{pesosCortos(m)}</span>)}
      </div>
      <div className="columnas__area">
        {datos.map((d) => (
          <div
            key={d.etiqueta}
            className={`columnas__barra${d.destacado ? " columnas__barra--hoy" : ""}`}
            style={{ height: `${(d.valor / tope) * 100}%` }}
            title={`${d.detalle}: ${pesos(d.valor)}`}
          >
            {d.destacado && <span className="columnas__valor">{pesosCortos(d.valor)}</span>}
          </div>
        ))}
      </div>
      <div className="columnas__x" aria-hidden="true">
        {datos.map((d, i) => <span key={d.etiqueta}>{i === 0 || (i + 1) % 5 === 0 || d.destacado ? d.etiqueta : ""}</span>)}
      </div>
    </figure>
  );
}

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export function Calor({ matriz, horas }: { matriz: number[][]; horas: number[] }) {
  const maximo = Math.max(...matriz.flat());
  const paso = (v: number) => Math.max(1, Math.ceil((v / maximo) * 5));
  return (
    <>
      <div className="calor" role="img" aria-label="Mapa de calor: la asistencia se concentra de 6 a 8 y de 18 a 20 horas entre semana; el domingo es el día más bajo.">
        {matriz.map((fila, h) => (
          <div key={horas[h]} style={{ display: "contents" }}>
            <span className="calor__fila">{horas[h]} h</span>
            {fila.map((v, d) => (
              <span
                key={d}
                className="calor__celda"
                style={{ background: `var(--calor-${paso(v)})` }}
                title={`${DIAS_LARGOS[d]}, ${horas[h]}:00 a ${horas[h] + 2}:00 · ${v} entradas por semana`}
              />
            ))}
          </div>
        ))}
        <span />
        {DIAS.map((d, i) => <span key={i} className="calor__dia">{d}</span>)}
      </div>
      <div className="calor__escala" aria-hidden="true">
        Menos {[1, 2, 3, 4, 5].map((n) => <i key={n} style={{ background: `var(--calor-${n})` }} />)} Más
      </div>
    </>
  );
}

export type Serie = { valor: number; clase: string; nombre: string };

/** Barras horizontales; cada fila puede llevar una o varias series. */
export function BarrasH({ filas, descripcion }: { filas: { etiqueta: string; barras: Serie[] }[]; descripcion: string }) {
  const maximo = Math.max(...filas.flatMap((f) => f.barras.map((b) => b.valor)));
  return (
    <div className="barras-h" role="img" aria-label={descripcion}>
      {filas.map((f) => (
        <div key={f.etiqueta} className="barras-h__fila">
          <span className="barras-h__etiqueta">{f.etiqueta}</span>
          <div className="barras-h__grupo">
            {f.barras.map((b) => (
              <div key={b.nombre} className="barras-h__pista" title={`${f.etiqueta} · ${b.nombre}: ${pesos(b.valor)}`}>
                <span className={`barras-h__barra ${b.clase}`} style={{ width: `calc((100% - 92px) * ${b.valor / maximo})` }} />
                <span className="barras-h__valor">{pesosCortos(b.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
