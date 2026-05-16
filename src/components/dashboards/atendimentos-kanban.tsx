"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  changeStatusAtendimento,
  createAtendimento,
  deleteAtendimento,
} from "@/lib/actions/atendimentos";
import {
  type AtendimentoStatus,
  STATUS_LABEL,
  STATUS_ORDER,
} from "@/lib/atendimento-types";
import { formatBRLcompact, parseBRLNumber } from "@/lib/format";
import type { Atendimento } from "@/db/schema";

const STATUS_COLOR: Record<AtendimentoStatus, string> = {
  contato_inicial: "border-fg-dim/40 bg-bg-card",
  qualificado: "border-accent/30 bg-accent-soft",
  visita: "border-purple-300 bg-purple-50",
  proposta: "border-warn/40 bg-yellow-50",
  negociacao: "border-warn/40 bg-yellow-50",
  fechado: "border-success/40 bg-green-50",
  perdido: "border-danger/40 bg-red-50",
};

const STATUS_HEADER_CLS: Record<AtendimentoStatus, string> = {
  contato_inicial: "text-fg-muted",
  qualificado: "text-accent",
  visita: "text-purple-700",
  proposta: "text-warn",
  negociacao: "text-warn",
  fechado: "text-success",
  perdido: "text-danger",
};

type Corretor = { userId: string; nome: string; email: string };

