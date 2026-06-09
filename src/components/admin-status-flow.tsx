"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeOperacaoStatusAction } from "@/lib/actions/status-flow";
import { formatBRL, valorPresente } from "@/lib/format";
import { useFeedback } from "@/components/feedback-provider";
import { CalculadoraFundos } from "@/components/calculadora-fundos";

type Status =
  | "rascunho"
  | "aguardando_aprovacao"
  | "documentos_incompletos"
  | "pre_aprovada"
  | "analise_final"
  | "recusada"
  | "enviada_para_assinatura"
  | "enviada_para_pagamento"
  | "realizada"
  | "cancelada";

type TargetStatus = Exclude<Status, "rascunho">;

type TransitionDef = {
  label: string;
  to: TargetStatus;
  variant: "primary" | "success" | "warn" | "danger" | "ghost";
  needsMotivo?: boolean;
  motivoLabel?: string;
  /** Se true, abre painel pra admin ajustar a taxa antes de aprovar */
  ajustaTaxa?: boolean;
  /** Se true, abre painel pra admin definir cashback da construtora */
  ajustaCashback?: boolean;
  confirm?: string;
};

const TRANSITIONS: Partial<Record<Status, TransitionDef[]>> = {
  rascunho: [
    { label: "Submeter para análise", to: "aguardando_aprovacao", variant: "primary" },
  ],
  aguardando_aprovacao: [
    {
      label: "✓ Pré-aprovar",
      to: "pre_aprovada",
      variant: "success",
      ajustaTaxa: true,
    },
    {
      label: "⚠ Documentos incompletos",
      to: "documentos_incompletos",
      variant: "warn",
      needsMotivo: true,
      motivoLabel: "Descreva o que falta nos documentos",
    },
    {
      label: "✕ Recusar",
      to: "recusada",
      variant: "danger",
      needsMotivo: true,
      motivoLabel: "Motivo da recusa",
    },
  ],
  documentos_incompletos: [
    {
      label: "↻ Voltar pra análise",
      to: "aguardando_aprovacao",
      variant: "primary",
      confirm: "Volta pra fila de análise? Use depois que o corretor reenviar os documentos.",
    },
    {
      label: "✕ Recusar",
      to: "recusada",
      variant: "danger",
      needsMotivo: true,
      motivoLabel: "Motivo da recusa",
    },
  ],
  pre_aprovada: [
    {
      label: "✓ Construtora confirmou (análise final)",
      to: "analise_final",
      variant: "success",
      confirm: "Marcar que a construtora confirmou a operação?",
    },
    {
      label: "✕ Recusar",
      to: "recusada",
      variant: "danger",
      needsMotivo: true,
      motivoLabel: "Motivo da recusa",
    },
  ],
  analise_final: [
    {
      label: "✓ Aprovar e enviar pra assinatura",
      to: "enviada_para_assinatura",
      variant: "success",
      ajustaTaxa: true,
    },
    {
      label: "✕ Recusar",
      to: "recusada",
      variant: "danger",
      needsMotivo: true,
      motivoLabel: "Motivo da recusa",
    },
  ],
  enviada_para_assinatura: [
    {
      label: "✓ Assinaturas concluídas — aprovar pagamento",
      to: "enviada_para_pagamento",
      variant: "success",
      ajustaCashback: true,
    },
    {
      label: "✕ Cancelar",
      to: "cancelada",
      variant: "danger",
      needsMotivo: true,
      motivoLabel: "Motivo do cancelamento",
    },
  ],
  enviada_para_pagamento: [
    {
      label: "✓ Pagamento confirmado",
      to: "realizada",
      variant: "success",
      confirm: "Marca pagamento como confirmado e operação como realizada?",
    },
  ],
  recusada: [],
  realizada: [],
  cancelada: [],
};

