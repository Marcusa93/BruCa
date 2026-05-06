import { redirect } from "next/navigation";

export default function AsistenteRedirect() {
  // El asistente ahora vive en el widget flotante (Cafe+IA), siempre visible.
  redirect("/dashboard");
}
