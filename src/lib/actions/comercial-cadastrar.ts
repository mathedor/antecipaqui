"use server";

import { revalidatePath } from "next/cache";
import { eq, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  comerciais,
  construtoras,
  imobiliarias,
  operacoes,
  parcelasComissao,
  users,
  operacaoCompradores,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { parseBRLNumber, valorPresente } from "@/lib/format";
import { getTaxaMensal } from "@/lib/actions/settings";
import { audit } from "@/lib/audit";
import { parsePagadorTipo, parseCompradoresFromForm } from "@/lib/compradores";

/** Lista corretores/imobiliárias ativos pra dropdown — versão pra comercial.
 *  Sem restrição de carteira: comercial pode originar nova relação. */
export async function listCorretoresForComercialSelector() {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "comercial") throw new Error("Apenas comercial");
  return db
    .select({
      id: users.id,
      nome: users.nome,
      email: users.email,
      role: users.role,
      imobNome: imobiliarias.razaoSocial,
      imobCnpj: imobiliarias.cnpj,
    })
    .from(users)
    .leftJoin(imobiliarias, eq(imobiliarias.ownerUserId, users.id))
    .where(
      sql`${users.role} IN ('corretor', 'imobiliaria') AND ${users.isActive} = true`,
    )
    .orderBy(asc(users.nome));
}

export async function listConstrutorasForComercialSelector() {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "comercial") throw new Error("Apenas comercial");
  return db
    .select({
      id: construtoras.id,
      razaoSocial: construtoras.razaoSocial,
      nomeFantasia: construtoras.nomeFantasia,
      cnpj: construtoras.cnpj,
    })
    .from(construtoras)
    .where(eq(construtoras.isActive, true))
    .orderBy(asc(construtoras.razaoSocial));
}

export type CadastrarOpComercialState =
  | { ok: false; error: string }
  | { ok: true; operacaoId: string; numero: string }
  | null;

/**
 * Comercial cria operação em nome de um corretor/imobiliária + construtora.
 * A operação fica com:
 *   - corretor_user_id = corretor selecionado (cedente)
 *   - imobiliaria_id   = imob do corretor (se houver)
 *   - construtora_id   = selecionada
 *   - comercial_id     = comercial logado
 *   - fundo_id         = NULL (admin/fundo decide depois na mesa)
 *   - taxa_mensal      = taxa-padrão do sistema (admin ajusta na aprovação)
 *
 * Status inicial: aguardando_aprovacao (vai pra mesa do AQ).
 */
