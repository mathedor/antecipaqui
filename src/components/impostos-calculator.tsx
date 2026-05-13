"use client";

import { useMemo, useState } from "react";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseBRL(v: string): number {
  const cleaned = v
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function maskBRL(v: string): string {
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  const n = parseInt(d, 10) / 100;
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Calculadora simples de impostos sobre comissão.
 *  - ISS: varia por cidade (2-5%, default 5%)
 *  - PIS: 0,65% (regime cumulativo) ou 1,65% (não-cumulativo)
 *  - COFINS: 3% (cumulativo) ou 7,6% (não-cumulativo)
 *  - IRPJ + CSLL: depende do regime tributário — não cobrimos aqui
 *
 *  Usado pelo corretor pra estimar quanto sobra líquido. Não é cálculo
 *  oficial — só estimativa orientativa. */
export function ImpostosCalculator() {
  const [comissaoStr, setComissaoStr] = useState("");
  const [issStr, setIssStr] = useState("5");
  const [regime, setRegime] = useState<"cumulativo" | "nao-cumulativo">(
    "cumulativo",
  );

  const comissao = parseBRL(comissaoStr);
  const issPct = parseFloat(issStr.replace(",", ".")) / 100;
  const pisPct = regime === "cumulativo" ? 0.0065 : 0.0165;
  const cofinsPct = regime === "cumulativo" ? 0.03 : 0.076;

  const calc = useMemo(() => {
    if (comissao <= 0) return null;
    const iss = comissao * issPct;
    const pis = comissao * pisPct;
    const cofins = comissao * cofinsPct;
    const totalImpostos = iss + pis + cofins;
    return {
      iss,
      pis,
      cofins,
      totalImpostos,
      liquido: comissao - totalImpostos,
    };
  }, [comissao, issPct, pisPct, cofinsPct]);

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-6">
      <h3 className="font-bold mb-1">Calculadora de impostos</h3>
      <p className="text-xs text-fg-muted mb-5">
        Estimativa de tributos sobre a comissão (ISS, PIS, COFINS). Não inclui
        IRPJ/CSLL nem retenções específicas — consulte seu contador.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Valor da comissão (R$)
          </label>
          <input
            value={comissaoStr}
            onChange={(e) => setComissaoStr(maskBRL(e.target.value))}
            inputMode="numeric"
            placeholder="0,00"
            className="form-input tabular text-right"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            ISS (%)
          </label>
          <input
            value={issStr}
            onChange={(e) => setIssStr(e.target.value)}
            inputMode="decimal"
            className="form-input"
          />
          <p className="text-[10px] text-fg-dim mt-1">
            Varia por cidade (2-5%)
          </p>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Regime
          </label>
          <select
            value={regime}
            onChange={(e) =>
              setRegime(e.target.value as "cumulativo" | "nao-cumulativo")
            }
            className="form-input"
          >
            <option value="cumulativo">Cumulativo (Lucro Presumido)</option>
            <option value="nao-cumulativo">
              Não-cumulativo (Lucro Real)
            </option>
          </select>
        </div>
      </div>

      {calc && (
        <div className="rounded-xl border border-border bg-bg p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="ISS" value={fmtBRL(calc.iss)} tone="warn" />
            <Stat label="PIS" value={fmtBRL(calc.pis)} tone="warn" />
            <Stat label="COFINS" value={fmtBRL(calc.cofins)} tone="warn" />
            <Stat
              label="Total impostos"
              value={fmtBRL(calc.totalImpostos)}
              tone="warn"
            />
          </div>
          <div className="border-t border-border pt-4 flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
              comissão líquida
            </span>
            <span className="text-2xl font-bold text-success tabular">
              {fmtBRL(calc.liquido)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono text-sm font-bold ${tone === "warn" ? "text-warn" : "text-fg"}`}
      >
        {value}
      </div>
    </div>
  );
}
