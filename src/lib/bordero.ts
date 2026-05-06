import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  comerciais,
  construtoras,
  custosOperacao,
  fundos,
  imobiliarias,
  operacaoCompradores,
  operacoes,
  parcelasComissao,
  users,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";

export type BorderoParcela = {
  numero: number;
  vencimento: string;
  prazoDias: number;
  valorBruto: number;
  desagio: number;
  valorLiquido: number;
};

export type BorderoData = {
  numero: string;
  dataVenda: string;
  taxaMensal: number;
  valorVenda: number;
  valorComissao: number;
  valorEntrada: number | null;
  cedente: {
    tipo: "imobiliaria" | "corretor";
    razaoSocial: string;
    cnpj: string | null;
    nomeResponsavel: string;
    bancoNome: string | null;
    bancoCodigo: string | null;
    bancoAgencia: string | null;
    bancoConta: string | null;
    bancoPix: string | null;
  };
  construtora: {
    razaoSocial: string;
    cnpj: string;
  };
  pagadorTipo: "construtora" | "compradores";
  compradores: Array<{
    tipoPessoa: "fisica" | "juridica";
    nome: string;
    documento: string;
    telefone: string;
    email: string;
    endereco: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
  }>;
  fundo: { razaoSocial: string } | null;
  comercial: { nome: string } | null;
  parcelas: BorderoParcela[];
  custos: Array<{ titulo: string; valor: number }>;
  totais: {
    valorBruto: number;
    desagio: number;
    valorLiquido: number;
    custosTotal: number;
    valorLiquidoCedente: number;
  };
};

function monthsBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Carrega bordero de uma operação. Verifica autorização: admin/comercial veem
 * qualquer; cedente (corretor/imobiliária) só os próprios; construtora só
 * onde é sacado; fundo só onde é investidor.
 *
 * Retorna `null` se a operação não existe ou usuário não tem acesso.
 */
