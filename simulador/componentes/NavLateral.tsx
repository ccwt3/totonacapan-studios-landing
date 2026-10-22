"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Modo = "jefe" | "recepcion" | "soporte";

// Trazos de 24 × 24 para los iconos del menú.
const ICONOS = {
  resumen: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  gastos: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  recepcion: "M12 11c0 3-1 6-3 8M8 7.5A5 5 0 0 1 17 10c0 2 0 4-1 6M5 12c0-1.5.4-2.9 1.2-4M15.5 20c.6-1.3 1-2.6 1.2-4M12 11v1",
  socios: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8",
  ventas: "M3 4h2l2.4 11h11L21 7H6.2M9 20h.01M18 20h.01",
  corte: "M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9v.01M18 15v.01",
  gimnasios: "M4 7h16M4 12h16M4 17h10",
};

const MENUS: Record<Modo, { titulo: string; enlaces: { href: string; texto: string; icono: keyof typeof ICONOS }[] }> = {
  jefe: {
    titulo: "Tablero del dueño",
    enlaces: [
      { href: "/jefe", texto: "Resumen", icono: "resumen" },
      { href: "/jefe/gastos", texto: "Gastos", icono: "gastos" },
    ],
  },
  recepcion: {
    titulo: "Punto de venta",
    enlaces: [
      { href: "/recepcion", texto: "Recepción", icono: "recepcion" },
      { href: "/recepcion/socios", texto: "Socios", icono: "socios" },
      { href: "/recepcion/ventas", texto: "Ventas", icono: "ventas" },
      { href: "/recepcion/corte", texto: "Corte de caja", icono: "corte" },
    ],
  },
  soporte: {
    titulo: "Soporte",
    enlaces: [{ href: "/soporte", texto: "Gimnasios", icono: "gimnasios" }],
  },
};

export default function NavLateral({ modo }: { modo: Modo }) {
  const ruta = usePathname();
  const menu = MENUS[modo];
  return (
    <nav aria-label={menu.titulo}>
      <p className="lateral__titulo">{menu.titulo}</p>
      <ul>
        {menu.enlaces.map((e) => (
          <li key={e.href}>
            <Link href={e.href} aria-current={ruta === e.href ? "page" : undefined} data-guia={`menu-${e.icono}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ICONOS[e.icono]} />
              </svg>
              {e.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