export function AtendimentosKanban({
  initialAtendimentos,
  corretores,
  canSeeAll,
  currentUserId,
}: {
  initialAtendimentos: Atendimento[];
  corretores: Corretor[];
  canSeeAll: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [filterCorretor, setFilterCorretor] = useState<string>("__all__");
  const [showForm, setShowForm] = useState(false);

  const corretorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of corretores) m.set(c.userId, c.nome);
    return m;
  }, [corretores]);

  const filtered = useMemo(() => {
    if (!canSeeAll) return initialAtendimentos;
    if (filterCorretor === "__all__") return initialAtendimentos;
    return initialAtendimentos.filter(
      (a) => a.corretorUserId === filterCorretor,
    );
  }, [initialAtendimentos, filterCorretor, canSeeAll]);

  const byStatus = useMemo(() => {
    return STATUS_ORDER.reduce(
      (acc, s) => {
        acc[s] = filtered.filter((a) => a.status === s);
        return acc;
      },
      {} as Record<AtendimentoStatus, Atendimento[]>,
    );
  }, [filtered]);

  const totalAtivos = STATUS_ORDER.filter(
    (s) => s !== "fechado" && s !== "perdido",
  ).reduce((s, st) => s + byStatus[st].length, 0);
  const valorAtivo = STATUS_ORDER.filter(
    (s) => s !== "fechado" && s !== "perdido",
  ).reduce(
    (s, st) =>
      s +
      byStatus[st].reduce(
        (acc, a) =>
          acc + (a.imovelValor ? parseFloat(a.imovelValor) : 0),
        0,
      ),
    0,
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-3 items-baseline flex-wrap">
          <span className="text-sm text-fg-muted">
            <strong className="text-fg">{totalAtivos}</strong> atendimento(s)
            ativo(s) · valor estimado{" "}
            <strong className="text-fg">{formatBRLcompact(valorAtivo)}</strong>
          </span>
          {canSeeAll && corretores.length > 1 && (
            <select
              value={filterCorretor}
              onChange={(e) => setFilterCorretor(e.target.value)}
              className="h-8 px-2 rounded-lg border border-border bg-bg text-xs"
            >
              <option value="__all__">Todos corretores</option>
              {corretores.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.nome}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn-primary !h-11 !px-5"
        >
          + Novo atendimento
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-2">
        {STATUS_ORDER.map((s) => {
          const items = byStatus[s];
          const total = items.reduce(
            (acc, a) =>
              acc + (a.imovelValor ? parseFloat(a.imovelValor) : 0),
            0,
          );
          return (
            <section
              key={s}
              className="rounded-2xl border border-border bg-bg-elev p-2 min-h-[120px]"
            >
              <div className="flex items-baseline justify-between gap-2 mb-2 px-1">
                <div
                  className={`font-mono text-[10px] uppercase tracking-wider ${STATUS_HEADER_CLS[s]}`}
                >
                  {STATUS_LABEL[s]}
                </div>
                <span className="text-[10px] font-mono text-fg-dim">
                  {items.length}
                </span>
              </div>
              {total > 0 && (
                <div className="text-[10px] font-mono text-fg-muted mb-2 px-1">
                  {formatBRLcompact(total)}
                </div>
              )}
              <ul className="space-y-1.5">
                {items.map((a) => (
                  <AtendimentoCard
                    key={a.id}
                    a={a}
                    corretorMap={corretorMap}
                    canDelete={canSeeAll}
                    isMine={a.corretorUserId === currentUserId}
                  />
                ))}
                {items.length === 0 && (
                  <li className="text-[11px] text-fg-dim text-center py-3">
                    vazio
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      {showForm && (
        <NovoAtendimentoModal
          corretores={corretores}
          canChooseCorretor={canSeeAll}
          currentUserId={currentUserId}
          onClose={() => setShowForm(false)}
          onCreated={() => router.refresh()}
        />
      )}
    </>
  );
}

function AtendimentoCard({
  a,
  corretorMap,
  canDelete,
  isMine,
}: {
  a: Atendimento;
  corretorMap: Map<string, string>;
  canDelete: boolean;
  isMine: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);

  const move = (status: AtendimentoStatus) => {
    let motivo: string | undefined;
    if (status === "perdido") {
      motivo = prompt("Motivo da perda (opcional):")?.trim() || undefined;
    }
    startTransition(async () => {
      await changeStatusAtendimento({ id: a.id, status, motivoPerda: motivo });
      router.refresh();
      setShowMenu(false);
    });
  };

  const remove = () => {
    if (!confirm(`Remover atendimento de "${a.compradorNome}"?`)) return;
    startTransition(async () => {
      await deleteAtendimento(a.id);
      router.refresh();
    });
  };

  const corretorNome =
    corretorMap.get(a.corretorUserId) ?? a.corretorUserId.slice(0, 8);
  const corColor =
    a.scoreRisco === "baixo"
      ? "bg-green-500"
      : a.scoreRisco === "medio"
        ? "bg-yellow-500"
        : a.scoreRisco === "alto" || a.scoreRisco === "critico"
          ? "bg-red-500"
          : "";

  return (
    <li
      className={`rounded-lg border p-2.5 ${STATUS_COLOR[a.status as AtendimentoStatus]}`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <Link
          href={`/painel/atendimentos/${a.id}`}
          className="text-sm font-semibold text-fg hover:text-accent truncate text-left flex-1 min-w-0"
        >
          {a.compradorNome}
        </Link>
        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          className="size-6 text-fg-dim hover:text-fg shrink-0 text-base leading-none"
        >
          ⋯
        </button>
      </div>
      {a.imovelDescricao && (
        <div className="text-[10px] text-fg-muted line-clamp-1">
          🏠 {a.imovelDescricao}
        </div>
      )}
      {a.imovelValor && (
        <div className="text-[10px] font-mono tabular text-fg font-semibold mt-1">
          {formatBRLcompact(parseFloat(a.imovelValor))}
        </div>
      )}
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {a.scoreComprador && (
          <span
            className={`inline-flex items-center gap-0.5 text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded text-white ${corColor}`}
            title={`Score ${a.scoreComprador}`}
          >
            ★ {a.scoreComprador}
          </span>
        )}
        {!isMine && (
          <span className="text-[9px] font-mono text-fg-dim truncate">
            {corretorNome.split(" ")[0]}
          </span>
        )}
        {a.operacaoId && (
          <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded bg-success text-white">
            ⚡ op
          </span>
        )}
      </div>
      {showMenu && (
        <div className="mt-2 pt-2 border-t border-border space-y-1.5">
          <div className="text-[9px] uppercase font-mono text-fg-dim">
            mover para
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_ORDER.filter((s) => s !== a.status).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => move(s)}
                disabled={pending}
                className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-bg-card text-fg-muted hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {canDelete && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="w-full text-[10px] py-1 rounded border border-danger/30 text-danger hover:bg-red-50 disabled:opacity-50"
            >
              remover
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function NovoAtendimentoModal({
  corretores,
  canChooseCorretor,
  currentUserId,
  onClose,
  onCreated,
}: {
  corretores: Corretor[];
  canChooseCorretor: boolean;
  currentUserId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [compradorNome, setCompradorNome] = useState("");
  const [compradorEmail, setCompradorEmail] = useState("");
  const [compradorTelefone, setCompradorTelefone] = useState("");
  const [compradorDocumento, setCompradorDocumento] = useState("");
  const [imovelDescricao, setImovelDescricao] = useState("");
  const [imovelEndereco, setImovelEndereco] = useState("");
  const [imovelValor, setImovelValor] = useState("");
  const [comissaoEstimada, setComissaoEstimada] = useState("");
  const [corretorUserId, setCorretorUserId] = useState(currentUserId);

  const submit = () => {
    setError(null);
    if (!compradorNome.trim()) {
      setError("Nome do comprador obrigatório");
      return;
    }
    startTransition(async () => {
      const r = await createAtendimento({
        compradorNome,
        compradorEmail,
        compradorTelefone,
        compradorDocumento,
        imovelDescricao,
        imovelEndereco,
        imovelValor: parseBRLNumber(imovelValor) || undefined,
        comissaoEstimada: parseBRLNumber(comissaoEstimada) || undefined,
        corretorUserId: canChooseCorretor ? corretorUserId : undefined,
      });
      if (!r.ok) setError(r.error ?? "Erro");
      else {
        onCreated();
        onClose();
        if (r.id) router.push(`/painel/atendimentos/${r.id}`);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-bg-elev shadow-2xl p-5 md:p-6">
        <h3 className="text-xl font-bold mb-4">Novo atendimento</h3>
        <div className="space-y-4">
          <section>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
              comprador
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={compradorNome}
                onChange={(e) => setCompradorNome(e.target.value)}
                placeholder="Nome do comprador *"
                className="h-10 px-3 rounded-lg border border-border bg-bg text-sm sm:col-span-2"
              />
              <input
                type="email"
                value={compradorEmail}
                onChange={(e) => setCompradorEmail(e.target.value)}
                placeholder="Email"
                className="h-10 px-3 rounded-lg border border-border bg-bg text-sm"
              />
              <input
                type="tel"
                value={compradorTelefone}
                onChange={(e) => setCompradorTelefone(e.target.value)}
                placeholder="Telefone"
                className="h-10 px-3 rounded-lg border border-border bg-bg text-sm"
              />
              <input
                type="text"
                value={compradorDocumento}
                onChange={(e) => setCompradorDocumento(e.target.value)}
                placeholder="CPF/CNPJ"
                className="h-10 px-3 rounded-lg border border-border bg-bg text-sm font-mono"
              />
            </div>
          </section>
          <section>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
              imóvel
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={imovelDescricao}
                onChange={(e) => setImovelDescricao(e.target.value)}
                placeholder='Descrição breve ("Apto 2dorm, Vila Madalena, 80m²")'
                className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm"
              />
              <input
                type="text"
                value={imovelEndereco}
                onChange={(e) => setImovelEndereco(e.target.value)}
                placeholder="Endereço"
                className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={imovelValor}
                  onChange={(e) => setImovelValor(e.target.value)}
                  placeholder="Valor R$ (opcional)"
                  className="h-10 px-3 rounded-lg border border-border bg-bg text-sm tabular text-right"
                />
                <input
                  type="text"
                  value={comissaoEstimada}
                  onChange={(e) => setComissaoEstimada(e.target.value)}
                  placeholder="Comissão estimada R$"
                  className="h-10 px-3 rounded-lg border border-border bg-bg text-sm tabular text-right"
                />
              </div>
            </div>
          </section>
          {canChooseCorretor && (
            <section>
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
                corretor responsável
              </div>
              <select
                value={corretorUserId}
                onChange={(e) => setCorretorUserId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm"
              >
                {corretores.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </section>
          )}
          {error && (
            <p className="text-xs text-danger font-semibold">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-border text-fg-muted hover:text-fg text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
            >
              {pending ? "criando…" : "Criar atendimento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
