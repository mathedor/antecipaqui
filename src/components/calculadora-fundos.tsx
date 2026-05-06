"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatBRL, valorPresente } from "@/lib/format";

type FundoOption = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  taxaMensalBase: string; // decimal 0.06
};

type Parcela = { valor: number; mesesAteVencimento: number };

type Props = {
  fundos: FundoOption[];
  parcelas: Parcela[];
  valorComissao: number;
  selectedFundoId: string | null;
  onSelect: (fundoId: string) => void;
  /** Taxa custom que o admin definiu (override). Se passada, é usada
   *  pro fundo selecionado e o card mostra "(custom)". */
  taxaCustom?: number;
  /** Opcional — valor total da venda, exibido no card de resumo. */
  valorVenda?: number;
  /** Opcional — # de parcelas pra exibir. */
  numeroParcelas?: number;
};

/**
 * Calculadora comparativa de fundos.
 *
 * Layout: bloco esquerdo com infos da operação + grid de cards (um por
 * fundo) com VP/deságio/lucro pra cada um. Admin clica num card pra
 * selecioná-lo.
 */
export function CalculadoraFundos({
  fundos,
  parcelas,
  valorComissao,
  selectedFundoId,
  onSelect,
  taxaCustom,
  valorVenda,
  numeroParcelas,
}: Props) {
  const linhas = useMemo(
    () =>
      fundos.map((f) => {
        const taxa =
          f.id === selectedFundoId && taxaCustom
            ? taxaCustom
            : parseFloat(f.taxaMensalBase);
        const vp = valorPresente(parcelas, taxa);
        const desagio = valorComissao - vp;
        const pctDesagio =
          valorComissao > 0 ? (desagio / valorComissao) * 100 : 0;
        return {
          fundo: f,
          taxa,
          vp,
          desagio,
          pctDesagio,
          isCustom: f.id === selectedFundoId && taxaCustom !== undefined,
        };
      }),
    [fundos, parcelas, valorComissao, selectedFundoId, taxaCustom],
  );

  if (fundos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-warn/40 bg-yellow-50 p-4 text-sm text-warn">
        Nenhum fundo cadastrado. Cadastre fundos em{" "}
        <Link href="/admin/fundos" className="underline font-semibold">
          /admin/fundos
        </Link>{" "}
        antes de aprovar operações.
      </div>
    );
  }

  // Melhor fundo = maior VP (menor deságio entregue ao cedente)
  const best = linhas.reduce((b, c) => (c.vp > b.vp ? c : b), linhas[0]);
  const totalParcelas = numeroParcelas ?? parcelas.length;
  const prazoMedio =
    parcelas.length > 0
      ? parcelas.reduce((s, p) => s + p.mesesAteVencimento, 0) /
        parcelas.length
      : 0;

  return (
    <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-bg-card">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim">
          calculadora comparativa
        </div>
        <p className="text-xs text-fg-muted mt-0.5">
          Compare como a operação ficaria em cada fundo. Clique num card pra
          selecionar — taxa do fundo é aplicada e VP/deságio recalculados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 p-4">
        {/* Painel esquerdo: dados da operação */}
        <aside className="rounded-xl border border-accent/30 bg-accent-soft p-4 self-start sticky lg:top-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-3">
            dados da operação
          </div>
          {valorVenda !== undefined && (
            <Stat
              label="Valor da venda"
              value={formatBRL(valorVenda)}
            />
          )}
          <Stat
            label="Comissão"
            value={formatBRL(valorComissao)}
            highlight
          />
          <Stat
            label="Parcelas"
            value={`${totalParcelas}x`}
          />
          <Stat
            label="Prazo médio"
            value={`${prazoMedio.toFixed(1)} meses`}
          />
          <hr className="border-accent/20 my-3" />
          <p className="text-[10px] text-fg-muted leading-relaxed">
            VP = valor presente (líquido pago ao cedente). Deságio = lucro do
            fundo. Cards à direita ordenados pelo melhor VP (mais favorável ao
            cedente) primeiro.
          </p>
        </aside>

        {/* Cards de fundos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...linhas]
            .sort((a, b) => b.vp - a.vp)
            .map((l) => {
              const selected = l.fundo.id === selectedFundoId;
              const isBest = l.fundo.id === best.fundo.id;
              return (
                <button
                  key={l.fundo.id}
                  type="button"
                  onClick={() => onSelect(l.fundo.id)}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                    selected
                      ? "border-accent bg-accent-soft shadow-sm"
                      : "border-border bg-bg hover:border-accent/40 hover:shadow-sm"
                  }`}
                >
                  {isBest && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] uppercase tracking-wider font-mono bg-green-50 text-success border-green-200 shadow-sm">
                      ★ melhor
                    </span>
                  )}

                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-fg text-sm truncate">
                        {l.fundo.nomeFantasia ?? l.fundo.razaoSocial}
                      </div>
                      {l.fundo.nomeFantasia && (
                        <div className="text-[10px] text-fg-muted truncate">
                          {l.fundo.razaoSocial}
                        </div>
                      )}
                    </div>
                    <div
                      className={`size-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        selected
                          ? "border-accent bg-accent text-white"
                          : "border-border-strong"
                      }`}
                    >
                      {selected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          className="size-3"
                          fill="currentColor"
                        >
                          <path d="M13.485 4.43a1 1 0 0 1 .085 1.41l-6 6.5a1 1 0 0 1-1.452.038l-3.5-3.5a1 1 0 0 1 1.414-1.414l2.752 2.752 5.29-5.696a1 1 0 0 1 1.411-.09z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <RowMini
                      label="Taxa a.m."
                      value={
                        <span>
                          {(l.taxa * 100).toFixed(2).replace(".", ",")}%
                          {l.isCustom && (
                            <span className="ml-1 text-[9px] uppercase font-mono text-accent">
                              custom
                            </span>
                          )}
                        </span>
                      }
                    />
                    <RowMini
                      label="VP (cedente)"
                      value={formatBRL(l.vp)}
                      highlight
                    />
                    <RowMini
                      label="Deságio"
                      value={`− ${formatBRL(l.desagio)}`}
                      tone="warn"
                    />
                    <RowMini
                      label="% deságio"
                      value={`${l.pctDesagio.toFixed(2).replace(".", ",")}%`}
                      tone="muted"
                    />
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div
        className={`font-mono tabular text-sm font-bold leading-tight ${
          highlight ? "text-accent text-base" : "text-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function RowMini({
  label,
  value,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  tone?: "default" | "warn" | "muted";
}) {
  const valueColor =
    tone === "warn"
      ? "text-warn"
      : tone === "muted"
        ? "text-fg-muted"
        : highlight
          ? "text-accent"
          : "text-fg";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </span>
      <span
        className={`font-mono tabular text-xs font-semibold ${valueColor}`}
      >
        {value}
      </span>
    </div>
  );
}