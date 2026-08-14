"use server";

import { marcarNaAna, type PagamentosAna } from "@/lib/custosAna";

/* O ✓ do mês vive no controle da Diretório Web (é a conta de lá). Daqui a
   gente só avisa — e o token nunca chega ao navegador. */
export async function marcarPagamentoNaAna(
  tipo: "custos" | "dev", mes: string, pago: boolean,
): Promise<PagamentosAna | null> {
  if (!/^\d{4}-\d{2}$/.test(mes)) return null;
  return marcarNaAna("antecipaqui", tipo, mes, pago);
}
