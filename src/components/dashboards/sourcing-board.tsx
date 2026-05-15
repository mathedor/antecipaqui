"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBRLcompact } from "@/lib/format";
import { assignFundoFromSourcing } from "@/lib/actions/dashboards";

type Sugestao = {
  fundoId: string;
  fundoNome: string;
  taxaBase: number;
  score: number;
  concentracaoConstrutora: number;
  qtdComConstrutora: number;
  motivo: string;
  blacklist: boolean;
};

type SourcingOp = {
  id: string;
  numero: string;
  valorPresente: number;
  valorComissao: number;
  taxaMensal: number;
  numeroParcelas: number;
  construtoraId: string;
  construtoraNome: string | null;
  construtoraScore: number | null;
  corretorNome: string | null;
  criadaEm: string;
  diasAguardando: number;
  sugestoes: Sugestao[];
};

export function SourcingBoard({ ops }: { ops: SourcingOp[] }) {
  if (ops.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-2">
          sourcing · direcionamento
        </div>
        <h2 className="font-bold tracking-tight text-lg mb-2">
          Sem operações esperando fundo
        </h2>
        <p className="text-sm text-fg-muted">
          Toda operação na mesa já está com fundo atribuído. Quando chegar nova
          sem alocação, aparece aqui com sugestões automáticas.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-warn/30 bg-yellow-50/30 p-5 md:p-6 mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-warn mb-1">
            sourcing · direcionamento
          </div>
          <h2 className="font-bold tracking-tight text-lg">
            {ops.length} operação(ões) esperando fundo
          </h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Sugestões automáticas baseadas em concentração, histórico com a
            construtora e taxa praticada. Clique pra atribuir direto.
          </p>
        </div>
        <Link
          href="/admin/decidir"
          className="text-accent text-xs font-semibold hover:underline shrink-0"
        >
          mesa completa →
        </Link>
      </div>
      <ul className="space-y-3">
        {ops.map((op) => (
          <SourcingRow key={op.id} op={op} />
        ))}
      </ul>
    </section>
  );
}

function SourcingRow({ op }: { op: SourcingOp }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleAssign = (fundoId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await assignFundoFromSourcing({ operacaoId: op.id, fundoId });
        setDone(true);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <li className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <Link
            href={`/admin/operacoes/${op.id}`}
            className="font-mono text-sm font-bold text-fg hover:text-accent"
          >
            {op.numero}
          </Link>
          <div className="text-xs text-fg-muted truncate">
            {op.construtoraNome ?? "—"}
            {op.construtoraScore != null && (
              <span
                className={`ml-2 inline-block font-mono text-[10px] px-1.5 py-0.5 rounded ${
                  op.construtoraScore >= 700
                    ? "bg-success/15 text-success"
                    : op.construtoraScore >= 500
                      ? "bg-warn/15 text-warn"
                      : "bg-danger/15 text-danger"
                }`}
              >
                score {op.construtoraScore}
              </span>
            )}
            <span className="text-fg-dim"> · {op.corretorNome ?? "—"}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono tabular text-sm font-bold text-fg">
            {formatBRLcompact(op.valorPresente)}
          </div>
          <div className="text-[10px] text-fg-dim font-mono">
            {(op.taxaMensal * 100).toFixed(2).replace(".", ",")}% am ·{" "}
            {op.numeroParcelas}x
          </div>
          <div
            className={`text-[10px] font-mono mt-0.5 ${
              op.diasAguardando >= 3 ? "text-warn" : "text-fg-dim"
            }`}
          >
            há {op.diasAguardando}d aguardando
          </div>
        </div>
      </div>

      {done ? (
        <p className="text-xs text-success font-semibold">
          ✓ Fundo atribuído. A op agora aparece na mesa de decisão.
        </p>
      ) : op.sugestoes.length === 0 ? (
        <p className="text-xs text-fg-muted">
          Nenhum fundo elegível (todos bloqueados ou nenhum cadastrado).
        </p>
      ) : (
        <>
          <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim mb-2">
            sugestões automáticas (top 3)
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {op.sugestoes.map((s, idx) => (
              <li
                key={s.fundoId}
                className={`rounded-lg border p-2.5 ${
                  idx === 0
                    ? "border-success/40 bg-green-50"
                    : "border-border bg-bg-elev"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm text-fg truncate">
                    {s.fundoNome}
                  </span>
                  <span
                    className={`font-mono tabular text-xs font-bold shrink-0 ${
                      s.score >= 80
                        ? "text-success"
                        : s.score >= 60
                          ? "text-fg"
                          : "text-warn"
                    }`}
                  >
                    {s.score}
                  </span>
                </div>
                <div className="text-[10px] text-fg-muted mb-2">
                  taxa {(s.taxaBase * 100).toFixed(2).replace(".", ",")}% am ·{" "}
                  conc{" "}
                  {(s.concentracaoConstrutora * 100).toFixed(0)}% ·{" "}
                  {s.qtdComConstrutora} op(s)
                </div>
                <div className="text-[10px] text-fg-dim mb-2 truncate">
                  {s.motivo}
                </div>
                <button
                  type="button"
                  onClick={() => handleAssign(s.fundoId)}
                  disabled={pending}
                  className={`w-full h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    idx === 0
                      ? "bg-success text-white hover:bg-success/90"
                      : "bg-bg-card border border-border text-fg hover:border-accent hover:text-accent"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {pending ? "atribuindo…" : "atribuir"}
                </button>
              </li>
            ))}
          </ul>
          {error && (
            <p className="text-xs text-danger mt-2 font-semibold">
              Erro: {error}
            </p>
          )}
        </>
      )}
    </li>
  );
}
