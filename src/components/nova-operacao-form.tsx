"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOperacaoAction,
  type CreateOperacaoState,
} from "@/lib/actions/operacoes";
import { ConstrutoraModal } from "./construtora-modal";
import { FileUploadField, type UploadedBlob } from "./file-upload-field";
import { PagadorSelector } from "./pagador-selector";
import { useFeedback } from "@/components/feedback-provider";
import { formatBRL, parseBRLNumber, valorPresente } from "@/lib/format";

type Construtora = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
};

type Props = {
  construtoras: Construtora[];
  /** Taxa mensal sugerida vinda do admin (default 0.06) */
  taxaMensalSugerida?: number;
};

type Parcela = { valor: string; vencimento: string };

function maskCurrency(value: string): string {
  // Aceita "1234.56", "1234,56", "1234" — sempre devolve "X.XXX,XX"
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata número direto pra máscara BR (ex: 5000 → "5.000,00"). */
function numberToMask(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function genParcelas(
  total: number,
  numero: number,
  startDate: string,
): Parcela[] {
  if (numero <= 0 || !Number.isFinite(total)) return [];
  const valor = total / numero;
  const start = new Date(startDate || new Date().toISOString().slice(0, 10));
  return Array.from({ length: numero }, (_, i) => {
    const v = new Date(start);
    v.setMonth(v.getMonth() + i + 1);
    return {
      valor: numberToMask(valor),
      vencimento: v.toISOString().slice(0, 10),
    };
  });
}

function monthsBetween(from: Date, to: Date) {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const dayFrac = (to.getDate() - from.getDate()) / 30;
  return years * 12 + months + dayFrac;
}

export function NovaOperacaoForm({
  construtoras,
  taxaMensalSugerida = 0.06,
}: Props) {
  const TAXA_MENSAL = taxaMensalSugerida;
  const taxaPct = (TAXA_MENSAL * 100).toFixed(2).replace(".", ",");
  const [state, action, pending] = useActionState<
    CreateOperacaoState,
    FormData
  >(createOperacaoAction, null);
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();

  const [construtoraId, setConstrutoraId] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [valorVenda, setValorVenda] = useState("");
  const [valorComissao, setValorComissao] = useState("");
  const [valorEntrada, setValorEntrada] = useState("");
  const [dataVenda, setDataVenda] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [numParcelas, setNumParcelas] = useState(3);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  const [docContratoVenda, setDocContratoVenda] = useState<UploadedBlob | null>(null);
  const [docContratoComissao, setDocContratoComissao] = useState<UploadedBlob | null>(null);
  const [docNotaFiscal, setDocNotaFiscal] = useState<UploadedBlob | null>(null);
  const [docComprovanteEntrada, setDocComprovanteEntrada] =
    useState<UploadedBlob | null>(null);

  const valorComissaoNum = parseBRLNumber(valorComissao);

  // Auto-gera parcelas iguais quando muda comissão / numParcelas / dataVenda
  useEffect(() => {
    if (valorComissaoNum > 0 && numParcelas > 0 && dataVenda) {
      setParcelas(genParcelas(valorComissaoNum, numParcelas, dataVenda));
    } else {
      setParcelas([]);
    }
  }, [valorComissaoNum, numParcelas, dataVenda]);

  useEffect(() => {
    if (state?.ok) {
      alertSuccess(`Operação ${state.numero} criada com sucesso.`, "Operação registrada")
        .then(() => router.push(`/painel/operacoes/${state.operacaoId}`));
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao registrar operação");
    }
  }, [state, router, alertSuccess, alertError]);

  // Valor presente em tempo real
  const { vp, desagio, percentDesagio } = useMemo(() => {
    if (parcelas.length === 0 || valorComissaoNum === 0)
      return { vp: 0, desagio: 0, percentDesagio: 0 };
    const today = new Date();
    const arr = parcelas.map((p) => ({
      valor: parseBRLNumber(p.valor),
      mesesAteVencimento: Math.max(monthsBetween(today, new Date(p.vencimento)), 0),
    }));
    const v = valorPresente(arr, TAXA_MENSAL);
    const d = valorComissaoNum - v;
    return {
      vp: v,
      desagio: d,
      percentDesagio: d / valorComissaoNum,
    };
  }, [parcelas, valorComissaoNum, TAXA_MENSAL]);

  function updateParcela(idx: number, key: keyof Parcela, value: string) {
    setParcelas((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }

  return (
    <>
      <form action={action} className="grid lg:grid-cols-12 gap-6">
        {/* Coluna principal — inputs */}
        <div className="lg:col-span-7 space-y-6">
          {state && !state.ok && (
            <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
              {state.error}
            </div>
          )}

          {/* Construtora */}
          <Section title="01. Construtora" subtitle="A quem é devida essa comissão">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                  Selecionar construtora
                </label>
                <select
                  name="construtoraId"
                  value={construtoraId}
                  onChange={(e) => setConstrutoraId(e.target.value)}
                  required
                  className="w-full h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg focus:border-accent outline-none transition-colors appearance-none"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1.5L6 6.5L11 1.5' stroke='%235a6571' stroke-width='1.5' fill='none'/></svg>\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 16px center",
                  }}
                >
                  <option value="">— Selecionar construtora —</option>
                  {construtoras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razaoSocial}
                      {c.nomeFantasia ? ` (${c.nomeFantasia})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="btn-ghost !h-12"
              >
                + Nova
              </button>
            </div>
          </Section>

          {/* Dados da venda */}
          <Section
            title="02. Dados da venda"
            subtitle="Valores e data conforme contrato"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                  Valor da venda
                  <span className="ml-1 text-accent">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted text-sm font-mono pointer-events-none">
                    R$
                  </span>
                  <input
                    name="valorVenda"
                    required
                    value={valorVenda}
                    onChange={(e) => setValorVenda(maskCurrency(e.target.value))}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="w-full h-12 rounded-xl bg-bg border border-border-strong pl-10 pr-4 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors tabular text-right"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                  Valor da comissão
                  <span className="ml-1 text-accent">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted text-sm font-mono pointer-events-none">
                    R$
                  </span>
                  <input
                    name="valorComissao"
                    required
                    value={valorComissao}
                    onChange={(e) => setValorComissao(maskCurrency(e.target.value))}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="w-full h-12 rounded-xl bg-bg border border-border-strong pl-10 pr-4 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors tabular text-right"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                  Valor da entrada
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted text-sm font-mono pointer-events-none">
                    R$
                  </span>
                  <input
                    name="valorEntrada"
                    value={valorEntrada}
                    onChange={(e) => setValorEntrada(maskCurrency(e.target.value))}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="w-full h-12 rounded-xl bg-bg border border-border-strong pl-10 pr-4 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors tabular text-right"
                  />
                </div>
                <p className="mt-1 text-[10px] text-fg-dim">
                  Valor pago à vista pelo comprador. Comprovante abaixo.
                </p>
              </div>
              <FileUploadField
                label="Comprovante de pagamento da entrada"
                name="doc_comprovante_entrada"
                folder="operacoes/comprovante-entrada"
                description="PDF ou imagem do comprovante (TED, PIX, recibo)"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={setDocComprovanteEntrada}
              />
              <input
                type="hidden"
                name="doc_comprovante_entrada_nome"
                value={docComprovanteEntrada?.name ?? ""}
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                Data da venda<span className="ml-1 text-accent">*</span>
              </label>
              <input
                name="dataVenda"
                type="date"
                required
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
                className="w-full sm:w-60 h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg focus:border-accent outline-none transition-colors"
              />
            </div>
          </Section>

          {/* Parcelas */}
          <Section
            title="03. Parcelas da comissão"
            subtitle="Cronograma que a construtora pagaria a você"
          >
            <div className="flex items-end gap-3 mb-5">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                  Número de parcelas (máx 4)
                </label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={numParcelas}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 1;
                    setNumParcelas(Math.min(Math.max(v, 1), 4));
                  }}
                  className="w-32 h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg focus:border-accent outline-none transition-colors tabular"
                />
              </div>
              <span className="text-xs text-fg-dim font-mono pb-3">
                limite de 120 dias · até 4 parcelas mensais
              </span>
            </div>
            {parcelas.length > 0 && (
              <ul className="space-y-2">
                {parcelas.map((p, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <span className="col-span-1 font-mono text-[10px] text-fg-dim text-center">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <input
                      type="date"
                      value={p.vencimento}
                      onChange={(e) => updateParcela(i, "vencimento", e.target.value)}
                      className="col-span-6 h-10 rounded-lg bg-bg border border-border px-3 text-sm text-fg focus:border-accent outline-none transition-colors"
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
                          updateParcela(
                            i,
                            "valor",
                            maskCurrency(e.target.value),
                          )
                        }
                        placeholder="0,00"
                        className="w-full h-10 rounded-lg bg-bg border border-border pl-8 pr-3 text-sm text-fg focus:border-accent outline-none transition-colors tabular text-right"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <input type="hidden" name="parcelas" value={JSON.stringify(parcelas)} />
          </Section>

          <PagadorSelector />

          {/* Documentos da operação */}
          <Section
            title="04. Documentos da operação"
            subtitle="Anexe os 3 PDFs que comprovam a operação"
          >
            <FileUploadField
              label="Contrato de compra e venda do imóvel"
              name="doc_contrato_venda"
              required
              folder="operacoes/contrato-venda"
              description="Contrato assinado com o comprador final."
              onChange={setDocContratoVenda}
            />
            <FileUploadField
              label="Contrato de comissionamento"
              name="doc_contrato_comissao"
              required
              folder="operacoes/contrato-comissao"
              description="Contrato firmado entre você (corretor/imobiliária) e a construtora."
              onChange={setDocContratoComissao}
            />
            <FileUploadField
              label="Nota fiscal da comissão"
              name="doc_nota_fiscal"
              required
              folder="operacoes/nota-fiscal"
              description="NF emitida pelo corretor/imobiliária pra construtora."
              onChange={setDocNotaFiscal}
            />
            <input type="hidden" name="doc_contrato_venda_nome" value={docContratoVenda?.name ?? ""} />
            <input type="hidden" name="doc_contrato_comissao_nome" value={docContratoComissao?.name ?? ""} />
            <input type="hidden" name="doc_nota_fiscal_nome" value={docNotaFiscal?.name ?? ""} />
          </Section>

          <button
            type="submit"
            disabled={
              pending ||
              parcelas.length === 0 ||
              !construtoraId ||
              !docContratoVenda ||
              !docContratoComissao ||
              !docNotaFiscal
            }
            className="btn-primary !w-full justify-center !h-13"
          >
            {pending ? "Registrando..." : "Registrar operação"}
            <span className="arrow">→</span>
          </button>
        </div>

        {/* Coluna lateral — resumo do VP */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 rounded-3xl bg-bg-dark text-fg-inverse p-7 md:p-9 relative overflow-hidden">
            <div className="absolute inset-0 bg-mesh-dark pointer-events-none" aria-hidden />
            <div className="relative">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-fg-inverse/70 mb-2">
                você recebe
              </div>
              <div className="font-mono tabular text-4xl md:text-5xl font-bold tracking-tight text-gradient-blue">
                {formatBRL(vp)}
              </div>
              <div className="mt-1 text-fg-inverse/60 text-sm">
                taxa {taxaPct}% a.m. · em até 1 dia útil após aprovação
              </div>
              <div className="mt-1 text-fg-inverse/45 text-[11px] italic">
                Taxa de juros sugerida — pode ser alterada na aprovação da
                operação.
              </div>

              <div className="mt-7 pt-6 border-t border-white/10 space-y-3 text-sm">
                <Row
                  label="Comissão total"
                  value={formatBRL(valorComissaoNum)}
                />
                <Row
                  label="Parcelas"
                  value={`${parcelas.length}x`}
                />
                <Row
                  label="Deságio"
                  value={`− ${formatBRL(desagio)}`}
                  highlight="warn"
                />
                <Row
                  label="% deságio"
                  value={`${(percentDesagio * 100).toFixed(2)}%`}
                  highlight="muted"
                />
              </div>

              <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4 text-xs leading-relaxed text-fg-inverse/70">
                <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
                  como esse cálculo funciona
                </div>
                Cada parcela é trazida a valor presente usando juros compostos
                mensais. Quanto mais distante a parcela, maior o deságio.
              </div>
            </div>
          </div>
        </aside>
      </form>

      <ConstrutoraModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={(id) => {
          setShowModal(false);
          setConstrutoraId(id);
          // forçar reload pra puxar a nova construtora
          router.refresh();
        }}
      />
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
      <div className="mb-5">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        {subtitle && (
          <p className="text-xs text-fg-muted mt-1">{subtitle}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight = "default",
}: {
  label: string;
  value: string;
  highlight?: "default" | "muted" | "warn";
}) {
  const valueColor =
    highlight === "warn"
      ? "text-orange-300"
      : highlight === "muted"
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
