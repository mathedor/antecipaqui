"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPendingOperacoesAction,
  type CreatePendingState,
} from "@/lib/actions/pending-operacoes";
import { maskCNPJ, maskPhone } from "@/lib/cnpj";

type ImobOption = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
};

type Linha = {
  imobiliariaId: string; // "" = nova
  imobNova: {
    razaoSocial: string;
    cnpj: string;
    email: string;
    telefone: string;
  };
  corretorEmail: string;
  corretorNome: string;
  valorVenda: string;
  valorComissao: string;
  numeroParcelas: string;
  dataPrimeiraParcela: string;
  observacoes: string;
};

const blankLinha = (): Linha => ({
  imobiliariaId: "",
  imobNova: { razaoSocial: "", cnpj: "", email: "", telefone: "" },
  corretorEmail: "",
  corretorNome: "",
  valorVenda: "",
  valorComissao: "",
  numeroParcelas: "3",
  dataPrimeiraParcela: "",
  observacoes: "",
});

function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function LoteOperacoesForm({
  imobiliarias,
}: {
  imobiliarias: ImobOption[];
}) {
  const router = useRouter();
  const [linhas, setLinhas] = useState<Linha[]>([blankLinha()]);
  const [state, action, pending] = useActionState<
    CreatePendingState,
    FormData
  >(createPendingOperacoesAction, null);

  useEffect(() => {
    if (state?.ok) {
      // Reseta o form pra um estado limpo
      setLinhas([blankLinha()]);
      router.refresh();
    }
  }, [state, router]);

  function update(i: number, patch: Partial<Linha>) {
    setLinhas((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }
  function updateImobNova(i: number, patch: Partial<Linha["imobNova"]>) {
    setLinhas((prev) => {
      const next = [...prev];
      next[i] = {
        ...next[i],
        imobNova: { ...next[i].imobNova, ...patch },
      };
      return next;
    });
  }

  function addLinha() {
    setLinhas((prev) => [...prev, blankLinha()]);
  }
  function removeLinha(i: number) {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Total resumo (mini)
  const totalComissao = linhas.reduce((s, l) => {
    const v = l.valorComissao
      .replace(/\./g, "")
      .replace(",", ".");
    const n = parseFloat(v);
    return Number.isFinite(n) ? s + n : s;
  }, 0);

  return (
    <form
      onSubmit={(e) => {
        // Submete via action passando linhas serializadas
        e.preventDefault();
        const payload = linhas.map((l) => ({
          imobiliariaId: l.imobiliariaId || null,
          imobNova:
            l.imobiliariaId === "" && l.imobNova.razaoSocial
              ? l.imobNova
              : undefined,
          corretorEmail:
            l.imobiliariaId === ""
              ? l.imobNova.email || l.corretorEmail
              : l.corretorEmail,
          corretorNome: l.corretorNome,
          valorVenda: l.valorVenda,
          valorComissao: l.valorComissao,
          numeroParcelas: l.numeroParcelas,
          dataPrimeiraParcela: l.dataPrimeiraParcela,
          observacoes: l.observacoes,
        }));
        const fd = new FormData();
        fd.append("linhas", JSON.stringify(payload));
        action(fd);
      }}
      className="space-y-4"
    >
      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
          {state.error}
        </div>
      )}
      {state?.ok === true && (
        <div className="rounded-xl border border-success/40 bg-green-50 text-success p-4 text-sm">
          ✓ {state.total}{" "}
          {state.total === 1 ? "operação cadastrada" : "operações cadastradas"}
          . Os corretores foram avisados por email.
        </div>
      )}

      <ul className="space-y-3">
        {linhas.map((l, i) => (
          <LinhaCard
            key={i}
            linha={l}
            index={i}
            imobiliarias={imobiliarias}
            onChange={(patch) => update(i, patch)}
            onChangeImobNova={(patch) => updateImobNova(i, patch)}
            onRemove={
              linhas.length > 1 ? () => removeLinha(i) : undefined
            }
            applyMaskCurrency={maskCurrency}
          />
        ))}
      </ul>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={addLinha}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border-2 border-dashed border-accent/40 text-accent hover:bg-accent-soft hover:border-accent transition-colors font-semibold text-sm"
        >
          + Adicionar linha
        </button>
        <span className="text-xs text-fg-muted font-mono">
          {linhas.length}{" "}
          {linhas.length === 1 ? "operação" : "operações"} ·{" "}
          comissão total{" "}
          {totalComissao.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </span>
      </div>

      <div className="pt-4 border-t border-border">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary !h-12 !px-6"
        >
          {pending
            ? "Cadastrando..."
            : `Cadastrar ${linhas.length} ${linhas.length === 1 ? "operação" : "operações"}`}
        </button>
        <p className="mt-2 text-[11px] text-fg-muted">
          Cada cedente vai receber um email de convite com o link pra completar
          o cadastro (anexar contratos + NF) e simular a antecipação.
        </p>
      </div>
    </form>
  );
}

function LinhaCard({
  linha,
  index,
  imobiliarias,
  onChange,
  onChangeImobNova,
  onRemove,
  applyMaskCurrency,
}: {
  linha: Linha;
  index: number;
  imobiliarias: ImobOption[];
  onChange: (patch: Partial<Linha>) => void;
  onChangeImobNova: (patch: Partial<Linha["imobNova"]>) => void;
  onRemove?: () => void;
  applyMaskCurrency: (v: string) => string;
}) {
  const isNova = linha.imobiliariaId === "" && linha.imobNova.razaoSocial !== "";
  const [showNovaForm, setShowNovaForm] = useState(isNova);

  return (
    <li className="rounded-2xl border border-border bg-bg-elev p-4 md:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
          operação #{String(index + 1).padStart(2, "0")}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-fg-dim hover:text-danger transition-colors"
            title="Remover linha"
          >
            ✕ remover
          </button>
        )}
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
          Imobiliária / Corretor *
        </label>
        <div className="flex gap-2">
          <select
            value={linha.imobiliariaId}
            onChange={(e) => {
              onChange({ imobiliariaId: e.target.value });
              if (e.target.value !== "") setShowNovaForm(false);
            }}
            className="form-input !h-10 flex-1"
          >
            <option value="">— selecionar / cadastrar nova —</option>
            {imobiliarias.map((imob) => (
              <option key={imob.id} value={imob.id}>
                {imob.razaoSocial}
                {imob.nomeFantasia ? ` (${imob.nomeFantasia})` : ""} ·{" "}
                {imob.cnpj}
              </option>
            ))}
          </select>
          {!showNovaForm && linha.imobiliariaId === "" && (
            <button
              type="button"
              onClick={() => setShowNovaForm(true)}
              className="h-10 px-4 rounded-xl border border-accent/40 text-accent hover:bg-accent-soft text-xs font-semibold transition-colors whitespace-nowrap"
            >
              + cadastrar nova
            </button>
          )}
        </div>
      </div>

      {/* Imobiliária existente: mostra só email do corretor (override opcional) */}
      {linha.imobiliariaId !== "" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
              Email do cedente (opcional)
            </label>
            <input
              type="email"
              value={linha.corretorEmail}
              onChange={(e) => onChange({ corretorEmail: e.target.value })}
              placeholder="usa email cadastrado se vazio"
              className="form-input !h-10"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
              Nome do cedente (opcional)
            </label>
            <input
              type="text"
              value={linha.corretorNome}
              onChange={(e) => onChange({ corretorNome: e.target.value })}
              className="form-input !h-10"
            />
          </div>
        </div>
      )}

      {/* Cadastro de nova imobiliária inline */}
      {showNovaForm && linha.imobiliariaId === "" && (
        <div className="rounded-xl border border-accent/30 bg-accent-soft p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
              dados da nova imobiliária / corretor
            </span>
            <button
              type="button"
              onClick={() => {
                setShowNovaForm(false);
                onChangeImobNova({ razaoSocial: "", cnpj: "", email: "", telefone: "" });
              }}
              className="text-xs text-fg-muted hover:text-fg"
            >
              cancelar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              required={showNovaForm}
              value={linha.imobNova.razaoSocial}
              onChange={(e) =>
                onChangeImobNova({ razaoSocial: e.target.value })
              }
              placeholder="Razão social *"
              className="form-input !h-10"
            />
            <input
              required={showNovaForm}
              value={linha.imobNova.cnpj}
              onChange={(e) =>
                onChangeImobNova({ cnpj: maskCNPJ(e.target.value) })
              }
              placeholder="CNPJ * (00.000.000/0000-00)"
              className="form-input !h-10 font-mono"
              inputMode="numeric"
            />
            <input
              required={showNovaForm}
              type="email"
              value={linha.imobNova.email}
              onChange={(e) => onChangeImobNova({ email: e.target.value })}
              placeholder="Email do responsável *"
              className="form-input !h-10"
            />
            <input
              required={showNovaForm}
              value={linha.imobNova.telefone}
              onChange={(e) =>
                onChangeImobNova({ telefone: maskPhone(e.target.value) })
              }
              placeholder="Telefone *"
              className="form-input !h-10 font-mono"
              type="tel"
            />
          </div>
          <p className="text-[10px] text-fg-muted leading-relaxed">
            Vamos enviar um email convidando o responsável a se cadastrar e
            completar a operação na plataforma.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
            Valor da venda *
          </label>
          <input
            required
            value={linha.valorVenda}
            onChange={(e) =>
              onChange({ valorVenda: applyMaskCurrency(e.target.value) })
            }
            placeholder="0,00"
            inputMode="numeric"
            className="form-input !h-10 tabular text-right"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
            Valor da comissão *
          </label>
          <input
            required
            value={linha.valorComissao}
            onChange={(e) =>
              onChange({ valorComissao: applyMaskCurrency(e.target.value) })
            }
            placeholder="0,00"
            inputMode="numeric"
            className="form-input !h-10 tabular text-right"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
            Parcelas *
          </label>
          <input
            required
            type="number"
            min={1}
            max={4}
            value={linha.numeroParcelas}
            onChange={(e) => onChange({ numeroParcelas: e.target.value })}
            className="form-input !h-10 tabular"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
            1ª parcela *
          </label>
          <input
            required
            type="date"
            value={linha.dataPrimeiraParcela}
            onChange={(e) => onChange({ dataPrimeiraParcela: e.target.value })}
            className="form-input !h-10"
          />
        </div>
      </div>

      <input
        value={linha.observacoes}
        onChange={(e) => onChange({ observacoes: e.target.value })}
        placeholder="Observações (opcional)"
        className="form-input !h-10 text-sm"
      />
    </li>
  );
}
