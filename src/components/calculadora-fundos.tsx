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
   *  pro fundo selecionado e a tabela mostra "(custom)". */
  taxaCustom?: number;
};

/**
 * Calculadora comparativa de fundos.
 * Mostra cada fundo com sua taxa-base + VP/deságio calculados sobre as
 * parcelas da operação. Admin clica num fundo pra selecioná-lo.
 */
export function CalculadoraFundos({
  fundos,
  parcelas,
  valorComissao,
  selectedFundoId,
  onSelect,
  taxaCustom,
}: Props) {
  const linhas = useMemo(
    () =>
      fundos.map((f) => {
        const taxa =
          f.id === selectedFundoId && taxaCustom ? taxaCustom : parseFloat(f.taxaMensalBase);
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

  // Calcula melhor fundo (menor deságio = mais paga ao corretor)
  const best = linhas.reduce((b, c) => (c.vp > b.vp ? c : b), linhas[0]);

  return (
    <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
      <div className="px-4 py-3 bg-bg-card border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim">
            calculadora comparativa de fundos
          </div>
          <p className="text-xs text-fg-muted mt-0.5">
            Selecione o fundo. VP e deságio calculados com a taxa-base de cada
            um sobre as parcelas dessa operação.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            comissão da operação
          </div>
          <div className="font-mono tabular text-base font-bold text-fg">
            {formatBRL(valorComissao)}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border">
              <th className="px-3 py-2 text-left">Selecionar</th>
              <th className="px-3 py-2 text-left">Fundo</th>
              <th className="px-3 py-2 text-right">Taxa</th>
              <th className="px-3 py-2 text-right">VP (recebido)</th>
              <th className="px-3 py-2 text-right">Deságio</th>
              <th className="px-3 py-2 text-right">% deságio</th>
              <th className="px-3 py-2 text-center">Recom.</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const selected = l.fundo.id === selectedFundoId;
              const isBest = l.fundo.id === best.fundo.id;
              return (
                <tr
                  key={l.fundo.id}
                  onClick={() => onSelect(l.fundo.id)}
                  className={`border-b border-border last:border-0 cursor-pointer transition-colors ${
                    selected
                      ? "bg-accent-soft hover:bg-accent-soft/70"
                      : "hover:bg-bg-card"
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="radio"
                      name="calculadora-fundo"
                      checked={selected}
                      onChange={() => onSelect(l.fundo.id)}
                      className="size-4 accent-current text-accent"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-fg text-sm">
                      {l.fundo.nomeFantasia ?? l.fundo.razaoSocial}
                    </div>
                    {l.fundo.nomeFantasia && (
                      <div className="text-[10px] text-fg-muted">
                        {l.fundo.razaoSocial}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular text-sm">
                    {(l.taxa * 100).toFixed(2).replace(".", ",")}%
                    {l.isCustom && (
                      <div className="text-[9px] uppercase font-mono text-accent">
                        custom
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular text-sm font-semibold text-fg">
                    {formatBRL(l.vp)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular text-sm text-warn">
                    − {formatBRL(l.desagio)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular text-xs text-fg-muted">
                    {l.pctDesagio.toFixed(2).replace(".", ",")}%
                  </td>
                  <td className="px-3 py-3 text-center">
                    {isBest && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-green-50 text-success border-green-200">
                        ✓ melhor
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[10px] text-fg-dim border-t border-border bg-bg-card">
        Recomendado: o fundo com maior VP entrega mais dinheiro ao cedente — o
        deságio (lucro do fundo) é menor.
      </p>
    </div>
  );
}
