import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  fundos,
  operacoes,
  parcelasComissao,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { CnabRetornoUpload } from "@/components/cnab-retorno-upload";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Admin · CNAB" };

function formatDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

type Params = { params: Promise<{ id: string }> };

export default async function FundoCnabPage({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, id))
    .limit(1);
  if (!fundo) notFound();

  // Parcelas pendentes de envio (com nosso_numero, ainda não pagas)
  const pendentes = await db
    .select({
      id: parcelasComissao.id,
      numero: parcelasComissao.numero,
      valor: parcelasComissao.valor,
      vencimento: parcelasComissao.vencimento,
      nossoNumero: parcelasComissao.nossoNumero,
      cobrancaStatus: parcelasComissao.cobrancaStatus,
      operacaoNumero: operacoes.numero,
      construtoraNome: construtoras.razaoSocial,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .leftJoin(construtoras, eq(construtoras.id, operacoes.construtoraId))
    .where(
      and(
        eq(operacoes.fundoId, id),
        isNotNull(parcelasComissao.nossoNumero),
        isNull(parcelasComissao.pagoEm),
      ),
    )
    .orderBy(parcelasComissao.vencimento)
    .limit(200);

  // Sem nosso_numero ainda
  const aReservar = await db
    .select({
      qtd: sql<number>`COUNT(*)::int`,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .where(
      and(
        eq(operacoes.fundoId, id),
        isNull(parcelasComissao.nossoNumero),
        isNull(parcelasComissao.pagoEm),
        sql`${operacoes.status} IN ('enviada_para_pagamento','realizada')`,
      ),
    );

  const totalAReservar = aReservar[0]?.qtd ?? 0;
  const totalPendentes = pendentes.length;

  return (
    <AdminShell active="/admin/fundos" userName={admin.nome}>
      <Link
        href={`/admin/fundos/${id}/editar`}
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← editar fundo
      </Link>

      <h1 className="text-display-md mb-2">
        CNAB — <span className="text-gradient-blue">{fundo.nomeFantasia ?? fundo.razaoSocial}</span>
      </h1>
      <p className="text-fg-muted mb-8">
        Geração de remessa de cobrança e importação de retorno do banco.
      </p>

      {fundo.boletosModo !== "cnab" && (
        <div className="rounded-2xl border border-warn/40 bg-yellow-50 p-5 mb-6 text-sm text-warn">
          ⚠ Este fundo não está configurado em modo CNAB. Atual:{" "}
          <strong>{fundo.boletosModo}</strong>. Pra usar remessa/retorno
          troque o modo em{" "}
          <Link
            href={`/admin/fundos/${id}/editar`}
            className="underline font-semibold"
          >
            editar fundo
          </Link>
          .
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* GERAR REMESSA */}
        <section className="rounded-2xl border border-border bg-bg-elev p-6">
          <h2 className="font-bold mb-1">Gerar remessa</h2>
          <p className="text-xs text-fg-muted mb-4">
            Cria arquivo CNAB 240 com todas as parcelas pendentes que já têm
            nosso_número reservado.
          </p>
          <div className="space-y-2 text-sm mb-5">
            <div className="flex justify-between">
              <span className="text-fg-muted">Prontas pra remessa</span>
              <span className="font-mono font-bold text-accent">
                {totalPendentes}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-muted">Sem nosso_número ainda</span>
              <span className="font-mono">{totalAReservar}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-fg-muted">Próximo nosso_número</span>
              <span className="font-mono">
                {String(fundo.cnabProximoNossoNumero).padStart(10, "0")}
              </span>
            </div>
          </div>
          <a
            href={`/api/borderos/cnab-remessa/${id}`}
            target="_blank"
            rel="noopener"
            className={`inline-flex items-center gap-2 h-10 px-5 rounded-lg font-semibold text-sm ${
              totalPendentes > 0
                ? "bg-accent text-white hover:bg-accent-dark"
                : "bg-bg-card text-fg-dim cursor-not-allowed pointer-events-none"
            }`}
          >
            ⬇ Baixar .REM
          </a>
        </section>

        {/* IMPORTAR RETORNO */}
        <section className="rounded-2xl border border-border bg-bg-elev p-6">
          <h2 className="font-bold mb-1">Importar retorno</h2>
          <p className="text-xs text-fg-muted mb-4">
            Cole/upload o arquivo .RET do banco. Liquidações são parseadas e
            parcelas baixadas em lote (match por nosso_número).
          </p>
          <CnabRetornoUpload fundoId={id} />
        </section>
      </div>

      {/* Lista de pendentes */}
      <h3 className="font-bold mb-3">
        Parcelas pendentes ({totalPendentes})
      </h3>
      {pendentes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-8 text-center text-sm text-fg-muted">
          Sem parcelas com nosso_número reservado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-bg-elev">
          <table className="w-full text-sm table-cards">
            <thead>
              <tr className="bg-bg-card border-b border-border text-left">
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                  Op
                </th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                  Parc
                </th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                  Vencimento
                </th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim text-right">
                  Valor
                </th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                  Construtora
                </th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                  Nosso nº
                </th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border hover:bg-bg-card"
                >
                  <td className="px-3 py-2 font-mono">{p.operacaoNumero}</td>
                  <td className="px-3 py-2 font-mono">{p.numero}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatDate(p.vencimento)}
                  </td>
                  <td className="px-3 py-2 font-mono text-right">
                    {formatBRL(parseFloat(p.valor))}
                  </td>
                  <td className="px-3 py-2 truncate max-w-[200px]">
                    {p.construtoraNome ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {p.nossoNumero}
                  </td>
                  <td className="px-3 py-2 text-xs text-fg-muted">
                    {p.cobrancaStatus ?? "pendente"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
