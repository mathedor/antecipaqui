"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  atendimentoEventos,
  atendimentos,
  consultasCredito,
} from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import { getCurrentImobMembership } from "@/lib/actions/imobiliaria-membros";
import { audit } from "@/lib/audit";
import type {
  AtendimentoStatus,
  EventoTipo,
} from "@/lib/atendimento-types";

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown[] }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

/* ============================================================
   LISTAR atendimentos (com permissão)
   ============================================================ */

export async function listAtendimentos() {
  const me = await getCurrentImobMembership();
  if (!me) return [];

  const user = await requireActiveUser();
  const onlyMine = !me.canSeeAllAtendimentos;

  const rows = await db
    .select()
    .from(atendimentos)
    .where(
      onlyMine
        ? and(
            eq(atendimentos.imobiliariaId, me.imobiliariaId),
            eq(atendimentos.corretorUserId, user.id),
          )
        : eq(atendimentos.imobiliariaId, me.imobiliariaId),
    )
    .orderBy(desc(atendimentos.updatedAt));
  return rows;
}

export async function getAtendimento(id: string) {
  const me = await getCurrentImobMembership();
  if (!me) return null;
  const user = await requireActiveUser();

  const [row] = await db
    .select()
    .from(atendimentos)
    .where(
      and(
        eq(atendimentos.id, id),
        eq(atendimentos.imobiliariaId, me.imobiliariaId),
      ),
    )
    .limit(1);
  if (!row) return null;

  // Corretor membro só vê o atendimento se for o responsável
  if (!me.canSeeAllAtendimentos && row.corretorUserId !== user.id)
    return null;

  return row;
}

export async function listEventos(atendimentoId: string) {
  // valida acesso antes
  const a = await getAtendimento(atendimentoId);
  if (!a) return [];

  return db
    .select()
    .from(atendimentoEventos)
    .where(eq(atendimentoEventos.atendimentoId, atendimentoId))
    .orderBy(desc(atendimentoEventos.createdAt));
}

/* ============================================================
   CRUD básico
   ============================================================ */

export type CreateAtendimentoInput = {
  corretorUserId?: string; // default = user logado
  status?: AtendimentoStatus;
  compradorNome: string;
  compradorEmail?: string;
  compradorTelefone?: string;
  compradorDocumento?: string;
  coletaToken?: string;
  imovelDescricao?: string;
  imovelEndereco?: string;
  imovelCidade?: string;
  imovelUf?: string;
  imovelValor?: number;
  comissaoEstimada?: number;
};

export async function createAtendimento(
  input: CreateAtendimentoInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const me = await getCurrentImobMembership();
  if (!me)
    return { ok: false, error: "Sem vínculo com imobiliária" };
  const user = await requireActiveUser();

  if (!input.compradorNome.trim())
    return { ok: false, error: "Nome do comprador obrigatório" };

  // Corretor membro só pode criar atendimento pra si mesmo
  const corretorUserId =
    me.canSeeAllAtendimentos && input.corretorUserId
      ? input.corretorUserId
      : user.id;

  const [row] = await db
    .insert(atendimentos)
    .values({
      imobiliariaId: me.imobiliariaId,
      corretorUserId,
      status: input.status ?? "contato_inicial",
      compradorNome: input.compradorNome.trim(),
      compradorEmail: input.compradorEmail?.trim() || null,
      compradorTelefone: input.compradorTelefone?.trim() || null,
      compradorDocumento:
        input.compradorDocumento?.replace(/\D/g, "") || null,
      coletaToken: input.coletaToken?.trim() || null,
      imovelDescricao: input.imovelDescricao?.trim() || null,
      imovelEndereco: input.imovelEndereco?.trim() || null,
      imovelCidade: input.imovelCidade?.trim() || null,
      imovelUf: input.imovelUf?.trim().toUpperCase().slice(0, 2) || null,
      imovelValor:
        input.imovelValor && input.imovelValor > 0
          ? String(input.imovelValor.toFixed(2))
          : null,
      comissaoEstimada:
        input.comissaoEstimada && input.comissaoEstimada > 0
          ? String(input.comissaoEstimada.toFixed(2))
          : null,
    })
    .returning({ id: atendimentos.id });

  revalidatePath("/painel/atendimentos");
  return { ok: true, id: row.id };
}