const VARIANT_CLS: Record<TransitionDef["variant"], string> = {
  primary: "bg-accent text-white hover:bg-accent-dark border-accent",
  success: "bg-success text-white hover:bg-green-700 border-success",
  warn: "bg-orange-500 text-white hover:bg-orange-600 border-orange-500",
  danger: "bg-danger text-white hover:bg-red-800 border-danger",
  ghost: "bg-bg-elev text-fg border-border hover:border-accent",
};

type Props = {
  operacaoId: string;
  currentStatus: string;
  /** Taxa mensal atual da operação (decimal, ex 0.06). */
  currentTaxaMensal: number;
  /** Comissão total — pra preview de novo deságio. */
  valorComissao: number;
  /** Valor da venda total (informativo no card da calculadora). */
  valorVenda?: number;
  /** Valor presente da operação — base do cashback. */
  valorPresente: number;
  /** Parcelas pra recalcular VP no preview client-side. */
  parcelas: Array<{ valor: string; vencimento: string }>;
  /** Cashback já cadastrado (decimal). Mostra como default no input. */
  currentCashbackPercent?: number | null;
  /** Fundos cadastrados (pra calculadora comparativa na aprovação). */
  fundos: Array<{
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    taxaMensalBase: string;
    taxaOperacaoPadrao?: string;
  }>;
  /** Fundo atual da operação (se já foi escolhido). */
  currentFundoId?: string | null;
  /** Custos já cadastrados — preenche o editor inline pra edição. */
  currentCustos?: Array<{ titulo: string; valor: number }>;
};

function monthsBetween(from: Date, to: Date) {
  const y = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  const dayFrac = (to.getDate() - from.getDate()) / 30;
  return Math.max(y * 12 + m + dayFrac, 0);
}

