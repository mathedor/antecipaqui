import { redirect } from "next/navigation";

/** Rota antiga preservada pra compat: redireciona pra aba de importar
 *  dentro de /painel/operacoes/nova. */
export default function ImportarPage() {
  redirect("/painel/operacoes/nova?tab=importar");
}
