"use server";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  atendimentoConstrutoras,
  atendimentoEventos,
  atendimentos,
  construtoras,
  imobiliarias,
  users,
} from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import { getAtendimento } from "@/lib/actions/atendimentos";
import { notify } from "@/lib/notify";
import { audit } from "@/lib/audit";
import {
  TIPO_OPINIAO_LABEL,
  type AtendimentoParaConstrutora,
  type ConstrutoraVinculo,
  type TipoOpiniao,
  type TopParceiroCorretor,
  type TopParceiroImob,
} from "@/lib/atendimento-construtoras-types";

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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

/* ============================================================
   LISTAR construtoras vinculadas a um atendimento (visão imob/corretor)
   ============================================================ */

export async function listConstrutorasDoAtendimento(
  atendimentoId: string,
): Promise<ConstrutoraVinculo[]> {
  const a = await getAtendimento(atendimentoId);
  if (!a) return [];

  const rows = await db
    .select({
      id: atendimentoConstrutoras.id,
      construtoraId: atendimentoConstrutoras.construtoraId,
      construtoraNome: construtoras.razaoSocial,
      aguardandoOpiniao: atendimentoConstrutoras.aguardandoOpiniao,
      tipoOpiniaoSolicitada: atendimentoConstrutoras.tipoOpiniaoSolicitada,
      opiniaoSolicitadaEm: atendimentoConstrutoras.opiniaoSolicitadaEm,
      opiniaoSolicitadaTexto: atendimentoConstrutoras.opiniaoSolicitadaTexto,
      opiniaoRecebidaEm: atendimentoConstrutoras.opiniaoRecebidaEm,
      opiniaoTexto: atendimentoConstrutoras.opiniaoTexto,
      opiniaoRecomenda: atendimentoConstrutoras.opiniaoRecomenda,
      createdAt: atendimentoConstrutoras.createdAt,
    })
    .from(atendimentoConstrutoras)
    .innerJoin(
      construtoras,
      eq(construtoras.id, atendimentoConstrutoras.construtoraId),
    )
    .where(
      and(
        eq(atendimentoConstrutoras.atendimentoId, atendimentoId),
        isNull(atendimentoConstrutoras.removedAt),
      ),
    )
    .orderBy(desc(atendimentoConstrutoras.createdAt));

  return rows.map((r) => ({
    id: r.id,
    construtoraId: r.construtoraId,
    construtoraNome: r.construtoraNome,
    aguardandoOpiniao: r.aguardandoOpiniao,
    tipoOpiniaoSolicitada: r.tipoOpiniaoSolicitada,
    opiniaoSolicitadaEm: r.opiniaoSolicitadaEm?.toISOString() ?? null,
    opiniaoSolicitadaTexto: r.opiniaoSolicitadaTexto,
    opiniaoRecebidaEm: r.opiniaoRecebidaEm?.toISOString() ?? null,
    opiniaoTexto: r.opiniaoTexto,
    opiniaoRecomenda: r.opiniaoRecomenda,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Lista construtoras pra dropdown (todas ativas do sistema). */
export async function listConstrutorasAtivas() {
  await requireActiveUser();
  return db
    .select({
      id: construtoras.id,
      razaoSocial: construtoras.razaoSocial,
      nomeFantasia: construtoras.nomeFantasia,
      cnpj: construtoras.cnpj,
    })
    .from(construtoras)
    .where(eq(construtoras.isActive, true))
    .orderBy(construtoras.razaoSocial);
}

/* ============================================================
   CONVIDAR construtora pra acompanhar
   ============================================================ */

export async function convidarConstrutoraAcompanhar(input: {
  atendimentoId: string;
  construtoraId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const a = await getAtendimento(input.atendimentoId);
  if (!a) return { ok: false, error: "Atendimento não encontrado" };
  const user = await requireActiveUser();

  // Já existe vínculo ativo?
  const existing = await db
    .select({ id: atendimentoConstrutoras.id })
    .from(atendimentoConstrutoras)
    .where(
      and(
        eq(atendimentoConstrutoras.atendimentoId, input.atendimentoId),
        eq(atendimentoConstrutoras.construtoraId, input.construtoraId),
        isNull(atendimentoConstrutoras.removedAt),
      ),
    )
    .limit(1);
  if (existing[0])
    return {
      ok: false,
      error: "Essa construtora já está acompanhando este atendimento",
    };

  const [vinculo] = await db
    .insert(atendimentoConstrutoras)
    .values({
      atendimentoId: input.atendimentoId,
      construtoraId: input.construtoraId,
      convidadoPorUserId: user.id,
    })
    .onConflictDoUpdate({
      target: [
        atendimentoConstrutoras.atendimentoId,
        atendimentoConstrutoras.construtoraId,
      ],
      set: {
        convidadoPorUserId: user.id,
        removedAt: null,
        createdAt: new Date(),
      },
    })
    .returning({ id: atendimentoConstrutoras.id });

  // Evento na timeline
  const [c] = await db
    .select({
      razaoSocial: construtoras.razaoSocial,
      nomeFantasia: construtoras.nomeFantasia,
      ownerUserId: construtoras.ownerUserId,
      emailComercial: construtoras.email,
    })
    .from(construtoras)
    .where(eq(construtoras.id, input.construtoraId))
    .limit(1);
  const nomeConstr = c?.nomeFantasia ?? c?.razaoSocial ?? "Construtora";

  await db.insert(atendimentoEventos).values({
    atendimentoId: input.atendimentoId,
    userId: user.id,
    tipo: "construtora_convidada",
    descricao: `${nomeConstr} convidada a acompanhar o atendimento`,
  });

  // Notificação pra owner da construtora (se vinculado)
  if (c?.ownerUserId) {
    await notify({
      userId: c.ownerUserId,
      type: "atendimento_acompanhamento_convidado",
      title: `Você está acompanhando um atendimento`,
      body: `${nomeConstr} foi convidada a acompanhar a negociação de "${a.compradorNome}". Veja na área de atendimentos parceiros.`,
      link: `/painel/atendimentos-parceiros/${input.atendimentoId}`,
      email: c.emailComercial
        ? {
            to: c.emailComercial,
            subject: "Antecipaqui — convite pra acompanhar atendimento",
            body: `Olá!\n\nUma imobiliária parceira te convidou a acompanhar um atendimento ativo: "${a.compradorNome}".\n\nVocê pode acompanhar a timeline, comentar e dar opinião quando solicitada.\n\nAbrir: ${SITE_URL}/painel/atendimentos-parceiros/${input.atendimentoId}\n\n— Antecipaqui`,
          }
        : undefined,
    }).catch(() => undefined);
  }

  await audit({
    action: "construtora_convidada_atendimento",
    targetType: "atendimento",
    targetId: input.atendimentoId,
    targetLabel: a.compradorNome,
    metadata: { construtoraId: input.construtoraId, vinculoId: vinculo.id },
  });

  revalidatePath(`/painel/atendimentos/${input.atendimentoId}`);
  return { ok: true };
}

/* ============================================================
   SOLICITAR opinião — destaca pra construtora
   ============================================================ */

export async function solicitarOpiniaoConstrutora(input: {
  vinculoId: string;
  tipo: TipoOpiniao;
  texto: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireActiveUser();
  if (!input.texto.trim())
    return { ok: false, error: "Descreva o que precisa ser opinado" };

  const [v] = await db
    .select({
      id: atendimentoConstrutoras.id,
      atendimentoId: atendimentoConstrutoras.atendimentoId,
      construtoraId: atendimentoConstrutoras.construtoraId,
    })
    .from(atendimentoConstrutoras)
    .where(eq(atendimentoConstrutoras.id, input.vinculoId))
    .limit(1);
  if (!v) return { ok: false, error: "Vínculo não encontrado" };

  // valida acesso ao atendimento
  const a = await getAtendimento(v.atendimentoId);
  if (!a) return { ok: false, error: "Sem acesso" };

  await db
    .update(atendimentoConstrutoras)
    .set({
      aguardandoOpiniao: true,
      tipoOpiniaoSolicitada: input.tipo,
      opiniaoSolicitadaEm: new Date(),
      opiniaoSolicitadaTexto: input.texto.trim(),
      // limpa resposta anterior se for novo pedido
      opiniaoRecebidaEm: null,
      opiniaoTexto: null,
      opiniaoRecomenda: null,
    })
    .where(eq(atendimentoConstrutoras.id, input.vinculoId));

  const [c] = await db
    .select({
      razaoSocial: construtoras.razaoSocial,
      nomeFantasia: construtoras.nomeFantasia,
      ownerUserId: construtoras.ownerUserId,
      emailComercial: construtoras.email,
    })
    .from(construtoras)
    .where(eq(construtoras.id, v.construtoraId))
    .limit(1);

  await db.insert(atendimentoEventos).values({
    atendimentoId: v.atendimentoId,
    userId: user.id,
    tipo: "construtora_opiniao_solicitada",
    descricao: `Opinião solicitada (${TIPO_OPINIAO_LABEL[input.tipo]}): ${input.texto.trim()}`,
  });

  if (c?.ownerUserId) {
    await notify({
      userId: c.ownerUserId,
      type: "atendimento_opiniao_solicitada",
      title: `⏸ Opinião solicitada · ${TIPO_OPINIAO_LABEL[input.tipo]}`,
      body: `"${a.compradorNome}" — ${input.texto.trim().slice(0, 140)}`,
      link: `/painel/atendimentos-parceiros/${v.atendimentoId}`,
      email: c.emailComercial
        ? {
            to: c.emailComercial,
            subject: `Antecipaqui — opinião solicitada (${TIPO_OPINIAO_LABEL[input.tipo]})`,
            body: `Olá!\n\nUma imobiliária parceira solicitou sua opinião sobre o atendimento de "${a.compradorNome}":\n\nTipo: ${TIPO_OPINIAO_LABEL[input.tipo]}\n\n${input.texto.trim()}\n\nResponda em: ${SITE_URL}/painel/atendimentos-parceiros/${v.atendimentoId}\n\n— Antecipaqui`,
          }
        : undefined,
    }).catch(() => undefined);
  }

  revalidatePath(`/painel/atendimentos/${v.atendimentoId}`);
  revalidatePath(`/painel/atendimentos-parceiros/${v.atendimentoId}`);
  return { ok: true };
}

/* ============================================================
   DAR opinião (construtora respondendo)
   ============================================================ */

export async function darOpiniaoConstrutora(input: {
  vinculoId: string;
  texto: string;
  recomenda: boolean | null;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireActiveUser();
  if (user.role !== "construtora")
    return { ok: false, error: "Apenas construtora pode opinar" };
  if (!input.texto.trim())
    return { ok: false, error: "Resposta vazia" };

  // Verifica que a construtora do user é dona do vínculo
  const [v] = await db
    .select({
      id: atendimentoConstrutoras.id,
      atendimentoId: atendimentoConstrutoras.atendimentoId,
      construtoraId: atendimentoConstrutoras.construtoraId,
      ownerUserId: construtoras.ownerUserId,
    })
    .from(atendimentoConstrutoras)
    .innerJoin(
      construtoras,
      eq(construtoras.id, atendimentoConstrutoras.construtoraId),
    )
    .where(eq(atendimentoConstrutoras.id, input.vinculoId))
    .limit(1);
  if (!v) return { ok: false, error: "Vínculo não encontrado" };
  if (v.ownerUserId !== user.id)
    return { ok: false, error: "Você não é dono dessa construtora" };

  await db
    .update(atendimentoConstrutoras)
    .set({
      opiniaoRecebidaEm: new Date(),
      opiniaoTexto: input.texto.trim(),
      opiniaoRecomenda: input.recomenda,
      aguardandoOpiniao: false,
    })
    .where(eq(atendimentoConstrutoras.id, input.vinculoId));

  await db.insert(atendimentoEventos).values({
    atendimentoId: v.atendimentoId,
    userId: user.id,
    tipo: "construtora_opinou",
    descricao: `${input.recomenda === true ? "✓ Recomenda prosseguir" : input.recomenda === false ? "✕ Não recomenda" : "↪ Condicional"}: ${input.texto.trim()}`,
  });

  // Notifica imob + corretor (corretor atendente do atendimento)
  const [a] = await db
    .select({
      compradorNome: atendimentos.compradorNome,
      corretorUserId: atendimentos.corretorUserId,
      imobiliariaId: atendimentos.imobiliariaId,
    })
    .from(atendimentos)
    .where(eq(atendimentos.id, v.atendimentoId))
    .limit(1);

  if (a) {
    const [imob] = await db
      .select({
        ownerUserId: imobiliarias.ownerUserId,
      })
      .from(imobiliarias)
      .where(eq(imobiliarias.id, a.imobiliariaId))
      .limit(1);

    const corretorEmail = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, a.corretorUserId))
      .limit(1)
      .then((r) => r[0]?.email);

    const recomendaLabel =
      input.recomenda === true
        ? "✓ recomenda prosseguir"
        : input.recomenda === false
          ? "✕ não recomenda"
          : "↪ condicional";

    // Notifica corretor responsável
    await notify({
      userId: a.corretorUserId,
      type: "atendimento_construtora_opinou",
      title: `Construtora respondeu · ${recomendaLabel}`,
      body: `"${a.compradorNome}" — ${input.texto.trim().slice(0, 140)}`,
      link: `/painel/atendimentos/${v.atendimentoId}`,
      email: corretorEmail
        ? {
            to: corretorEmail,
            subject: `Antecipaqui — construtora respondeu (${recomendaLabel})`,
            body: `Construtora respondeu sua solicitação no atendimento "${a.compradorNome}":\n\n${recomendaLabel.toUpperCase()}\n\n${input.texto.trim()}\n\nVer detalhes: ${SITE_URL}/painel/atendimentos/${v.atendimentoId}`,
          }
        : undefined,
    }).catch(() => undefined);

    // Também notifica owner da imob se for diferente
    if (imob?.ownerUserId && imob.ownerUserId !== a.corretorUserId) {
      await notify({
        userId: imob.ownerUserId,
        type: "atendimento_construtora_opinou",
        title: `Construtora respondeu · ${recomendaLabel}`,
        body: `"${a.compradorNome}"`,
        link: `/painel/atendimentos/${v.atendimentoId}`,
      }).catch(() => undefined);
    }
  }

  revalidatePath(`/painel/atendimentos/${v.atendimentoId}`);
  revalidatePath(`/painel/atendimentos-parceiros/${v.atendimentoId}`);
  return { ok: true };
}

/* ============================================================
   REMOVER vínculo (corretor ou construtora podem)
   ============================================================ */

export async function removerVinculoConstrutora(input: {
  vinculoId: string;
  motivo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireActiveUser();

  const [v] = await db
    .select({
      id: atendimentoConstrutoras.id,
      atendimentoId: atendimentoConstrutoras.atendimentoId,
      construtoraOwnerUserId: construtoras.ownerUserId,
    })
    .from(atendimentoConstrutoras)
    .innerJoin(
      construtoras,
      eq(construtoras.id, atendimentoConstrutoras.construtoraId),
    )
    .where(eq(atendimentoConstrutoras.id, input.vinculoId))
    .limit(1);
  if (!v) return { ok: false, error: "Vínculo não encontrado" };

  // Permissão: dono da construtora OU quem tem acesso ao atendimento
  const isConstrutoraOwner = v.construtoraOwnerUserId === user.id;
  const a = await getAtendimento(v.atendimentoId);
  if (!isConstrutoraOwner && !a)
    return { ok: false, error: "Sem permissão" };

  await db
    .update(atendimentoConstrutoras)
    .set({
      removedAt: new Date(),
      removedReason: input.motivo?.trim() || null,
    })
    .where(eq(atendimentoConstrutoras.id, input.vinculoId));

  await db.insert(atendimentoEventos).values({
    atendimentoId: v.atendimentoId,
    userId: user.id,
    tipo: "construtora_removida",
    descricao: input.motivo?.trim() ?? "Construtora removida do acompanhamento",
  });

  revalidatePath(`/painel/atendimentos/${v.atendimentoId}`);
  revalidatePath(`/painel/atendimentos-parceiros/${v.atendimentoId}`);
  return { ok: true };
}

/* ============================================================
   VISÃO DA CONSTRUTORA
   ============================================================ */

export async function listAtendimentosObservandoComoConstrutora(): Promise<
  AtendimentoParaConstrutora[]
> {
  const user = await requireActiveUser();
  if (user.role !== "construtora") return [];

  const [c] = await db
    .select({ id: construtoras.id })
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) return [];

  const rows = await db.execute(sql`
    SELECT
      ac.id AS vinculo_id,
      ac.atendimento_id,
      ac.aguardando_opiniao,
      ac.opiniao_solicitada_em,
      ac.tipo_opiniao_solicitada,
      ac.opiniao_recebida_em,
      ac.created_at AS vinculado_em,
      a.comprador_nome,
      a.imovel_descricao,
      a.imovel_endereco,
      a.imovel_valor::float AS imovel_valor,
      a.status,
      i.razao_social AS imob_nome,
      u.nome AS corretor_nome,
      u.telefone AS corretor_telefone
    FROM atendimento_construtoras ac
    INNER JOIN atendimentos a ON a.id = ac.atendimento_id
    INNER JOIN imobiliarias i ON i.id = a.imobiliaria_id
    LEFT JOIN users u ON u.id = a.corretor_user_id
    WHERE ac.construtora_id = ${c.id}::uuid
      AND ac.removed_at IS NULL
    ORDER BY
      ac.aguardando_opiniao DESC,
      a.updated_at DESC
  `);

  return extractRows<{
    vinculo_id: string;
    atendimento_id: string;
    aguardando_opiniao: boolean;
    opiniao_solicitada_em: string | null;
    tipo_opiniao_solicitada: string | null;
    opiniao_recebida_em: string | null;
    vinculado_em: string;
    comprador_nome: string;
    imovel_descricao: string | null;
    imovel_endereco: string | null;
    imovel_valor: number | null;
    status: string;
    imob_nome: string;
    corretor_nome: string | null;
    corretor_telefone: string | null;
  }>(rows).map((r) => ({
    vinculoId: r.vinculo_id,
    atendimentoId: r.atendimento_id,
    compradorNome: r.comprador_nome,
    imovelDescricao: r.imovel_descricao,
    imovelEndereco: r.imovel_endereco,
    imovelValor: r.imovel_valor,
    status: r.status,
    imobNome: r.imob_nome,
    corretorNome: r.corretor_nome,
    corretorTelefone: r.corretor_telefone,
    aguardandoOpiniao: r.aguardando_opiniao,
    opiniaoSolicitadaEm: r.opiniao_solicitada_em,
    tipoOpiniaoSolicitada: r.tipo_opiniao_solicitada,
    opiniaoRecebidaEm: r.opiniao_recebida_em,
    vinculadoEm: r.vinculado_em,
  }));
}

/** Pega atendimento + eventos com permissão de construtora (read-only). */
export async function getAtendimentoParaConstrutora(atendimentoId: string) {
  const user = await requireActiveUser();
  if (user.role !== "construtora") return null;

  const [c] = await db
    .select({ id: construtoras.id, nome: construtoras.razaoSocial })
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) return null;

  const [v] = await db
    .select({
      id: atendimentoConstrutoras.id,
      aguardandoOpiniao: atendimentoConstrutoras.aguardandoOpiniao,
      tipoOpiniaoSolicitada: atendimentoConstrutoras.tipoOpiniaoSolicitada,
      opiniaoSolicitadaEm: atendimentoConstrutoras.opiniaoSolicitadaEm,
      opiniaoSolicitadaTexto: atendimentoConstrutoras.opiniaoSolicitadaTexto,
      opiniaoRecebidaEm: atendimentoConstrutoras.opiniaoRecebidaEm,
      opiniaoTexto: atendimentoConstrutoras.opiniaoTexto,
      opiniaoRecomenda: atendimentoConstrutoras.opiniaoRecomenda,
    })
    .from(atendimentoConstrutoras)
    .where(
      and(
        eq(atendimentoConstrutoras.atendimentoId, atendimentoId),
        eq(atendimentoConstrutoras.construtoraId, c.id),
        isNull(atendimentoConstrutoras.removedAt),
      ),
    )
    .limit(1);
  if (!v) return null;

  const [a] = await db
    .select()
    .from(atendimentos)
    .where(eq(atendimentos.id, atendimentoId))
    .limit(1);
  if (!a) return null;

  const [imob] = await db
    .select({
      id: imobiliarias.id,
      razaoSocial: imobiliarias.razaoSocial,
      telefone: imobiliarias.telefone,
    })
    .from(imobiliarias)
    .where(eq(imobiliarias.id, a.imobiliariaId))
    .limit(1);

  const [corretor] = await db
    .select({
      id: users.id,
      nome: users.nome,
      email: users.email,
      telefone: users.telefone,
    })
    .from(users)
    .where(eq(users.id, a.corretorUserId))
    .limit(1);

  const eventos = await db
    .select()
    .from(atendimentoEventos)
    .where(eq(atendimentoEventos.atendimentoId, atendimentoId))
    .orderBy(desc(atendimentoEventos.createdAt));

  return {
    atendimento: a,
    vinculo: v,
    imob,
    corretor,
    eventos,
    construtora: c,
  };
}

/* ============================================================
   TOP PARCEIROS (relatório pra construtora)
   ============================================================ */

export async function getTopParceirosConstrutora(): Promise<{
  imobs: TopParceiroImob[];
  corretores: TopParceiroCorretor[];
}> {
  const user = await requireActiveUser();
  if (user.role !== "construtora") return { imobs: [], corretores: [] };

  const [c] = await db
    .select({ id: construtoras.id })
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) return { imobs: [], corretores: [] };

  const imobsRes = await db.execute(sql`
    SELECT
      a.imobiliaria_id,
      i.razao_social,
      COUNT(*)::int AS qtd,
      COUNT(*) FILTER (WHERE a.status = 'fechado')::int AS fechados,
      COUNT(*) FILTER (WHERE ac.aguardando_opiniao = true)::int AS aguardando
    FROM atendimento_construtoras ac
    INNER JOIN atendimentos a ON a.id = ac.atendimento_id
    INNER JOIN imobiliarias i ON i.id = a.imobiliaria_id
    WHERE ac.construtora_id = ${c.id}::uuid
      AND ac.removed_at IS NULL
      AND a.created_at >= NOW() - INTERVAL '90 days'
    GROUP BY a.imobiliaria_id, i.razao_social
    ORDER BY qtd DESC
    LIMIT 10
  `);
  const corretoresRes = await db.execute(sql`
    SELECT
      a.corretor_user_id,
      u.nome,
      u.email,
      COUNT(*)::int AS qtd,
      COUNT(*) FILTER (WHERE a.status = 'fechado')::int AS fechados
    FROM atendimento_construtoras ac
    INNER JOIN atendimentos a ON a.id = ac.atendimento_id
    INNER JOIN users u ON u.id = a.corretor_user_id
    WHERE ac.construtora_id = ${c.id}::uuid
      AND ac.removed_at IS NULL
      AND a.created_at >= NOW() - INTERVAL '90 days'
    GROUP BY a.corretor_user_id, u.nome, u.email
    ORDER BY qtd DESC
    LIMIT 10
  `);

  return {
    imobs: extractRows<{
      imobiliaria_id: string;
      razao_social: string;
      qtd: number;
      fechados: number;
      aguardando: number;
    }>(imobsRes).map((r) => ({
      imobiliariaId: r.imobiliaria_id,
      razaoSocial: r.razao_social,
      qtdAtendimentos: r.qtd,
      qtdFechados: r.fechados,
      qtdAguardando: r.aguardando,
    })),
    corretores: extractRows<{
      corretor_user_id: string;
      nome: string;
      email: string;
      qtd: number;
      fechados: number;
    }>(corretoresRes).map((r) => ({
      userId: r.corretor_user_id,
      nome: r.nome,
      email: r.email,
      qtdAtendimentos: r.qtd,
      qtdFechados: r.fechados,
    })),
  };
}
