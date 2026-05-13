"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { notificarPagamentoLote } from "@/lib/actions/construtora-operacional";
import { useFeedback } from "@/components/feedback-provider";

type Row = {
  parcelaId: string;
  numero: number;
  vencimento: string;
  valor: string;
  statusParcela: string;
  operacaoNumero: string;
};

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

export function BulkPayPanel({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comprovante, setComprovante] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const elegiveis = rows.filter((r) => r.statusParcela !== "paga");
  if (elegiveis.length === 0) return null;

  const total = elegiveis
    .filter((r) => selected.has(r.parcelaId))
    .reduce((s, r) => s + parseFloat(r.valor), 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === elegiveis.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(elegiveis.map((r) => r.parcelaId)));
    }
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/chats/upload",
      });
      setComprovante({
        url: `/api/blob/${blob.pathname}`,
        name: file.name,
      });
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function submitLote() {
    if (selected.size === 0 || !comprovante) return;
    setSubmitting(true);
    try {
      const r = await notificarPagamentoLote(
        Array.from(selected),
        comprovante.url,
        comprovante.name,
        dataPagamento,
      );
      await alertSuccess(
        `${r.qtd} parcela(s) marcadas. Admin/fundo confere e baixa.`,
        "Enviado",
      );
      setSelected(new Set());
      setComprovante(null);
      setOpen(false);
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-6 flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-semibold text-fg hover:border-accent hover:text-accent"
        >
          💰 Pagar várias de uma vez ({elegiveis.length} elegíveis)
        </button>
      </div>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-accent/40 bg-accent-soft p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-bold">Pagamento em lote</h3>
          <p className="text-xs text-fg-muted mt-1">
            Selecione as parcelas, anexe 1 comprovante (TED batch / agendamento)
            e confirme. Admin/fundo confere e dá baixa final.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-fg-muted hover:text-fg"
        >
          fechar ×
        </button>
      </div>

      <div className="rounded-xl bg-bg border border-border mb-4">
        <div className="px-4 py-2 border-b border-border bg-bg-card flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.size === elegiveis.length && elegiveis.length > 0}
            onChange={toggleAll}
          />
          <span className="text-xs text-fg-muted">
            {selected.size > 0
              ? `${selected.size} selecionada(s) · ${formatBRL(total)}`
              : "Selecionar todas"}
          </span>
        </div>
        <ul className="max-h-64 overflow-y-auto divide-y divide-border">
          {elegiveis.map((r) => (
            <li key={r.parcelaId}>
              <label className="flex items-center gap-3 px-4 py-2 hover:bg-bg-card cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(r.parcelaId)}
                  onChange={() => toggle(r.parcelaId)}
                />
                <span className="flex-1 grid grid-cols-12 gap-2 text-sm">
                  <span className="col-span-2 font-mono text-xs">
                    #{String(r.numero).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/painel/operacoes/`}
                    className="col-span-3 font-mono text-xs text-fg-muted truncate"
                  >
                    {r.operacaoNumero}
                  </Link>
                  <span className="col-span-3 text-xs text-fg-muted">
                    {formatDate(r.vencimento)}
                  </span>
                  <span className="col-span-4 text-right font-mono font-semibold">
                    {formatBRL(parseFloat(r.valor))}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Data do pagamento
          </label>
          <input
            type="date"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Comprovante (TED batch / agendamento)
          </label>
          <input
            type="file"
            accept="application/pdf,image/*"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block w-full text-xs text-fg file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-white hover:file:bg-accent-dark"
          />
          {uploading && (
            <div className="text-xs text-fg-dim mt-1">Enviando...</div>
          )}
          {comprovante && (
            <div className="text-xs text-success mt-1">
              ✓ {comprovante.name}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={selected.size === 0 || !comprovante || submitting}
        onClick={submitLote}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
      >
        {submitting
          ? "Enviando..."
          : `Confirmar pagamento de ${selected.size} parcela(s) · ${formatBRL(total)}`}
      </button>
    </section>
  );
}
