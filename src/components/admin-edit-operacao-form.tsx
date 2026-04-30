"use client";

import { useActionState, useEffect, useState } from "react";
import {
  editOperacaoAction,
  type EditOperacaoState,
} from "@/lib/actions/admin-edit";
import { parseBRLNumber } from "@/lib/format";

type Parcela = { valor: string; vencimento: string };

type Props = {
  operacao: {
    id: string;
    numero: string;
    valorVenda: string;
    valorComissao: string;
    dataVenda: string;
  };
  parcelas: Array<{ numero: number; valor: string; vencimento: string }>;
};

function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function numberToMask(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AdminEditOperacaoForm({ operacao, parcelas: initial }: Props) {
  const [state, action, pending] = useActionState<EditOperacaoState, FormData>(
    editOperacaoAction,
    null,
  );

  const [valorVenda, setValorVenda] = useState(
    numberToMask(parseFloat(operacao.valorVenda)),
  );
  const [valorComissao, setValorComissao] = useState(
    numberToMask(parseFloat(operacao.valorComissao)),
  );
  const [dataVenda, setDataVenda] = useState(operacao.dataVenda);
  const [parcelas, setParcelas] = useState<Parcela[]>(
    initial.map((p) => ({
      valor: numberToMask(parseFloat(p.valor)),
      vencimento: p.vencimento,
    })),
  );

  // Total das parcelas pra mostrar diferença em relação à comissão
  const totalParcelas = parcelas.reduce(
    (s, p) => s + parseBRLNumber(p.valor),
    0,
  );
  const valorComissaoNum = parseBRLNumber(valorComissao);
  const diff = totalParcelas - valorComissaoNum;

  useEffect(() => {
    if (state?.ok) {
      // server action faz redirect — não precisa router.push aqui
    }
  }, [state]);

  function updateParcela(idx: number, key: keyof Parcela, value: string) {
    setParcelas((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }

  function setNumParcelas(n: number) {
    n = Math.min(Math.max(n, 1), 4);
    if (n === parcelas.length) return;
    if (n > parcelas.length) {
      // adiciona com vencimento default 30 dias após a última
      const last = parcelas[parcelas.length - 1];
      const lastVenc = last
        ? new Date(last.vencimento + "T00:00:00")
        : new Date();
      const novas: Parcela[] = [];
      const valorPorParcela = valorComissaoNum / n;
      for (let i = parcelas.length; i < n; i++) {
        const v = new Date(lastVenc);
        v.setMonth(v.getMonth() + (i - parcelas.length + 1));
        novas.push({
          valor: numberToMask(valorPorParcela),
          vencimento: v.toISOString().slice(0, 10),
        });
      }
      // recalcula todas pra dividir igual
      const todas = [...parcelas, ...novas].map((p) => ({
        ...p,
        valor: numberToMask(valorComissaoNum / n),
      }));
      setParcelas(todas);
    } else {
      // remove do final + redivide
      const cortadas = parcelas.slice(0, n).map((p) => ({
        ...p,
        valor: numberToMask(valorComissaoNum / n),
      }));
      setParcelas(cortadas);
    }
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="operacaoId" value={operacao.id} />
      <input type="hidden" name="parcelas" value={JSON.stringify(parcelas)} />

      {state && !state.ok && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
          {state.error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
        <h3 className="font-bold mb-5">Operação · {operacao.numero}</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Valor da venda *">
            <input
              name="valorVenda"
              required
              value={valorVenda}
              onChange={(e) => setValorVenda(maskCurrency(e.target.value))}
              inputMode="numeric"
              className="form-input tabular text-right"
            />
          </Field>
          <Field label="Valor da comissão *">
            <input
              name="valorComissao"
              required
              value={valorComissao}
              onChange={(e) => setValorComissao(maskCurrency(e.target.value))}
              inputMode="numeric"
              className="form-input tabular text-right"
            />
          </Field>
          <Field label="Data da venda *">
            <input
              name="dataVenda"
              type="date"
              required
              value={dataVenda}
              onChange={(e) => setDataVenda(e.target.value)}
              className="form-input"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
        <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
          <h3 className="font-bold">Parcelas</h3>
          <div className="flex items-end gap-3">
            <Field label="Quantidade (1-4)">
              <input
                type="number"
                min={1}
                max={4}
                value={parcelas.length}
                onChange={(e) => setNumParcelas(parseInt(e.target.value) || 1)}
                className="form-input !w-24"
              />
            </Field>
          </div>
        </div>
        <ul className="space-y-2">
          {parcelas.map((p, i) => (
            <li key={i} className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-1 font-mono text-[10px] text-fg-dim text-center">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <input
                type="date"
                value={p.vencimento}
                onChange={(e) => updateParcela(i, "vencimento", e.target.value)}
                className="form-input col-span-6 !h-10"
              />
              <div className="col-span-5 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted text-xs font-mono pointer-events-none">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={p.valor}
                  onChange={(e) =>
                    updateParcela(i, "valor", maskCurrency(e.target.value))
                  }
                  className="form-input !h-10 !pl-8 tabular text-right"
                />
              </div>
            </li>
          ))}
        </ul>
        {Math.abs(diff) > 0.5 && (
          <p className="mt-3 text-xs text-warn">
            ⚠ Soma das parcelas (R$ {totalParcelas.toFixed(2)}) difere da
            comissão (R$ {valorComissaoNum.toFixed(2)}) em{" "}
            R$ {Math.abs(diff).toFixed(2)}
          </p>
        )}
      </section>

      <button type="submit" disabled={pending} className="btn-primary !h-12 !px-6">
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}
