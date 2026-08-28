"use server";

/**
 * Revelar e gerar as CHAVES DE CONEXÃO de um fundo.
 *
 * As chaves são segredos COMPARTILHADOS (HMAC): o fundo precisa da mesma
 * string do nosso lado pra assinar o que manda. Guardar sem poder mostrar
 * de novo obrigaria a rodar chave a cada consulta perdida — por isso aqui
 * elas podem ser reveladas, sempre por ato explícito e sempre com registro
 * no audit log.
 *
 * Quem pode: admin (qualquer fundo) e o próprio fundo (só o dele).
 */

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundos, type Fundo } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getFundoDoUsuario } from "@/lib/fundo-acesso";
import { audit } from "@/lib/audit";
import { CHAVES_CONEXAO, type ChaveConexaoId } from "@/lib/fundo-conexao";

/** Onde cada chave mora na tabela de fundos — leitura e escrita explícitas
 *  pra não depender de índice dinâmico em cima do schema do Drizzle. */
const LER: Record<ChaveConexaoId, (f: Fundo) => string | null> = {
  integracao: (f) => f.integracaoWebhookSecret,
  cobranca: (f) => f.cobrancaWebhookSecret,
  contrato_assinatura: (f) => f.contratoAssinaturaWebhookSecret,
};

const GRAVAR: Record<
  ChaveConexaoId,
  (v: string) => Partial<typeof fundos.$inferInsert>
> = {
  integracao: (v) => ({ integracaoWebhookSecret: v }),
  cobranca: (v) => ({ cobrancaWebhookSecret: v }),
  contrato_assinatura: (v) => ({ contratoAssinaturaWebhookSecret: v }),
};

/** Resolve o fundo que o usuário atual pode ver. Admin escolhe pelo id;
 *  usuário de fundo sempre cai no próprio, mesmo que mande outro id. */
async function fundoAutorizado(fundoId?: string): Promise<Fundo> {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");

  if (user.role === "fundo") {
    const f = await getFundoDoUsuario(user.id);
    if (!f) throw new Error("Usuário não está vinculado a um fundo");
    return f;
  }

  if (user.role === "admin") {
    if (!fundoId) throw new Error("Informe o fundo");
    const [f] = await db
      .select()
      .from(fundos)
      .where(eq(fundos.id, fundoId))
      .limit(1);
    if (!f) throw new Error("Fundo não encontrado");
    return f;
  }

  throw new Error("Sem permissão");
}

export type ChavesReveladas = Partial<Record<ChaveConexaoId, string | null>>;

/** Devolve o valor das chaves configuradas. Chave ausente vem null. */
export async function revelarChavesConexaoAction(
  fundoId?: string,
): Promise<ChavesReveladas> {
  const fundo = await fundoAutorizado(fundoId);

  const out: ChavesReveladas = {};
  for (const id of CHAVES_CONEXAO) {
    out[id] = LER[id](fundo) ?? null;
  }

  await audit({
    action: "revelar_chaves_conexao",
    targetType: "fundo",
    targetId: fundo.id,
    targetLabel: fundo.nomeFantasia ?? fundo.razaoSocial,
  });

  return out;
}

export type GerarChaveState =
  | { ok: true; chave: ChaveConexaoId; valor: string }
  | { ok: false; error: string };

/**
 * Gera uma chave. `substituir` é obrigatório pra trocar uma que já existe —
 * trocar quebra a conexão até o fundo atualizar do lado dele, então não pode
 * acontecer por clique distraído.
 */
export async function gerarChaveConexaoAction(
  chave: ChaveConexaoId,
  fundoId?: string,
  substituir = false,
): Promise<GerarChaveState> {
  if (!(CHAVES_CONEXAO as readonly string[]).includes(chave)) {
    return { ok: false, error: "Chave desconhecida" };
  }

  let fundo: Fundo;
  try {
    fundo = await fundoAutorizado(fundoId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const atual = LER[chave](fundo);
  if (atual && !substituir) {
    return {
      ok: false,
      error: "Já existe uma chave aqui. Use 'trocar chave' pra substituir.",
    };
  }

  const valor = crypto.randomBytes(32).toString("base64url");
  await db
    .update(fundos)
    .set(GRAVAR[chave](valor))
    .where(eq(fundos.id, fundo.id));

  await audit({
    action: atual ? "trocar_chave_conexao" : "gerar_chave_conexao",
    targetType: "fundo",
    targetId: fundo.id,
    targetLabel: fundo.nomeFantasia ?? fundo.razaoSocial,
    metadata: { chave },
  });

  revalidatePath("/painel/webhooks");
  revalidatePath(`/admin/fundos/${fundo.id}/integracao`);
  return { ok: true, chave, valor };
}
