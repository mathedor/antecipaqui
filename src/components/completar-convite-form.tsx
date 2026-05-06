"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  completarConviteAction,
  type CompletarConviteState,
} from "@/lib/actions/pending-operacoes";
import { FileUploadField, type UploadedBlob } from "./file-upload-field";
import { useFeedback } from "@/components/feedback-provider";
import { formatBRL, valorPresente } from "@/lib/format";

type Props = {
  convite: {
    id: string;
    construtoraNome: string;
    valorVenda: string;
    valorComissao: string;
    numeroParcelas: number;
    dataPrimeiraParcela: string;
    observacoes: string | null;
  };
  taxaMensalSugerida: number;
};

function monthsBetween(from: Date, to: Date) {
  const y = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  const dayFrac = (to.getDate() - from.getDate()) / 30;
  return Math.max(y * 12 + m + dayFrac, 0);
}

export function CompletarConviteForm({ convite, taxaMensalSugerida }: Props) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<
    CompletarConviteState,
    FormData
  >(completarConviteAction, null);

  const [docContratoVenda, setDocContratoVenda] =
    useState<UploadedBlob | null>(null);
  const [docContratoComissao, setDocContratoComissao] =
    useState<UploadedBlob | null>(null);
  const [docNotaFiscal, setDocNotaFiscal] = useState<UploadedBlob | null>(null);

  useEffect(() => {
    if (state?.ok) {
      alertSuccess(
        "Convite aceito e operação criada. Acompanhe pelo painel.",
        "Operação registrada",
      ).then(() => router.push(`/painel/operacoes/${state.operacaoId}`));
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao completar convite");
    }
  }, [state, router, alertSuccess, alertError]);

  // Preview do VP usando taxa sugerida
  const valorComissao = parseFloat(convite.valorComissao);
  const valorVenda = parseFloat(convite.valorVenda);

  const { vp, parcelas } = useMemo(() => {
    const valorParcela = valorComissao / convite.numeroParcelas;
    const start = new Date(convite.dataPrimeiraParcela + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arr = Array.from({ length: convite.numeroParcelas }, (_, i) => {
      const v = new Date(start);
      v.setMonth(v.getMonth() + i);
      return {
        numero: i + 1,
        valor: valorParcela,
        vencimento: v.toISOString().slice(0, 10),
        meses: Math.max(monthsBetween(today, v), 0),
      };
    });
    const v = valorPresente(
      arr.map((p) => ({
        valor: p.valor,
        mesesAteVencimento: p.meses,
      })),
      taxaMensalSugerida,
    );
    return { vp: v, parcelas: arr };
  }, [
    convite.dataPrimeiraParcela,
    convite.numeroParcelas,
    valorComissao,
    taxaMensalSugerida,
  ]);

  return (
    <form action={action} className="grid lg:grid-cols-12 gap-6">
      <input type="hidden" name="pendingId" value={convite.id} />

      <div className="lg:col-span-7 space-y-5">
        {state && !state.ok && (
          <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
            {state.error}
          </div>
        )}

        <Section title="01. Dados da operação (preenchidos pela construtora)">
          <Grid>
            <Field label="Construtora" value={convite.construtoraNome} />
            <Field label="Valor da venda" value={formatBRL(valorVenda)} mono />
            <Field
              label="Valor da comissão"
              value={formatBRL(valorComissao)}
              mono
              highlight
            />
            <Field
              label="Parcelas"
              value={`${convite.numeroParcelas}x de ${formatBRL(valorComissao / convite.numeroParcelas)}`}
              mono
            />
          </Grid>
          {convite.observacoes && (
            <div className="mt-3 rounded-lg bg-bg px-3 py-2 text-sm text-fg-muted">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mr-2">
                obs:
              </span>
              {convite.observacoes}
            </div>
          )}
          <p className="mt-3 text-[11px] text-fg-muted">
            Esses dados não podem ser alterados aqui — se algo está errado,
            avise a construtora pra refazer o cadastro.
          </p>
        </Section>

        <Section
          title="02. Cronograma das parcelas"
          subtitle="Geradas a partir da data da 1ª parcela informada"
        >
          <ul className="space-y-1">
            {parcelas.map((p) => (
              <li
                key={p.numero}
                className="grid grid-cols-12 gap-3 items-center py-2 border-b border-border last:border-0"
              >
                <span className="col-span-1 font-mono text-xs text-fg-dim">
                  #{String(p.numero).padStart(2, "0")}
                </span>
                <span className="col-span-5 text-fg text-sm">
                  {new Date(p.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                </span>
                <span className="col-span-6 text-right font-mono tabular text-sm text-fg-muted">
                  {formatBRL(p.valor)}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="03. Documentos da operação"
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
            description="Contrato firmado entre você e a construtora."
            onChange={setDocContratoComissao}
          />
          <FileUploadField
            label="Nota fiscal da comissão"
            name="doc_nota_fiscal"
            required
            folder="operacoes/nota-fiscal"
            description="NF emitida pelo cedente pra construtora."
            onChange={setDocNotaFiscal}
          />
          <input
            type="hidden"
            name="doc_contrato_venda_nome"
            value={docContratoVenda?.name ?? ""}
          />
          <input
            type="hidden"
            name="doc_contrato_comissao_nome"
            value={docContratoComissao?.name ?? ""}
          />
          <input
            type="hidden"
            name="doc_nota_fiscal_nome"
            value={docNotaFiscal?.name ?? ""}
          />
        </Section>

        <button
          type="submit"
          disabled={
            pending ||
            !docContratoVenda ||
            !docContratoComissao ||
            !docNotaFiscal
          }
          className="btn-primary !w-full justify-center !h-13"
        >
          {pending ? "Enviando..." : "Aceitar e enviar pra análise"}{" "}
          <span className="arrow">→</span>
        </button>
      </div>

      <aside className="lg:col-span-5">
        <div className="lg:sticky lg:top-24 rounded-3xl bg-bg-dark text-fg-inverse p-7 md:p-9 relative overflow-hidden">
          <div className="absolute inset-0 bg-mesh-dark pointer-events-none" aria-hidden />
          <div className="relative">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-fg-inverse/70 mb-2">
              receba amanhã
            </div>
            <div className="font-mono tabular text-3xl md:text-5xl font-bold tracking-tight text-gradient-blue leading-tight">
              {formatBRL(vp)}
            </div>
            <div className="mt-2 text-fg-inverse text-sm font-semibold">
              na sua conta!
            </div>
            <div className="mt-3 rounded-xl bg-white/10 border border-white/15 p-3 text-[11px] leading-relaxed text-fg-inverse/85">
              Esta é uma <strong>estimativa</strong>. O valor exato e a taxa
              final são definidos pelo fundo na aprovação e aparecem no
              borderô.
            </div>

            <div className="mt-7 pt-6 border-t border-white/10 space-y-3 text-sm">
              <Row label="Comissão total" value={formatBRL(valorComissao)} />
              <Row label="Parcelas" value={`${convite.numeroParcelas}x`} />
            </div>
          </div>
        </div>
      </aside>
    </form>
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
        {subtitle && <p className="text-xs text-fg-muted mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-0.5">
        {label}
      </div>
      <div
        className={`text-sm font-semibold ${mono ? "font-mono tabular" : ""} ${
          highlight ? "text-accent text-base" : "text-fg"
        }`}
      >
        {value}
      </div>
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
