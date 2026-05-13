"use client";

import { useMemo, useState } from "react";
import { valorPresenteParcelasIguais } from "@/lib/format";

type FundoOption = {
  id: string;
  nome: string;
  taxaMensal: number;
};

type Props = {
  fundos: FundoOption[];
  taxaPadrao: number;
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function fmtPct(v: number, digits = 2) {
  return `${(v * 100).toFixed(digits).replace(".", ",")}%`;
}

function parseBRL(s: string): number {
  const cleaned = s
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function SimuladorAntecipacao({ fundos, taxaPadrao }: Props) {
  const [comissaoInput, setComissaoInput] = useState("50000");
  const [parcelas, setParcelas] = useState(6);
  const [aguardarMeses, setAguardarMeses] = useState(0);

  const comissao = parseBRL(comissaoInput);

  // Cenários
  const cenarios = useMemo(() => {
    if (fundos.length === 0) {
      return [
        {
          fundoId: "default",
          fundoNome: "Taxa padrão do sistema",
          taxaMensal: taxaPadrao,
          vpAgora: valorPresenteParcelasIguais(comissao, parcelas, taxaPadrao),
          custo: 0,
        },
      ].map((c) => ({ ...c, custo: comissao - c.vpAgora }));
    }
    return fundos.map((f) => {
      const vpAgora = valorPresenteParcelasIguais(
        comissao,
        parcelas,
        f.taxaMensal,
      );
      return {
        fundoId: f.id,
        fundoNome: f.nome,
        taxaMensal: f.taxaMensal,
        vpAgora,
        custo: comissao - vpAgora,
      };
    });
  }, [fundos, comissao, parcelas, taxaPadrao]);

  // Cenário com melhor (menor custo / maior VP)
  const melhor = cenarios.reduce((best, c) =>
    !best || c.vpAgora > best.vpAgora ? c : best,
  );

  // Se esperar N meses
  const cenarioEsperar = useMemo(() => {
    if (aguardarMeses <= 0) return null;
    // Esperar X meses significa que X parcelas já foram pagas pela
    // construtora, sobram (parcelas - X) parcelas pra antecipar
    const parcelasRestantes = Math.max(1, parcelas - aguardarMeses);
    const comissaoRestante = comissao * (parcelasRestantes / parcelas);
    const jaRecebeuConstrutora = comissao - comissaoRestante;
    const taxa = melhor.taxaMensal;
    const vpRestante = valorPresenteParcelasIguais(
      comissaoRestante,
      parcelasRestantes,
      taxa,
    );
    const totalRecebido = jaRecebeuConstrutora + vpRestante;
    return {
      jaRecebeuConstrutora,
      vpRestante,
      totalRecebido,
      diferenca: totalRecebido - melhor.vpAgora,
    };
  }, [aguardarMeses, parcelas, comissao, melhor]);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <h2 className="text-lg font-bold tracking-tight mb-4">
          Parâmetros da operação
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Valor da comissão">
            <div className="flex items-stretch rounded-xl border border-border-strong overflow-hidden focus-within:border-accent transition-colors">
              <span className="bg-bg-soft px-3 flex items-center text-fg-muted text-sm font-mono border-r border-border-strong">
                R$
              </span>
              <input
                value={comissaoInput}
                onChange={(e) => setComissaoInput(e.target.value)}
                inputMode="numeric"
                className="flex-1 min-w-0 bg-bg h-12 px-3 text-fg outline-none tabular text-right"
              />
            </div>
          </Field>
          <Field label="Em quantas parcelas mensais a construtora paga?">
            <input
              type="number"
              value={parcelas}
              onChange={(e) => setParcelas(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={36}
              className="form-input"
            />
          </Field>
          <Field
            label="E se eu esperar X meses antes de antecipar?"
            help="Receber parcelas direto + antecipar o restante"
          >
            <input
              type="number"
              value={aguardarMeses}
              onChange={(e) =>
                setAguardarMeses(Math.max(0, parseInt(e.target.value) || 0))
              }
              min={0}
              max={parcelas - 1}
              className="form-input"
            />
          </Field>
        </div>
      </section>

      {/* Cenário ESPERAR — se ativo */}
      {cenarioEsperar && (
        <section
          className={`rounded-2xl border p-5 md:p-6 ${
            cenarioEsperar.diferenca > 0
              ? "border-success/40 bg-green-50"
              : "border-warn/40 bg-yellow-50"
          }`}
        >
          <h3 className="font-bold mb-2">
            E se você esperar {aguardarMeses}{" "}
            {aguardarMeses === 1 ? "mês" : "meses"}?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                Já recebido da construtora
              </div>
              <div className="font-mono tabular text-lg font-bold text-fg">
                {fmtBRL(cenarioEsperar.jaRecebeuConstrutora)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                Antecipar restante (melhor fundo)
              </div>
              <div className="font-mono tabular text-lg font-bold text-fg">
                {fmtBRL(cenarioEsperar.vpRestante)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                Total recebido
              </div>
              <div
                className={`font-mono tabular text-lg font-bold ${
                  cenarioEsperar.diferenca > 0 ? "text-success" : "text-warn"
                }`}
              >
                {fmtBRL(cenarioEsperar.totalRecebido)}
              </div>
              <div
                className={`text-[10px] mt-0.5 ${
                  cenarioEsperar.diferenca > 0 ? "text-success" : "text-warn"
                }`}
              >
                {cenarioEsperar.diferenca >= 0 ? "+" : ""}
                {fmtBRL(cenarioEsperar.diferenca)} vs antecipar tudo agora
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Comparativo de fundos */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <h2 className="text-lg font-bold tracking-tight mb-1">
          Antecipar TODA a comissão agora — comparativo por fundo
        </h2>
        <p className="text-xs text-fg-muted mb-5">
          Cada fundo tem sua taxa. Quanto menor a taxa, mais você recebe.
        </p>

        <div className="space-y-2">
          {cenarios.map((c) => {
            const isBest = c.fundoId === melhor.fundoId;
            const custoPct = comissao > 0 ? c.custo / comissao : 0;
            return (
              <div
                key={c.fundoId}
                className={`rounded-xl border p-4 ${
                  isBest
                    ? "border-success bg-green-50"
                    : "border-border bg-bg"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-fg">{c.fundoNome}</span>
                    {isBest && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono font-semibold bg-success text-white">
                        melhor taxa
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-fg-muted">
                    {fmtPct(c.taxaMensal)} a.m.
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <Mini
                    label="Recebe agora"
                    value={fmtBRL(c.vpAgora)}
                    tone="success"
                  />
                  <Mini
                    label="Custo da antecipação"
                    value={fmtBRL(c.custo)}
                    tone="warn"
                  />
                  <Mini
                    label="% do total"
                    value={fmtPct(custoPct, 1)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
        {label}
      </label>
      {children}
      {help && <p className="mt-1 text-[10px] text-fg-muted">{help}</p>}
    </div>
  );
}

function Mini({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn";
}) {
  const valueCls =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : "text-fg";
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className={`font-mono tabular text-base font-bold ${valueCls}`}>
        {value}
      </div>
    </div>
  );
}