export async function updateAtendimento(input: {
  id: string;
  compradorNome?: string;
  compradorEmail?: string;
  compradorTelefone?: string;
  compradorDocumento?: string;
  imovelDescricao?: string;
  imovelEndereco?: string;
  imovelCidade?: string;
  imovelUf?: string;
  imovelValor?: number | null;
  comissaoEstimada?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const a = await getAtendimento(input.id);
  if (!a) return { ok: false, error: "Atendimento não encontrado" };

  const updates: Partial<typeof atendimentos.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.compradorNome != null)
    updates.compradorNome = input.compradorNome.trim();
  if (input.compradorEmail !== undefined)
    updates.compradorEmail = input.compradorEmail.trim() || null;
  if (input.compradorTelefone !== undefined)
    updates.compradorTelefone = input.compradorTelefone.trim() || null;
  if (input.compradorDocumento !== undefined)
    updates.compradorDocumento =
      input.compradorDocumento.replace(/\D/g, "") || null;
  if (input.imovelDescricao !== undefined)
    updates.imovelDescricao = input.imovelDescricao.trim() || null;
  if (input.imovelEndereco !== undefined)
    updates.imovelEndereco = input.imovelEndereco.trim() || null;
  if (input.imovelCidade !== undefined)
    updates.imovelCidade = input.imovelCidade.trim() || null;
  if (input.imovelUf !== undefined)
    updates.imovelUf = input.imovelUf.trim().toUpperCase().slice(0, 2) || null;
  if (input.imovelValor !== undefined)
    updates.imovelValor =
      input.imovelValor && input.imovelValor > 0
        ? String(input.imovelValor.toFixed(2))
        : null;
  if (input.comissaoEstimada !== undefined)
    updates.comissaoEstimada =
      input.comissaoEstimada && input.comissaoEstimada > 0
        ? String(input.comissaoEstimada.toFixed(2))
        : null;

  await db.update(atendimentos).set(updates).where(eq(atendimentos.id, input.id));
  revalidatePath("/painel/atendimentos");
  revalidatePath(`/painel/atendimentos/${input.id}`);
  return { ok: true };
}

