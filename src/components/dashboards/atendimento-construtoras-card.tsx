"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  convidarConstrutoraAcompanhar,
  removerVinculoConstrutora,
  solicitarOpiniaoConstrutora,
} from "@/lib/actions/atendimento-construtoras";
import {
  type ConstrutoraVinculo,
  TIPO_OPINIAO_LABEL,
  type TipoOpiniao,
} from "@/lib/atendimento-construtoras-types";

type ConstrutoraOpt = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
};

export function ConstrutorasAcompanhandoCard({
  atendimentoId,
  vinculos,
  construtorasDisponiveis,
}: {
  atendimentoId: string;
  vinculos: ConstrutoraVinculo[];
  construtorasDisponiveis: ConstrutoraOpt[];
}) {
  const [showAdd, setShowAdd] = useState(false);

  const semVinculo = construtorasDisponiveis.filter(
    (c) => !vinculos.some((v) => v.construtoraId === c.id),
  );

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
            construtoras acompanhando
          </div>
          <h3 className="font-bold tracking-tight text-base">
            {vinculos.length}{" "}
            {vinculos.length === 1 ? "parceira" : "parceiras"}{" "}
            {vinculos.length > 0 && "no atendimento"}
          </h3>
        </div>
        {!showAdd && semVinculo.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-accent bg-accent-soft text-accent hover:bg-accent hover:text-white"
          >
            + convidar
          </button>
        )}
      </div>

      {showAdd && (
        <AddForm
          construtoras={semVinculo}
          atendimentoId={atendimentoId}
          onClose={() => setShowAdd(false)}
        />
      )}

      {vinculos.length === 0 ? (
        <p className="text-xs text-fg-muted">
          Nenhuma construtora acompanhando ainda. Convide uma pra ela
          comentar/opinar durante a negociação.
        </p>
      ) : (
        <ul className="space-y-2">
          {vinculos.map((v) => (
            <VinculoRow key={v.id} v={v} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AddForm({
  construtoras,
  atendimentoId,
  onClose,
}: {
  construtoras: ConstrutoraOpt[];
  atendimentoId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [construtoraId, setConstrutoraId] = useState(
    construtoras[0]?.id ?? "",
  );

  if (construtoras.length === 0) {
    return (
      <p className="text-xs text-fg-muted">
        Todas as construtoras cadastradas já estão acompanhando.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg p-3 space-y-2">
      <select
        value={construtoraId}
        onChange={(e) => setConstrutoraId(e.target.value)}
        className="w-full h-9 px-3 rounded-lg border border-border bg-bg-elev text-sm"
      >
        {construtoras.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nomeFantasia ?? c.razaoSocial}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-[11px] text-danger font-semibold">{error}</p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-3 py-1 rounded border border-border text-fg-muted"
        >
          cancelar
        </button>
        <button
          type="button"
          disabled={pending || !construtoraId}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await convidarConstrutoraAcompanhar({
                atendimentoId,
                construtoraId,
              });
              if (!r.ok) setError(r.error ?? "Erro");
              else {
                router.refresh();
                onClose();
              }
            });
          }}
          className="text-xs px-3 py-1 rounded bg-accent text-white disabled:opacity-50"
        >
          {pending ? "convidando…" : "convidar"}
        </button>
      </div>
    </div>
  );
}

function VinculoRow({ v }: { v: ConstrutoraVinculo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAsk, setShowAsk] = useState(false);

  const recomendaLabel =
    v.opiniaoRecomenda === true
      ? "✓ recomenda prosseguir"
      : v.opiniaoRecomenda === false
        ? "✕ não recomenda"
        : "↪ condicional";
  const recomendaCls =
    v.opiniaoRecomenda === true
      ? "text-success"
      : v.opiniaoRecomenda === false
        ? "text-danger"
        : "text-warn";

  return (
    <li
      className={`rounded-lg border p-3 ${
        v.aguardandoOpiniao
          ? "border-warn/40 bg-yellow-50"
          : v.opiniaoTexto
            ? "border-success/30 bg-green-50"
            : "border-border bg-bg"
      }`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
        <div className="min-w-0">
          <div className="font-semibold text-sm text-fg">
            {v.construtoraNome}
          </div>
          {v.aguardandoOpiniao && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-warn text-white inline-block mt-0.5">
              ⏸ aguardando opinião
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {!v.aguardandoOpiniao && (
            <button
              type="button"
              onClick={() => setShowAsk(true)}
              className="text-[11px] px-2 py-1 rounded border border-warn/40 text-warn hover:bg-yellow-50"
            >
              📩 solicitar opinião
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!confirm(`Remover ${v.construtoraNome} do acompanhamento?`))
                return;
              startTransition(async () => {
                await removerVinculoConstrutora({ vinculoId: v.id });
                router.refresh();
              });
            }}
            disabled={pending}
            className="text-[11px] px-2 py-1 rounded border border-danger/30 text-danger hover:bg-red-50 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      </div>

      {v.opiniaoSolicitadaTexto && (
        <div className="text-[11px] text-fg-muted mt-2 rounded bg-bg-card border border-border p-2">
          <div className="font-mono text-[9px] uppercase tracking-wider text-warn mb-0.5">
            opinião solicitada ·{" "}
            {v.tipoOpiniaoSolicitada &&
              TIPO_OPINIAO_LABEL[v.tipoOpiniaoSolicitada as TipoOpiniao]}
          </div>
          {v.opiniaoSolicitadaTexto}
        </div>
      )}

      {v.opiniaoTexto && (
        <div className="text-[11px] mt-2 rounded bg-bg-card border border-border p-2 space-y-1">
          <div
            className={`font-mono text-[9px] uppercase tracking-wider ${recomendaCls}`}
          >
            resposta · {recomendaLabel} ·{" "}
            {v.opiniaoRecebidaEm &&
              new Date(v.opiniaoRecebidaEm).toLocaleDateString("pt-BR")}
          </div>
          <p className="text-fg whitespace-pre-line">{v.opiniaoTexto}</p>
        </div>
      )}

      {showAsk && (
        <SolicitarOpiniaoModal
          vinculoId={v.id}
          onClose={() => setShowAsk(false)}
        />
      )}
    </li>
  );
}

function SolicitarOpiniaoModal({
  vinculoId,
  onClose,
}: {
  vinculoId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<TipoOpiniao>("opiniao_geral");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-bg-elev shadow-2xl p-5 md:p-6 space-y-3">
        <h3 className="text-lg font-bold">Solicitar opinião</h3>
        <p className="text-xs text-fg-muted">
          A construtora vai receber notificação destacada e email. Atendimento
          fica marcado como "aguardando opinião".
        </p>
        <div>
          <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
            tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoOpiniao)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm"
          >
            {(Object.entries(TIPO_OPINIAO_LABEL) as [TipoOpiniao, string][]).map(
              ([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
            descrição
          </label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="O que você quer que a construtora opine?"
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm resize-y"
          />
        </div>
        {error && (
          <p className="text-xs text-danger font-semibold">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-2 rounded-lg border border-border text-fg-muted"
          >
            cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              if (!texto.trim()) {
                setError("Descreva o que precisa ser opinado");
                return;
              }
              startTransition(async () => {
                const r = await solicitarOpiniaoConstrutora({
                  vinculoId,
                  tipo,
                  texto,
                });
                if (!r.ok) setError(r.error ?? "Erro");
                else {
                  router.refresh();
                  onClose();
                }
              });
            }}
            className="text-xs px-3 py-2 rounded-lg bg-accent text-white font-semibold disabled:opacity-50"
          >
            {pending ? "enviando…" : "📩 solicitar"}
          </button>
        </div>
      </div>
    </div>
  );
}