export async function comercialCadastrarOperacaoAction(
  _prev: CadastrarOpComercialState,
  formData: FormData,
): Promise<CadastrarOpComercialState> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "comercial")
    return { ok: false, error: "Apenas comercial pode cadastrar por aqui" };

  const [comercial] = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.ownerUserId, user.id))
    .limit(1);
  if (!comercial)
    return { ok: false, error: "Comercial não vinculado ao seu user" };

  const corretorUserId = String(formData.get("corretorUserId") || "").trim();
  const construtoraId = String(formData.get("construtoraId") || "").trim();
  if (!corretorUserId)
    return { ok: false, error: "Selecione a imobiliária / corretor cedente" };
  if (!construtoraId)
    return { ok: false, error: "Selecione a construtora" };

  const valorVenda = parseBRLNumber(String(formData.get("valorVenda") || ""));
  const valorComissao = parseBRLNumber(
    String(formData.get("valorComissao") || ""),
  );
  const valorEntradaRaw = String(formData.get("valorEntrada") || "").trim();
  const valorEntrada = valorEntradaRaw ? parseBRLNumber(valorEntradaRaw) : null;
  const dataVenda = String(formData.get("dataVenda") || "").trim();

  if (!valorVenda || valorVenda <= 0)
    return { ok: false, error: "Valor da venda inválido" };
  if (!valorComissao || valorComissao <= 0)
    return { ok: false, error: "Valor da comissão inválido" };
  if (valorComissao > valorVenda)
    return { ok: false, error: "Comissão maior que o valor da venda" };
  if (!dataVenda) return { ok: false, error: "Data da venda obrigatória" };

  const parcelasJson = String(formData.get("parcelas") || "[]");
  let parcelasRaw: { valor: unknown; vencimento: unknown }[] = [];
  try {
    parcelasRaw = JSON.parse(parcelasJson);
  } catch {
    return { ok: false, error: "Parcelas inválidas" };
  }
  if (!Array.isArray(parcelasRaw) || parcelasRaw.length === 0)
    return { ok: false, error: "Adicione pelo menos uma parcela" };
  if (parcelasRaw.length > 5)
    return { ok: false, error: "Limite de 5 parcelas" };

  const parcelas = parcelasRaw.map((p) => ({
    valor:
      typeof p.valor === "number" ? p.valor : parseBRLNumber(String(p.valor)),
    vencimento: String(p.vencimento ?? ""),
  }));

  const totalParcelas = parcelas.reduce((s, p) => s + p.valor, 0);
  if (Math.abs(totalParcelas - valorComissao) > 0.5) {
    return {
      ok: false,
      error: `Soma das parcelas (R$ ${totalParcelas.toFixed(2)}) não bate com a comissão (R$ ${valorComissao.toFixed(2)})`,
    };
  }

  // Imobiliária do corretor (se houver)
  const imob = (
    await db
      .select()
      .from(imobiliarias)
      .where(eq(imobiliarias.ownerUserId, corretorUserId))
      .limit(1)
  )[0];

  // Taxa-padrão do sistema (admin ajusta na aprovação se quiser)
  const taxaMensal = await getTaxaMensal();
  const today = new Date();
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

  // Número OP-YYYY-XXXX
  const ano = new Date().getFullYear();
  const lastNumberRes = await db.execute(sql`
    SELECT MAX(CAST(SUBSTRING(numero FROM 'OP-${sql.raw(String(ano))}-(\\d+)') AS INTEGER)) AS max
    FROM operacoes WHERE numero LIKE ${`OP-${ano}-%`}
  `);
  const lastNum =
    ((lastNumberRes as unknown as { rows: { max: number | null }[] }).rows[0]
      ?.max ?? 0) || 0;
  const numero = `OP-${ano}-${String(lastNum + 1).padStart(4, "0")}`;

  const pagadorTipo = parsePagadorTipo(
    String(formData.get("pagadorTipo") || ""),
  );
  let compradoresParseados: ReturnType<typeof parseCompradoresFromForm> = {
    ok: true,
    compradores: [],
  };
  if (pagadorTipo === "compradores") {
    compradoresParseados = parseCompradoresFromForm(
      String(formData.get("compradores") || ""),
    );
    if (!compradoresParseados.ok)
      return { ok: false, error: compradoresParseados.error };
  }

  const [op] = await db
    .insert(operacoes)
    .values({
      numero,
      corretorUserId,
      imobiliariaId: imob?.id ?? null,
      construtoraId,
      comercialId: comercial.id,
      fundoId: null,
      valorVenda: String(valorVenda.toFixed(2)),
      valorComissao: String(valorComissao.toFixed(2)),
      valorEntrada:
        valorEntrada && valorEntrada > 0
          ? String(valorEntrada.toFixed(2))
          : null,
      dataVenda,
      numeroParcelas: parcelas.length,
      taxaMensal: String(taxaMensal),
      valorPresente: String(vp.toFixed(2)),
      desagio: String(desagio.toFixed(2)),
      status: "aguardando_aprovacao",
      pagadorTipo,
    })
    .returning();

  if (
    pagadorTipo === "compradores" &&
    compradoresParseados.ok &&
    compradoresParseados.compradores.length > 0
  ) {
    await db.insert(operacaoCompradores).values(
      compradoresParseados.compradores.map((c, i) => ({
        operacaoId: op.id,
        ordem: i + 1,
        tipoPessoa: c.tipoPessoa,
        nome: c.nome,
        documento: c.documento,
        telefone: c.telefone,
        email: c.email,
        cep: c.cep ?? null,
        endereco: c.endereco ?? null,
        cidade: c.cidade ?? null,
        uf: c.uf ?? null,
      })),
    );
  }

  await db.insert(parcelasComissao).values(
    parcelas.map((p, i) => ({
      operacaoId: op.id,
      numero: i + 1,
      valor: String(p.valor.toFixed(2)),
      vencimento: p.vencimento,
      status: "a_vencer" as const,
    })),
  );

  await audit({
    action: "operacao_cadastrada_por_comercial",
    targetType: "operacao",
    targetId: op.id,
    targetLabel: op.numero,
    metadata: { comercialId: comercial.id, corretorUserId, construtoraId },
  });

  revalidatePath("/painel");
  revalidatePath("/painel/operacoes");
  revalidatePath("/admin/operacoes");

  return { ok: true, operacaoId: op.id, numero: op.numero };
}
