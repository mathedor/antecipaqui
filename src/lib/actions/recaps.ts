"use server";

import { revalidatePath } from "next/cache";
import {
  calcularRecap,
  periodoRange,
  salvarRecap,
  type RecapPeriodo,
} from "@/lib/recaps";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getCurrentFundo } from "@/lib/actions/fundos";

/** Gera (ou regenera) um recap pra uma data de referência específica.
 *  - admin: gera global (e por fundo se informado fundoId)
 *  - fundo: gera apenas do próprio fundo
 *  data = qualquer dia dentro do período (a função descobre a janela exata). */
export async function gerarRecapAction(input: {
  periodo: RecapPeriodo;
  data: string; // YYYY-MM-DD
  escopo: "admin" | "fundo";
  fundoId?: string | null;
}): Promise<
  | { ok: true; inicio: string; fim: string; id: string }
  | { ok: false; error: string }
> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  if (input.escopo === "admin" && user.role !== "admin")
    return { ok: false, error: "Apenas admin" };
  if (input.escopo === "fundo" && user.role !== "fundo" && user.role !== "admin")
    return { ok: false, error: "Apenas fundo ou admin" };

  let fundoId: string | null = input.fundoId ?? null;
  if (input.escopo === "fundo") {
    if (user.role === "fundo") {
      const f = await getCurrentFundo();
      if (!f) return { ok: false, error: "Fundo não vinculado" };
      fundoId = f.id;
    } else if (!fundoId) {
      return { ok: false, error: "fundoId obrigatório pra escopo fundo" };
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data))
    return { ok: false, error: "Data inválida" };

  const ref = new Date(input.data + "T12:00:00Z");
  if (isNaN(ref.getTime())) return { ok: false, error: "Data inválida" };

  const { inicio, fim } = periodoRange(input.periodo, ref);

  const dados = await calcularRecap({
    periodo: input.periodo,
    inicio,
    fim,
    escopo: input.escopo,
    fundoId,
  });
  const r = await salvarRecap(dados);

  revalidatePath("/admin/relatorios/recaps");
  revalidatePath("/painel/recaps");

  return { ok: true, inicio, fim, id: r.id };
}
