import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import Guia from "@/componentes/Guia";
import "./globals.css";

const texto = Space_Grotesk({ subsets: ["latin"], variable: "--f-texto" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--f-mono" });

export const metadata: Metadata = {
  title: { default: "Volador · Simulación", template: "%s · Volador" },
  description: "Simulación interactiva de Volador, la plataforma de Totonacapan Digital para administrar gimnasios. Proyecto escolar con datos ficticios.",
  icons: "/logo.svg",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX" className={`${texto.variable} ${mono.variable}`}>
      <body>
        <p className="aviso-escolar" role="note">
          <span><strong>Proyecto escolar</strong> · Instituto Tecnológico Superior de Poza Rica · Cultura Empresarial. Simulación con datos ficticios; no es un producto comercial.</span>
        </p>
        <div className="listones" aria-hidden="true" />
        {children}
        <Guia />
      </body>
    </html>
  );
}
