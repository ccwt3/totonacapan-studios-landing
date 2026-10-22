import type { ReactNode } from "react";
import Marco from "@/componentes/Marco";

export default function Layout({ children }: { children: ReactNode }) {
  return <Marco modo="recepcion">{children}</Marco>;
}
