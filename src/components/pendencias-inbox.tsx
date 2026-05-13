"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  decidirAntecipacaoAction,
  decidirRenegociacaoAction,
} from "@/lib/actions/construtora-operacional";
import { useFeedback } from "@/components/feedback-provider";

type AntecipacaoRow = {
  a: {
    id: string;
    parcelaId: string;
    valorOriginal: string;
    valorAntecipado: string;
    descontoPct: string;
    dataPretendida: string;
    createdAt: Date | string;
  };
  parcela: { numero: number };
  operacao: { id: string; numero: string };
  construtora: { razaoSocial: string } | null;
  solicitadoPor: string | null;
};

type RenegociacaoRow = {
  r: {
    id: string;
    parcelaId: string;
    motivo: string;
    tipo: string;
    novoVencimento: string | null;
    splitParcelas: unknown;
    createdAt: Date | string;
  };
  parcela: { numero: number };
  operacao: { id: string; numero: string };
  construtora: { razaoSocial: string } | null;
  solicitadoPor: string | null;
};

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}
function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Tab = "antecipacoes" | "renegociacoes";

export function PendenciasInbox({
  antecipacoes,
  renegociacoes,
  adminContext = false,
}: {
  antecipacoes: AntecipacaoRow[];
  renegociacoes: RenegociacaoRow[];
  /** Se true, usa rotas /admin/operacoes/[id]. Senão /painel/operacoes/[id]. */
  adminContext?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(
    antecipacoes.length > 0 ? "antecipacoes" : "renegociacoes",
  );

  return (
    <div>
      <div className="flex gap-2 mb-5 border-b border-border">
        <TabButton active={tab === "antecipacoes"} onClick={() => setTab("antecipacoes")}>
          ⚡ Antecipações ({antecipacoes.length})
        </TabButton>
        <TabButton active={tab === "renegociacoes"} onClick={() => setTab("renegociacoes")}>
          🔄 Renegociações ({renegociacoes.length})
        </TabButton>
      </div>

      {tab === "antecipacoes" && (
        <AntecipacoesList rows={antecipacoes} adminContext={adminContext} />
      )}
      {tab === "renegociacoes" && (
        <RenegociacoesList rows={renegociacoes} adminContext={adminContext} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 px-4 text-sm font-semibold transition-colors border-b-2 ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-fg-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function AntecipacoesList({
  rows,
  adminContext,
}: {
  rows: AntecipacaoRow[];
  adminContext: boolean;
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [busy, setBusy] = useState<string | null>(null);

  async function decidir(id: string, aprovar: boolean) {
    setBusy(id);
    try {
      let motivo: string | undefined;
      if (!aprovar) {
        const motivoInput = window.prompt(
          "Motivo da recusa (será enviado pra construtora):",
        );
        if (!motivoInput || motivoInput.trim().length === 0) {
          setBusy(null);
          return;
        }
        motivo = motivoInput.trim();
      } else {
        const ok = await confirm({
          title: "Aprovar antecipação?",
          message:
            "Construtora pode quitar antes do vencimento com o desconto proposto. Confirma?",
          confirmLabel: "Aprovar",
        });
        if (!ok) {
          setBusy(null);
          return;
        }
      }
      await decidirAntecipacaoAction(id, aprovar, motivo);
      await alertSuccess(
        aprovar ? "Antecipação aprovada." : "Antecipação recusada.",
        "Pronto",
      );
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-sm text-fg-muted">
        Nenhuma antecipação pendente.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.a.id}
          className="rounded-2xl border border-warn/40 bg-yellow-50 p-5"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Link
                  href={`${adminContext ? "/admin" : "/painel"}/operacoes/${row.operacao.id}`}
                  className="font-mono text-[11px] uppercase tracking-wider text-accent hover:underline"
                >
                  op {row.operacao.numero} · parcela {row.parcela.numero}
                </Link>
                <span className="text-[10px] text-fg-dim">
                  · {formatDateTime(row.a.createdAt)}
                </span>
              </div>
              <p className="text-sm font-semibold">
                {row.construtora?.razaoSocial ?? "—"} ·{" "}
                {row.solicitadoPor ?? "—"}
              </p>
              <p className="text-sm mt-2">
                Antecipa para{" "}
                <strong>{formatDate(row.a.dataPretendida)}</strong> com{" "}
                <strong>
                  {(parseFloat(row.a.descontoPct) * 100).toFixed(2)}%
                </strong>{" "}
                de desconto:{" "}
                <strong>{formatBRL(parseFloat(row.a.valorAntecipado))}</strong>{" "}
                <span className="text-xs text-fg-muted">
                  (original {formatBRL(parseFloat(row.a.valorOriginal))})
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === row.a.id}
                onClick={() => decidir(row.a.id, true)}
                className="h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                ✓ Aprovar
              </button>
              <button
                type="button"
                disabled={busy === row.a.id}
                onClick={() => decidir(row.a.id, false)}
                className="h-10 px-4 rounded-lg border border-border bg-bg text-sm font-semibold hover:border-danger hover:text-danger disabled:opacity-50"
              >
                ✕ Recusar
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RenegociacoesList({
  rows,
  adminContext,
}: {
  rows: RenegociacaoRow[];
  adminContext: boolean;
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [busy, setBusy] = useState<string | null>(null);

  async function decidir(id: string, aprovar: boolean) {
    setBusy(id);
    try {
      let motivo: string | undefined;
      if (!aprovar) {
        const motivoInput = window.prompt(
          "Motivo da recusa (será enviado pra construtora):",
        );
        if (!motivoInput || motivoInput.trim().length === 0) {
          setBusy(null);
          return;
        }
        motivo = motivoInput.trim();
      } else {
        const ok = await confirm({
          title: "Aprovar renegociação?",
          message:
            "Atenção: aprovar APLICA a mudança automaticamente (troca vencimento ou divide em parcelas novas). Confirma?",
          confirmLabel: "Aprovar e aplicar",
        });
        if (!ok) {
          setBusy(null);
          return;
        }
      }
      await decidirRenegociacaoAction(id, aprovar, motivo);
      await alertSuccess(
        aprovar ? "Renegociação aplicada." : "Renegociação recusada.",
        "Pronto",
      );
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-sm text-fg-muted">
        Nenhuma renegociação pendente.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.r.id}
          className="rounded-2xl border border-warn/40 bg-yellow-50 p-5"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Link
                  href={`${adminContext ? "/admin" : "/painel"}/operacoes/${row.operacao.id}`}
                  className="font-mono text-[11px] uppercase tracking-wider text-accent hover:underline"
                >
                  op {row.operacao.numero} · parcela {row.parcela.numero}
                </Link>
                <span className="text-[10px] text-fg-dim">
                  · {formatDateTime(row.r.createdAt)}
                </span>
              </div>
              <p className="text-sm font-semibold">
                {row.construtora?.razaoSocial ?? "—"} ·{" "}
                {row.solicitadoPor ?? "—"}
              </p>
              <p className="text-sm mt-2">
                <strong className="uppercase text-xs font-mono mr-2">
                  {row.r.tipo}
                </strong>
                {row.r.tipo === "prorrogar" && row.r.novoVencimento && (
                  <>
                    Novo vencimento:{" "}
                    <strong>{formatDate(row.r.novoVencimento)}</strong>
                  </>
                )}
                {row.r.tipo === "dividir" &&
                  Array.isArray(row.r.splitParcelas) && (
                    <>
                      Dividir em{" "}
                      <strong>
                        {(row.r.splitParcelas as unknown[]).length}
                      </strong>{" "}
                      parcela(s)
                    </>
                  )}
              </p>
              <p className="text-sm text-fg-muted mt-1">
                Motivo: {row.r.motivo}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === row.r.id}
                onClick={() => decidir(row.r.id, true)}
                className="h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                ✓ Aprovar
              </button>
              <button
                type="button"
                disabled={busy === row.r.id}
                onClick={() => decidir(row.r.id, false)}
                className="h-10 px-4 rounded-lg border border-border bg-bg text-sm font-semibold hover:border-danger hover:text-danger disabled:opacity-50"
              >
                ✕ Recusar
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