export async function getBorderoData(
  operacaoId: string,
): Promise<BorderoData | null> {
  const user = await getCurrentDbUser();
  if (!user) return null;

  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op) return null;

  const allowed =
    user.role === "admin" ||
    user.role === "comercial" ||
    op.corretorUserId === user.id ||
    (op.construtoraId &&
      (await isConstrutoraOwner(user.id, op.construtoraId))) ||
    (op.fundoId && (await isFundoOwner(user.id, op.fundoId)));
  if (!allowed) return null;

  const [corretor] = await db
    .select()
    .from(users)
    .where(eq(users.id, op.corretorUserId))
    .limit(1);

  let imobiliaria: typeof imobiliarias.$inferSelect | null = null;
  if (op.imobiliariaId) {
    const [im] = await db
      .select()
      .from(imobiliarias)
      .where(eq(imobiliarias.id, op.imobiliariaId))
      .limit(1);
    imobiliaria = im ?? null;
  }

  const [constru] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, op.construtoraId))
    .limit(1);
  if (!constru) return null;

  let fundo: { razaoSocial: string } | null = null;
  if (op.fundoId) {
    const [f] = await db
      .select({ razaoSocial: fundos.razaoSocial })
      .from(fundos)
      .where(eq(fundos.id, op.fundoId))
      .limit(1);
    fundo = f ?? null;
  }

  let comercial: { nome: string } | null = null;
  if (op.comercialId) {
    const [c] = await db
      .select({ nome: comerciais.nomeCompleto })
      .from(comerciais)
      .where(eq(comerciais.id, op.comercialId))
      .limit(1);
    comercial = c ? { nome: c.nome } : null;
  }

  const parcelasRows = await db
    .select()
    .from(parcelasComissao)
    .where(eq(parcelasComissao.operacaoId, operacaoId))
    .orderBy(parcelasComissao.numero);

  const taxa = parseFloat(op.taxaMensal);
  const dataVenda = new Date(op.dataVenda + "T00:00:00");

  const parcelas: BorderoParcela[] = parcelasRows.map((p) => {
    const venc = new Date(p.vencimento + "T00:00:00");
    const meses = Math.max(monthsBetween(dataVenda, venc), 0);
    const valorBruto = parseFloat(p.valor);
    const valorLiquido = valorBruto / Math.pow(1 + taxa, meses);
    return {
      numero: p.numero,
      vencimento: p.vencimento,
      prazoDias: daysBetween(dataVenda, venc),
      valorBruto,
      desagio: valorBruto - valorLiquido,
      valorLiquido,
    };
  });

  const subtotais = parcelas.reduce(
    (acc, p) => ({
      valorBruto: acc.valorBruto + p.valorBruto,
      desagio: acc.desagio + p.desagio,
      valorLiquido: acc.valorLiquido + p.valorLiquido,
    }),
    { valorBruto: 0, desagio: 0, valorLiquido: 0 },
  );

  const custosRows = await db
    .select()
    .from(custosOperacao)
    .where(eq(custosOperacao.operacaoId, operacaoId))
    .orderBy(custosOperacao.createdAt);

  const compradoresRows =
    op.pagadorTipo === "compradores"
      ? await db
          .select()
          .from(operacaoCompradores)
          .where(eq(operacaoCompradores.operacaoId, operacaoId))
          .orderBy(operacaoCompradores.ordem)
      : [];
  const custos = custosRows.map((c) => ({
    titulo: c.titulo,
    valor: parseFloat(c.valor),
  }));
  const custosTotal = custos.reduce((s, c) => s + c.valor, 0);
  const totais = {
    ...subtotais,
    custosTotal,
    valorLiquidoCedente: Math.max(subtotais.valorLiquido - custosTotal, 0),
  };

  const cedenteTipo: "imobiliaria" | "corretor" = imobiliaria
    ? "imobiliaria"
    : "corretor";

  return {
    numero: op.numero,
    dataVenda: op.dataVenda,
    taxaMensal: taxa,
    valorVenda: parseFloat(op.valorVenda),
    valorComissao: parseFloat(op.valorComissao),
    valorEntrada: op.valorEntrada ? parseFloat(op.valorEntrada) : null,
    cedente: {
      tipo: cedenteTipo,
      razaoSocial: imobiliaria?.razaoSocial ?? corretor?.nome ?? "—",
      cnpj: imobiliaria?.cnpj ?? null,
      nomeResponsavel: corretor?.nome ?? "—",
      bancoNome: imobiliaria?.bancoNome ?? null,
      bancoCodigo: imobiliaria?.bancoCodigo ?? null,
      bancoAgencia: imobiliaria?.bancoAgencia ?? null,
      bancoConta: imobiliaria?.bancoConta ?? null,
      bancoPix: null,
    },
    construtora: {
      razaoSocial: constru.razaoSocial,
      cnpj: constru.cnpj,
    },
    pagadorTipo:
      op.pagadorTipo === "compradores" ? "compradores" : "construtora",
    compradores: compradoresRows.map((c) => ({
      tipoPessoa: c.tipoPessoa as "fisica" | "juridica",
      nome: c.nome,
      documento: c.documento,
      telefone: c.telefone,
      email: c.email,
      endereco: c.endereco,
      cidade: c.cidade,
      uf: c.uf,
      cep: c.cep,
    })),
    fundo,
    comercial,
    parcelas,
    custos,
    totais,
  };
}

async function isConstrutoraOwner(userId: string, construtoraId: string) {
  const [c] = await db
    .select({ ownerUserId: construtoras.ownerUserId })
    .from(construtoras)
    .where(eq(construtoras.id, construtoraId))
    .limit(1);
  return c?.ownerUserId === userId;
}

async function isFundoOwner(userId: string, fundoId: string) {
  const [f] = await db
    .select({ ownerUserId: fundos.ownerUserId })
    .from(fundos)
    .where(eq(fundos.id, fundoId))
    .limit(1);
  return f?.ownerUserId === userId;
}
