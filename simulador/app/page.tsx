import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Inicio() {
  redirect((await cookies()).has("sesion") ? "/jefe" : "/login");
}