export function AdminStatusFlow({
  operacaoId,
  currentStatus,
  currentTaxaMensal,
  valorComissao,
  valorVenda,
  valorPresente: valorPresenteInicial,
  parcelas,
  currentCashbackPercent,
  fundos,
  currentFundoId,
  currentCustos,
}: Props) {
  const router = useRouter();
  const { confirm: confirmModal, alertSuccess, alertError } = useFeedback();
  const [pending, startTransition] = useTransition();
  const [activeMotivo, setActiveMotivo] = useState<{
    to: TargetStatus;
    label: string;
  } | null>(null);
  const [activeTaxa, setActiveTaxa] = useState<{
    to: TargetStatus;
    label: string;
  } | null>(null);
  const [activeCashback, setActiveCashback] = useState<{
    to: TargetStatus;
    label: string;
  } | null>(null);
  const [motivoText, setMotivoText] = useState("");
  const [taxaInput, setTaxaInput] = useState(
    String((currentTaxaMensal * 100).toFixed(2)),
  );
  const [selectedFundoId, setSelectedFundoId] = useState<string | null>(
    currentFundoId ?? fundos[0]?.id ?? null,
  );

  const parcelasParaCalc = useMemo(() => {
    const today = new Date();
    return parcelas.map((p) => ({
      valor: parseFloat(p.valor),
      mesesAteVencimento: monthsBetween(
        today,
        new Date(p.vencimento + "T00:00:00"),
      ),
    }));
  }, [parcelas]);

  function handleSelectFundo(fundoId: string) {
    setSelectedFundoId(fundoId);
    // Sugere a taxa DA OPERAÇÃO do fundo (valor de operação), não o custo do
    // dinheiro (taxa-base). Fallback pra taxa-base em fundos antigos sem o campo.
    const f = fundos.find((x) => x.id === fundoId);
    if (f) {
      const taxaOp = parseFloat(f.taxaOperacaoPadrao ?? f.taxaMensalBase);
      const pct = taxaOp * 100;
      setTaxaInput(pct.toFixed(2).replace(".", ","));
    }
  }
  const [cashbackEnabled, setCashbackEnabled] = useState(
    !!currentCashbackPercent,
  );
  const [cashbackInput, setCashbackInput] = useState(
    currentCashbackPercent
      ? String((currentCashbackPercent * 100).toFixed(2))
      : "1,00",
  );

  // Custos da operação — array editável local. Cada item é { titulo, valor }
  // (valor em number BRL). Salvado quando confirmar transição com taxa ou
  // quando confirmar transição com cashback.
  const [custosEdit, setCustosEdit] = useState<
    Array<{ titulo: string; valor: string }>
  >(
    (currentCustos ?? []).map((c) => ({
      titulo: c.titulo,
      valor: c.valor.toFixed(2).replace(".", ","),
    })),
  );

  function addCusto() {
    setCustosEdit((arr) => [...arr, { titulo: "", valor: "" }]);
  }
  function removeCusto(idx: number) {
    setCustosEdit((arr) => arr.filter((_, i) => i !== idx));
  }
  function updateCusto(idx: number, key: "titulo" | "valor", v: string) {
    setCustosEdit((arr) =>
      arr.map((c, i) => (i === idx ? { ...c, [key]: v } : c)),
    );
  }

  const custosNormalizados = useMemo(
    () =>
      custosEdit
        .map((c) => ({
          titulo: c.titulo.trim(),
          valor: parseFloat(
            c.valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""),
          ),
        }))
        .filter(
          (c) => c.titulo.length > 0 && Number.isFinite(c.valor) && c.valor > 0,
        ),
    [custosEdit],
  );
  const totalCustos = custosNormalizados.reduce((s, c) => s + c.valor, 0);

  const transitions = TRANSITIONS[currentStatus as Status] ?? [];

  // Preview do novo VP/deságio com a taxa digitada
  const taxaPreview = useMemo(() => {
    const cleaned = taxaInput.replace(",", ".").replace("%", "").trim();
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n)) return null;
    const taxa = n >= 0.5 ? n / 100 : n;
    if (taxa < 0.005 || taxa > 0.2) return { taxa, invalida: true };
    const today = new Date();
    const arr = parcelas.map((p) => ({
      valor: parseFloat(p.valor),
      mesesAteVencimento: monthsBetween(
        today,
        new Date(p.vencimento + "T00:00:00"),
      ),
    }));
    const vp = valorPresente(arr, taxa);
    return {
      taxa,
      invalida: false as const,
      vp,
      desagio: valorComissao - vp,
    };
  }, [taxaInput, parcelas, valorComissao]);

  function executeTransition(
    to: TargetStatus,
    extras: {
      motivo?: string;
      novaTaxaMensal?: number;
      cashbackPercent?: number;
      fundoId?: string;
      custos?: Array<{ titulo: string; valor: number }>;
    } = {},
  ) {
    startTransition(async () => {
      try {
        await changeOperacaoStatusAction({
          operacaoId,
          newStatus: to,
          ...extras,
        });
        setActiveMotivo(null);
        setActiveTaxa(null);
        setActiveCashback(null);
        setMotivoText("");
        await alertSuccess(
          `Operação atualizada para ${to.replace(/_/g, " ")}.`,
          "Status alterado",
        );
        router.refresh();
      } catch (e) {
        await alertError((e as Error).message, "Erro ao mudar status");
      }
    });
  }

  async function handleClick(t: TransitionDef) {
    if (t.needsMotivo) {
      setActiveMotivo({ to: t.to, label: t.motivoLabel ?? "Motivo" });
      return;
    }
    if (t.ajustaTaxa) {
      setActiveTaxa({ to: t.to, label: t.label });
      setTaxaInput(String((currentTaxaMensal * 100).toFixed(2)));
      return;
    }
    if (t.ajustaCashback) {
      setActiveCashback({ to: t.to, label: t.label });
      return;
    }
    if (t.confirm) {
      const ok = await confirmModal({
        title: "Confirmar transição",
        message: t.confirm,
        confirmLabel: t.label,
        variant: t.variant === "danger" ? "danger" : "default",
      });
      if (!ok) return;
    }
    executeTransition(t.to);
  }

  if (transitions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
          fluxo de status
        </div>
        <p className="text-sm text-fg-muted">
          Nenhuma transição disponível. Status atual:{" "}
          <span className="font-mono text-xs uppercase">{currentStatus}</span>.
        </p>
      </div>
    );
  }

  const noPanel = !activeMotivo && !activeTaxa && !activeCashback;

  // Preview do cashback (% sobre VP da operação)
  const cashbackPreview = (() => {
    if (!cashbackEnabled) return { percent: 0, valor: 0, invalida: false };
    const cleaned = cashbackInput.replace(",", ".").replace("%", "").trim();
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n) || n <= 0)
      return { percent: 0, valor: 0, invalida: true };
    const pct = n >= 0.5 ? n / 100 : n;
    if (pct > 0.2) return { percent: pct, valor: 0, invalida: true };
    return {
      percent: pct,
      valor: Math.round(valorPresenteInicial * pct * 100) / 100,
      invalida: false,
    };
  })();

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-3">
        ações administrativas · próximo passo
      </div>

      {noPanel && (
        <>
          <p className="text-sm text-fg-muted mb-5">
            Status atual:{" "}
            <span className="font-mono text-xs uppercase font-semibold text-fg">
              {currentStatus}
            </span>
            . Taxa atual:{" "}
            <span className="font-mono font-semibold text-fg">
              {(currentTaxaMensal * 100).toFixed(2).replace(".", ",")}% a.m.
            </span>
            . Escolha pra onde ir:
          </p>
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <button
                key={t.to}
                type="button"
                onClick={() => handleClick(t)}
                disabled={pending}
                className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl border font-semibold text-sm transition-colors disabled:opacity-60 ${VARIANT_CLS[t.variant]}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      {activeMotivo && (
        <div className="space-y-3">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim font-mono">
            {activeMotivo.label}
            <span className="ml-1 text-accent">*</span>
          </label>
          <textarea
            rows={3}
            value={motivoText}
            onChange={(e) => setMotivoText(e.target.value)}
            placeholder="Descreva..."
            className="w-full rounded-xl bg-bg border border-border-strong px-4 py-3 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors resize-none"
            autoFocus
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                if (!motivoText.trim()) {
                  await alertError("Preencha o motivo.", "Campo obrigatório");
                  return;
                }
                executeTransition(activeMotivo.to, {
                  motivo: motivoText.trim(),
                });
              }}
              disabled={pending || !motivoText.trim()}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMotivo(null);
                setMotivoText("");
              }}
              disabled={pending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border text-fg-muted hover:text-fg font-medium text-sm transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {activeTaxa && (
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-fg-dim mb-1">
              ação
            </div>
            <div className="font-bold">{activeTaxa.label}</div>
          </div>

          {/* Calculadora comparativa de fundos */}
          <CalculadoraFundos
            fundos={fundos}
            parcelas={parcelasParaCalc}
            valorComissao={valorComissao}
            valorVenda={valorVenda}
            numeroParcelas={parcelas.length}
            selectedFundoId={selectedFundoId}
            onSelect={handleSelectFundo}
            taxaCustom={taxaPreview && !taxaPreview.invalida ? taxaPreview.taxa : undefined}
          />

          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Taxa mensal desta operação (%) — pode customizar
              <span className="ml-1 text-accent">*</span>
            </label>
            <div className="flex items-stretch max-w-xs rounded-xl border border-border-strong overflow-hidden focus-within:border-accent transition-colors">
              <input
                value={taxaInput}
                onChange={(e) => setTaxaInput(e.target.value)}
                inputMode="decimal"
                placeholder="6,00"
                autoFocus
                className="flex-1 min-w-0 bg-bg h-12 px-4 text-fg placeholder:text-fg-dim outline-none tabular text-right"
              />
              <span className="bg-bg-soft px-3 flex items-center text-fg-muted text-sm font-mono border-l border-border-strong shrink-0">
                % a.m.
              </span>
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              Padrão sugerido pela configuração:{" "}
              <span className="font-mono font-semibold">
                {(currentTaxaMensal * 100).toFixed(2).replace(".", ",")}% a.m.
              </span>
              . Você pode customizar pra esta operação. Limites: 0,5%–20%.
            </p>
          </div>

          {taxaPreview && !taxaPreview.invalida && (
            <div className="rounded-xl border border-border bg-bg p-4">
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
                preview com a nova taxa
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    Comissão
                  </div>
                  <div className="font-mono tabular text-base font-semibold">
                    {formatBRL(valorComissao)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    Novo VP
                  </div>
                  <div className="font-mono tabular text-base font-bold text-accent">
                    {formatBRL(taxaPreview.vp ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    Novo deságio
                  </div>
                  <div className="font-mono tabular text-base font-semibold text-warn">
                    {formatBRL(taxaPreview.desagio ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          )}
          {taxaPreview && taxaPreview.invalida && (
            <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
              Taxa fora dos limites (0,5% a 20%).
            </div>
          )}

          <CustosEditor
            custosEdit={custosEdit}
            addCusto={addCusto}
            removeCusto={removeCusto}
            updateCusto={updateCusto}
            totalCustos={totalCustos}
            valorPresenteAtual={
              taxaPreview && !taxaPreview.invalida && taxaPreview.vp != null
                ? taxaPreview.vp
                : valorPresenteInicial
            }
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                if (!taxaPreview || taxaPreview.invalida) {
                  await alertError(
                    "Taxa inválida. Use entre 0,5% e 20%.",
                    "Taxa fora dos limites",
                  );
                  return;
                }
                if (!selectedFundoId) {
                  await alertError(
                    "Selecione um fundo na calculadora antes de aprovar.",
                    "Fundo obrigatório",
                  );
                  return;
                }
                executeTransition(activeTaxa.to, {
                  novaTaxaMensal: taxaPreview.taxa,
                  fundoId: selectedFundoId,
                  custos: custosNormalizados,
                });
              }}
              disabled={pending || !taxaPreview || taxaPreview.invalida}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-success text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Confirmar e mudar status"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTaxa(null)}
              disabled={pending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border text-fg-muted hover:text-fg font-medium text-sm transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {activeCashback && (
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-fg-dim mb-1">
              ação · aprovação final
            </div>
            <div className="font-bold">{activeCashback.label}</div>
            <p className="text-xs text-fg-muted mt-1">
              Antes de aprovar pra pagamento, você pode dar cashback pra
              construtora. Esse benefício é privado — só a construtora e o
              admin enxergam.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cashbackEnabled}
              onChange={(e) => setCashbackEnabled(e.target.checked)}
              className="size-4 accent-current text-accent"
            />
            <span className="text-sm font-medium">Dar cashback</span>
          </label>

          {cashbackEnabled && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                Percentual de cashback (%)
              </label>
              <div className="flex items-stretch max-w-xs rounded-xl border border-border-strong overflow-hidden focus-within:border-accent transition-colors">
                <input
                  value={cashbackInput}
                  onChange={(e) => setCashbackInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="1,00"
                  autoFocus
                  className="flex-1 min-w-0 bg-bg h-12 px-4 text-fg placeholder:text-fg-dim outline-none tabular text-right"
                />
                <span className="bg-bg-soft px-3 flex items-center text-fg-muted text-sm font-mono border-l border-border-strong shrink-0">
                  %
                </span>
              </div>
              <p className="mt-2 text-xs text-fg-muted">
                Limite máximo: 20%. Calculado sobre o valor presente da
                operação.
              </p>

              {!cashbackPreview.invalida && cashbackPreview.percent > 0 && (
                <div className="mt-3 rounded-xl border border-success/30 bg-green-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                      cashback que será concedido
                    </span>
                    <span className="font-mono tabular text-base font-bold text-success">
                      {formatBRL(cashbackPreview.valor)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-fg-muted">
                    {(cashbackPreview.percent * 100)
                      .toFixed(2)
                      .replace(".", ",")}
                    % de {formatBRL(valorPresenteInicial)} (valor presente)
                  </p>
                </div>
              )}
              {cashbackPreview.invalida && (
                <div className="mt-3 rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
                  Percentual inválido (entre 0,01% e 20%).
                </div>
              )}
            </div>
          )}

          <CustosEditor
            custosEdit={custosEdit}
            addCusto={addCusto}
            removeCusto={removeCusto}
            updateCusto={updateCusto}
            totalCustos={totalCustos}
            valorPresenteAtual={valorPresenteInicial}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                if (cashbackEnabled && cashbackPreview.invalida) {
                  await alertError(
                    "Percentual de cashback inválido.",
                    "Cashback inválido",
                  );
                  return;
                }
                executeTransition(activeCashback.to, {
                  cashbackPercent: cashbackEnabled
                    ? cashbackPreview.percent
                    : undefined,
                  custos: custosNormalizados,
                });
              }}
              disabled={
                pending || (cashbackEnabled && cashbackPreview.invalida)
              }
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-success text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Aprovar e enviar pra pagamento"}
            </button>
            <button
              type="button"
              onClick={() => setActiveCashback(null)}
              disabled={pending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border text-fg-muted hover:text-fg font-medium text-sm transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustosEditor({
  custosEdit,
  addCusto,
  removeCusto,
  updateCusto,
  totalCustos,
  valorPresenteAtual,
}: {
  custosEdit: Array<{ titulo: string; valor: string }>;
  addCusto: () => void;
  removeCusto: (idx: number) => void;
  updateCusto: (idx: number, key: "titulo" | "valor", v: string) => void;
  totalCustos: number;
  valorPresenteAtual: number;
}) {
  const liquido = Math.max(valorPresenteAtual - totalCustos, 0);
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            custos da operação
          </div>
          <p className="text-xs text-fg-muted mt-0.5">
            Itens descontados do montante (taxas de cartório, ITBI, comissões
            adicionais etc). Detalhados no borderô.
          </p>
        </div>
        <button
          type="button"
          onClick={addCusto}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-accent/40 text-accent text-xs font-semibold hover:bg-accent-soft transition-colors"
        >
          + adicionar
        </button>
      </div>

      {custosEdit.length === 0 ? (
        <p className="text-xs text-fg-dim italic py-2">
          Nenhum custo cadastrado. Clique em &ldquo;adicionar&rdquo; pra
          incluir um item.
        </p>
      ) : (
        <ul className="space-y-2">
          {custosEdit.map((c, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={c.titulo}
                onChange={(e) => updateCusto(idx, "titulo", e.target.value)}
                placeholder="Título (ex: ITBI, Cartório...)"
                className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-border bg-bg-elev text-fg text-sm placeholder:text-fg-dim focus:border-accent outline-none"
              />
              <div className="flex items-stretch w-44 rounded-lg border border-border overflow-hidden focus-within:border-accent">
                <span className="bg-bg-soft px-2.5 flex items-center text-fg-dim text-xs font-mono border-r border-border">
                  R$
                </span>
                <input
                  inputMode="decimal"
                  value={c.valor}
                  onChange={(e) => updateCusto(idx, "valor", e.target.value)}
                  placeholder="0,00"
                  className="flex-1 min-w-0 bg-bg-elev h-10 px-2 text-fg placeholder:text-fg-dim outline-none tabular text-right text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCusto(idx)}
                title="Remover"
                aria-label="Remover custo"
                className="size-9 rounded-lg border border-border text-fg-muted hover:border-danger hover:text-danger transition-colors flex items-center justify-center text-base"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalCustos > 0 && (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
              VP atual
            </div>
            <div className="font-mono tabular text-base font-semibold">
              {formatBRL(valorPresenteAtual)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
              Total custos
            </div>
            <div className="font-mono tabular text-base font-semibold text-warn">
              − {formatBRL(totalCustos)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
              Líquido cedente
            </div>
            <div className="font-mono tabular text-base font-bold text-accent">
              {formatBRL(liquido)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