export async function changeStatusAtendimento(input: {
  id: string;
  status: AtendimentoStatus;
  motivoPerda?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const a = await getAtendimento(input.id);
  if (!a) return { ok: false, error: "Atendimento não encontrado" };

  const user = await requireActiveUser();
  const isClosing =
    input.status === "fechado" || input.status === "perdido";

  await db
    .update(atendimentos)
    .set({
      status: input.status,
      motivoPerda:
        input.status === "perdido"
          ? input.motivoPerda?.trim() || null
          : null,
      closedAt: isClosing ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(atendimentos.id, input.id));

  // Registra evento de mudança
  await db.insert(atendimentoEventos).values({
    atendimentoId: input.id,
    userId: user.id,
    tipo: "status_change",
    statusFrom: a.status,
    statusTo: input.status,
    descricao: input.motivoPerda?.trim() || null,
  });

  revalidatePath("/painel/atendimentos");
  revalidatePath(`/painel/atendimentos/${input.id}`);
  return { ok: true };
}

export async function deleteAtendimento(id: string) {
  const me = await getCurrentImobMembership();
  if (!me) throw new Error("Sem permissão");
  // Só owner/gerente pode apagar
  if (!me.canSeeAllAtendimentos)
    throw new Error("Apenas owner/gerente pode remover");

  await db
    .delete(atendimentos)
    .where(
      and(
        eq(atendimentos.id, id),
        eq(atendimentos.imobiliariaId, me.imobiliariaId),
      ),
    );
  revalidatePath("/painel/atendimentos");
  return { ok: true };
}

/* ============================================================
   EVENTOS — adicionar
   ============================================================ */

export async function addEvento(input: {
  atendimentoId: string;
  tipo: EventoTipo;
  descricao?: string;
  dataAgendada?: string;
  valor?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const a = await getAtendimento(input.atendimentoId);
  if (!a) return { ok: false, error: "Atendimento não encontrado" };

  const user = await requireActiveUser();
  await db.insert(atendimentoEventos).values({
    atendimentoId: input.atendimentoId,
    userId: user.id,
    tipo: input.tipo,
    descricao: input.descricao?.trim() || null,
    dataAgendada: input.dataAgendada ? new Date(input.dataAgendada) : null,
    valor:
      input.valor && input.valor > 0 ? String(input.valor.toFixed(2)) : null,
  });

  // Toca updatedAt do atendimento
  await db
    .update(atendimentos)
    .set({ updatedAt: new Date() })
    .where(eq(atendimentos.id, input.atendimentoId));

  revalidatePath(`/painel/atendimentos/${input.atendimentoId}`);
  return { ok: true };
}

/* ============================================================
   SCORE — consulta sob demanda
   ============================================================ */

export async function consultarScoreAtendimento(
  atendimentoId: string,
): Promise<{
  ok: boolean;
  score?: number;
  risco?: string;
  error?: string;
}> {
  const a = await getAtendimento(atendimentoId);
  if (!a) return { ok: false, error: "Atendimento não encontrado" };
  if (!a.compradorDocumento)
    return {
      ok: false,
      error: "Comprador sem CPF/CNPJ. Cadastre antes de consultar.",
    };

  const doc = a.compradorDocumento.replace(/\D/g, "");
  const tipoPessoa = doc.length === 11 ? "pf" : "pj";

  // Provedor stub (mesma abordagem das outras integrações dummy do projeto)
  // Gera score determinístico baseado no documento pra simular Serasa
  const seed = doc.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const score = 300 + (seed % 700); // 300-999
  const risco =
    score >= 750
      ? "baixo"
      : score >= 600
        ? "medio"
        : score >= 400
          ? "alto"
          : "critico";

  const user = await requireActiveUser();

  // Registra consulta na tabela canônica
  await db.insert(consultasCredito).values({
    documento: doc,
    tipoPessoa,
    provedor: "stub",
    score,
    risco,
    restricoes: 0,
    payload: { source: "atendimento", atendimentoId },
    solicitadoPorUserId: user.id,
  });

  // Atualiza o atendimento
  await db
    .update(atendimentos)
    .set({
      scoreComprador: score,
      scoreRisco: risco,
      scoreConsultadoEm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(atendimentos.id, atendimentoId));

  // Evento
  await db.insert(atendimentoEventos).values({
    atendimentoId,
    userId: user.id,
    tipo: "score_consultado",
    descricao: `Score: ${score} (${risco})`,
  });

  revalidatePath(`/painel/atendimentos/${atendimentoId}`);
  return { ok: true, score, risco };
}

/* ============================================================
   ENCAMINHAR pra antecipação — cria operação rascunho
   ============================================================ */

export async function encaminharParaAntecipacao(input: {
  atendimentoId: string;
  numeroParcelas: number;
  taxaMensal?: number;
}): Promise<{ ok: boolean; operacaoId?: string; error?: string }> {
  const a = await getAtendimento(input.atendimentoId);
  if (!a) return { ok: false, error: "Atendimento não encontrado" };
  if (a.status !== "fechado")
    return {
      ok: false,
      error: "Atendimento precisa estar 'fechado' antes de encaminhar.",
    };
  if (a.operacaoId)
    return {
      ok: false,
      error: "Esse atendimento já foi encaminhado.",
    };
  if (!a.comissaoEstimada || parseFloat(a.comissaoEstimada) <= 0)
    return {
      ok: false,
      error: "Defina a comissão estimada antes de encaminhar.",
    };

  const me = await getCurrentImobMembership();
  if (!me) return { ok: false, error: "Sem vínculo" };

  // Pega owner da imob como cedente padrão
  const { imobiliarias, operacoes, parcelasComissao } = await import(
    "@/db/schema"
  );
  const { getTaxaMensal } = await import("@/lib/actions/settings");
  const { valorPresente } = await import("@/lib/format");

  const [imob] = await db
    .select({
      ownerUserId: imobiliarias.ownerUserId,
      id: imobiliarias.id,
    })
    .from(imobiliarias)
    .where(eq(imobiliarias.id, a.imobiliariaId))
    .limit(1);
  if (!imob?.ownerUserId)
    return { ok: false, error: "Imobiliária sem owner cadastrado." };

  // Resolver construtoraId — em ordem de prioridade:
  // 1) Se atendimento tem 1 construtora acompanhando: usa ela (auto-vínculo)
  // 2) Se imob já operou antes: reusa construtora mais recente
  // 3) Senão: bloqueia e pede pra cadastrar uma op manual primeiro
  const { atendimentoConstrutoras } = await import("@/db/schema");
  const vinculos = await db
    .select({ construtoraId: atendimentoConstrutoras.construtoraId })
    .from(atendimentoConstrutoras)
    .where(
      and(
        eq(atendimentoConstrutoras.atendimentoId, input.atendimentoId),
        sql`${atendimentoConstrutoras.removedAt} IS NULL`,
      ),
    );

  let construtoraId: string | null = null;
  if (vinculos.length === 1) {
    construtoraId = vinculos[0].construtoraId;
  } else if (vinculos.length > 1) {
    return {
      ok: false,
      error: `Atendimento tem ${vinculos.length} construtoras acompanhando. Antes de encaminhar, remova as que não fecharam o negócio — só deve sobrar uma.`,
    };
  } else {
    // Sem acompanhamento — tenta reusar última op da imob
    const lastOp = await db
      .select({ construtoraId: operacoes.construtoraId })
      .from(operacoes)
      .where(eq(operacoes.imobiliariaId, a.imobiliariaId))
      .orderBy(desc(operacoes.createdAt))
      .limit(1);
    construtoraId = lastOp[0]?.construtoraId ?? null;
  }

  if (!construtoraId) {
    return {
      ok: false,
      error:
        "Vincule uma construtora ao atendimento (no card 'Construtoras acompanhando') ANTES de encaminhar. Senão, cadastre uma operação manualmente primeiro.",
    };
  }

  // Calcula VP
  const valorComissao = parseFloat(a.comissaoEstimada);
  const taxaMensal = input.taxaMensal ?? (await getTaxaMensal());
  const valorVenda = a.imovelValor
    ? parseFloat(a.imovelValor)
    : valorComissao * 20; // default 5% comissão
  const today = new Date();
  const parcelas = Array.from({ length: input.numeroParcelas }, (_, i) => {
    const v = new Date(today);
    v.setDate(v.getDate() + 30 * (i + 1));
    return {
      valor: valorComissao / input.numeroParcelas,
      vencimento: v.toISOString().slice(0, 10),
    };
  });
  const arr = parcelas.map((p) => {
    const venc = new Date(p.vencimento + "T00:00:00");
    const meses = Math.max(
      (venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30),
      0,
    );
    return { valor: p.valor, mesesAteVencimento: meses };
  });
  const vp = valorPresente(arr, taxaMensal);
  const desagio = valorComissao - vp;

  // Gera número OP
  const ano = today.getFullYear();
  const lastNumberRes = await db.execute(sql`
    SELECT MAX(CAST(SUBSTRING(numero FROM 'OP-${sql.raw(String(ano))}-(\\d+)') AS INTEGER)) AS max
    FROM operacoes WHERE numero LIKE ${`OP-${ano}-%`}
  `);
  const lastNum =
    extractRows<{ max: number | null }>(lastNumberRes)[0]?.max ?? 0;
  const numero = `OP-${ano}-${String((lastNum ?? 0) + 1).padStart(4, "0")}`;

  const [op] = await db
    .insert(operacoes)
    .values({
      numero,
      corretorUserId: imob.ownerUserId,
      corretorAtendenteUserId: a.corretorUserId,
      imobiliariaId: a.imobiliariaId,
      construtoraId,
      valorVenda: String(valorVenda.toFixed(2)),
      valorComissao: String(valorComissao.toFixed(2)),
      dataVenda: today.toISOString().slice(0, 10),
      numeroParcelas: input.numeroParcelas,
      taxaMensal: String(taxaMensal),
      valorPresente: String(vp.toFixed(2)),
      desagio: String(desagio.toFixed(2)),
      status: "rascunho",
    })
    .returning({ id: operacoes.id });

  await db.insert(parcelasComissao).values(
    parcelas.map((p, i) => ({
      operacaoId: op.id,
      numero: i + 1,
      valor: String(p.valor.toFixed(2)),
      vencimento: p.vencimento,
      status: "a_vencer" as const,
    })),
  );

  // Atualiza atendimento
  await db
    .update(atendimentos)
    .set({
      operacaoId: op.id,
      updatedAt: new Date(),
    })
    .where(eq(atendimentos.id, input.atendimentoId));

  const user = await requireActiveUser();
  await db.insert(atendimentoEventos).values({
    atendimentoId: input.atendimentoId,
    userId: user.id,
    tipo: "encaminhado_antecipacao",
    descricao: `Operação ${numero} criada como rascunho.`,
  });

  await audit({
    action: "atendimento_encaminhado_antecipacao",
    targetType: "atendimento",
    targetId: input.atendimentoId,
    targetLabel: a.compradorNome,
    metadata: { operacaoId: op.id, numero },
  });

  revalidatePath("/painel/atendimentos");
  revalidatePath("/painel/operacoes");
  return { ok: true, operacaoId: op.id };
}
