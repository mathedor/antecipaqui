"use client";

import { useMemo, useState } from "react";
import { formatBRL, valorPresenteParcelasIguais } from "@/lib/format";
import { CtaCadastro } from "@/components/cta-buttons";

type CalculadoraProps = {
  /** Taxa mensal sugerida vinda do admin (ex: 0.06 = 6%). Default 0.06. */
  taxaMensalSugerida?: number;
};

const PRESETS = [
  { valor: 30000, parcelas: 2, label: "Comissão pequena" },
  { valor: 80000, parcelas: 3, label: "Padrão" },
  { valor: 150000, parcelas: 4, label: "Grande" },
];

export function Calculadora({
  taxaMensalSugerida = 0.06,
}: CalculadoraProps = {}) {
  const TAXA_MENSAL = taxaMensalSugerida;
  const [valor, setValor] = useState(80000);
  const [parcelas, setParcelas] = useState(3);

  const resultado = useMemo(() => {
    const valorHoje = valorPresenteParcelasIguais(valor, parcelas, TAXA_MENSAL);
    const desagio = valor - valorHoje;
    const desagioPercent = desagio / valor;
    return {
      valorHoje,
      desagio,
      desagioPercent,
      valorParcela: valor / parcelas,
    };
  }, [valor, parcelas, TAXA_MENSAL]);

  return (
    <div className="rounded-3xl border border-border bg-bg-elev shadow-xl overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Inputs side */}
        <div className="p-7 md:p-9 border-b md:border-b-0 md:border-r border-border bg-bg-elev">
          <div className="flex items-center justify-between mb-2">
            <div className="eyebrow">simulador</div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
            Quanto você recebe hoje?
          </h3>
          <p className="mt-2 text-sm text-fg-muted">
            Arraste pra simular. O cálculo é em tempo real.
          </p>
          <p className="mt-1 text-[11px] text-fg-dim italic">
            A taxa final é definida pelo fundo na aprovação da operação e
            aparece no borderô.
          </p>

          {/* Presets */}
          <div className="mt-6 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setValor(p.valor);
                  setParcelas(p.parcelas);
                }}
                className={`chip transition-colors hover:border-accent hover:text-accent ${
                  valor === p.valor && parcelas === p.parcelas
                    ? "chip-accent"
                    : ""
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Slider — valor */}
          <div className="mt-7">
            <div className="flex items-baseline justify-between mb-3">
              <label htmlFor="valor" className="text-sm font-medium text-fg-muted">
                Valor da comissão
              </label>
              <span className="font-mono tabular text-fg font-semibold">
                {formatBRL(valor)}
              </span>
            </div>
            <input
              id="valor"
              type="range"
              min={5000}
              max={500000}
              step={1000}
              value={valor}
              onChange={(e) => setValor(Number(e.target.value))}
              className="range-slider"
            />
            <div className="flex justify-between mt-2 text-[10px] font-mono text-fg-dim uppercase tracking-wider">
              <span>R$ 5 mil</span>
              <span>R$ 500 mil</span>
            </div>
          </div>

          {/* Slider — parcelas */}
          <div className="mt-7">
            <div className="flex items-baseline justify-between mb-3">
              <label htmlFor="parcelas" className="text-sm font-medium text-fg-muted">
                Parcelas da comissão
              </label>
              <span className="font-mono tabular text-fg font-semibold">
                {parcelas}x de {formatBRL(resultado.valorParcela)}
              </span>
            </div>
            <input
              id="parcelas"
              type="range"
              min={1}
              max={5}
              step={1}
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value))}
              className="range-slider"
            />
            <div className="flex justify-between mt-2 text-[10px] font-mono text-fg-dim uppercase tracking-wider">
              <span>1x</span>
              <span>5x · 150 dias</span>
            </div>
          </div>
        </div>

        {/* Result side */}
        <div className="p-7 md:p-9 bg-bg-dark text-fg-inverse relative overflow-hidden">
          <div className="absolute inset-0 bg-mesh-dark pointer-events-none" aria-hidden />
          <div className="relative">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-fg-inverse/70 mb-2">
              receba amanhã
            </div>
            <div className="font-mono tabular text-4xl md:text-6xl font-bold tracking-tight text-gradient-blue leading-tight">
              {formatBRL(resultado.valorHoje)}
            </div>
            <div className="mt-2 text-fg-inverse text-base md:text-lg font-semibold">
              na sua conta!
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 space-y-3 text-sm">
              <Row
                label="Comissão total parcelada"
                value={formatBRL(valor)}
                emphasis="muted"
              />
              <Row
                label="Diluído em"
                value={`${parcelas}x`}
                emphasis="muted"
              />
              <Row
                label="Deságio (juros)"
                value={`− ${formatBRL(resultado.desagio)}`}
                emphasis="warn"
              />
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <Stat
                label="liquidez"
                value="1 dia"
              />
              <Stat
                label="aprovação"
                value="24h"
              />
              <Stat
                label="burocracia"
                value="zero"
              />
            </div>

            <CtaCadastro className="btn-primary !w-full justify-center mt-8 !h-12">
              Quero antecipar minha comissão <span className="arrow">→</span>
            </CtaCadastro>
            <p className="mt-3 text-[10px] text-fg-inverse/50 text-center font-mono">
              Cadastro grátis · sem cartão · sem compromisso
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis = "default",
}: {
  label: string;
  value: string;
  emphasis?: "default" | "muted" | "warn";
}) {
  const valueColor =
    emphasis === "warn"
      ? "text-orange-300"
      : emphasis === "muted"
        ? "text-fg-inverse/80"
        : "text-fg-inverse";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-fg-inverse/60 text-xs uppercase tracking-wider font-mono">
        {label}
      </span>
      <span className={`font-mono tabular ${valueColor}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
      <div className="font-mono tabular text-lg font-semibold">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-inverse/60 mt-0.5">
        {label}
      </div>
    </div>
  );
}
