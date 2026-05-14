/** Backup diário: gera export JSON consolidado de todas as operações
 *  e salva no Vercel Blob com nome timestampado. Retenção é manual.
 *
 *  Configurar em vercel.json:
 *    { "path": "/api/cron/backup-diario", "schedule": "0 3 * * *" }
 */
import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { eq, inArray } from "drizzle-orm";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    const custom = req.headers.get("x-cron-secret");
    if (auth !== `Bearer ${expected}` && custom !== expected) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN ausente" },
      { status: 500 },
    );
  }

  // Mesmo payload do /api/admin/export-json (mas sem filtros)
  const ops = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      dataVenda: operacoes.dataVenda,
      valorVenda: operacoes.valorVenda,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      desagio: operacoes.desagio,
      taxaMensal: operacoes.taxaMensal,
      taxaFundoSnapshot: operacoes.taxaFundoSnapshot,
      createdAt: operacoes.createdAt,
      aprovadoEm: operacoes.aprovadoEm,
      liquidadoEm: operacoes.liquidadoEm,
      construtoraNome: construtoras.razaoSocial,
      construtoraCnpj: construtoras.cnpj,
      fundoNome: fundos.razaoSocial,
      imobNome: imobiliarias.razaoSocial,
      corretorNome: users.nome,
      comercialNome: comerciais.nomeCompleto,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .leftJoin(fundos, eq(operacoes.fundoId, fundos.id))
    .leftJoin(imobiliarias, eq(operacoes.imobiliariaId, imobiliarias.id))
    .leftJoin(users, eq(users.id, operacoes.corretorUserId))
    .leftJoin(comerciais, eq(operacoes.comercialId, comerciais.id));

  const opsIds = ops.map((o) => o.id);
  const [parcelas, custos, compradores] = await Promise.all([
    opsIds.length
      ? db
          .select()
          .from(parcelasComissao)
          .where(inArray(parcelasComissao.operacaoId, opsIds))
      : [],
    opsIds.length
      ? db
          .select()
          .from(custosOperacao)
          .where(inArray(custosOperacao.operacaoId, opsIds))
      : [],
    opsIds.length
      ? db
          .select()
          .from(operacaoCompradores)
          .where(inArray(operacaoCompradores.operacaoId, opsIds))
      : [],
  ]);

  const result = {
    exportedAt: new Date().toISOString(),
    count: ops.length,
    operacoes: ops,
    parcelas,
    custos,
    compradores,
  };

  const json = JSON.stringify(result);
  const buffer = Buffer.from(json, "utf-8");
  const ts = new Date()
    .toISOString()
    .replace(/[-:.]/g, "")
    .slice(0, 14);
  const pathname = `backups/antecipaqui_${ts}.json`;

  const blob = await put(pathname, buffer, {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });

  return NextResponse.json({
    ok: true,
    pathname: blob.pathname,
    size: buffer.length,
    operacoesCount: ops.length,
    timestamp: new Date().toISOString(),
  });
}
