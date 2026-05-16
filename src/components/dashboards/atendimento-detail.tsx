"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addEvento,
  changeStatusAtendimento,
  consultarScoreAtendimento,
  encaminharParaAntecipacao,
  updateAtendimento,
} from "@/lib/actions/atendimentos";
import type { ConstrutoraVinculo } from "@/lib/atendimento-construtoras-types";
import { ConstrutorasAcompanhandoCard } from "@/components/dashboards/atendimento-construtoras-card";
import {
  type AtendimentoStatus,
  EVENTO_EMOJI,
  EVENTO_LABEL,
  type EventoTipo,
  STATUS_LABEL,
  STATUS_ORDER,
} from "@/lib/atendimento-types";
import { formatBRL, formatBRLcompact, parseBRLNumber } from "@/lib/format";
import type { Atendimento, AtendimentoEvento } from "@/db/schema";

const STATUS_COLOR: Record<AtendimentoStatus, string> = {
  contato_inicial: "bg-gray-500",
  qualificado: "bg-accent",
  visita: "bg-purple-600",
  proposta: "bg-amber-500",
  negociacao: "bg-orange-500",
  fechado: "bg-success",
  perdido: "bg-danger",
};

export function AtendimentoDetail({
  atendimento,
  eventos,
  currentUserId,
  construtorasVinculadas,
  construtorasDisponiveis,
}: {
  atendimento: Atendimento;
  eventos: AtendimentoEvento[];
  currentUserId: string;
  construtorasVinculadas: ConstrutoraVinculo[];
  construtorasDisponiveis: Array<{
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpj: string;
  }>;
}) {
  const router = useRouter();
  const a = atendimento;
  const isOwnerAtend = a.corretorUserId === currentUserId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
              atendimento · {STATUS_LABEL[a.status as AtendimentoStatus]}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {a.compradorNome}
            </h1>
          </div>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded text-white ${STATUS_COLOR[a.status as AtendimentoStatus]}`}
          >
            {STATUS_LABEL[a.status as AtendimentoStatus]}
          </span>
        </div>
        <p className="text-xs text-fg-muted">
          criado em{" "}
          {new Date(a.createdAt).toLocaleDateString("pt-BR")} ·{" "}
          {isOwnerAtend ? "você é o responsável" : "outro corretor"}
        </p>
      </div>

      {/* Status changer */}
      <StatusChanger a={a} />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Coluna principal: dados + construtoras + timeline */}
        <div className="lg:col-span-2 space-y-5">
          <DadosEditaveis a={a} />
          <ConstrutorasAcompanhandoCard
            atendimentoId={a.id}
            vinculos={construtorasVinculadas}
            construtorasDisponiveis={construtorasDisponiveis}
          />
          <Timeline
            atendimentoId={a.id}
            eventos={eventos}
            statusAtual={a.status as AtendimentoStatus}
          />
        </div>

        {/* Coluna lateral: ações */}
        <aside className="space-y-4">
          <CompradorCard a={a} />
          <AcoesCard a={a} />
        </aside>
      </div>
    </div>
  );
}

function StatusChanger({ a }: { a: Atendimento }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const cur = a.status as AtendimentoStatus;

  const move = (to: AtendimentoStatus) => {
    let motivo: string | undefined;
    if (to === "perdido") {
      motivo = prompt("Motivo da perda:")?.trim() || undefined;
    }
    startTransition(async () => {
      await changeStatusAtendimento({ id: a.id, status: to, motivoPerda: motivo });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-[10px] uppercase font-mono tracking-wider text-fg-dim mr-2">
        mover para:
      </span>
      {STATUS_ORDER.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => move(s)}
          disabled={pending || s === cur}
          className={`text-xs px-3 h-8 rounded-lg border ${
            s === cur
              ? "border-accent bg-accent text-white"
              : "border-border bg-bg-elev text-fg-muted hover:border-accent hover:text-accent"
          } disabled:opacity-60`}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

function DadosEditaveis({ a }: { a: Atendimento }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const [descricao, setDescricao] = useState(a.imovelDescricao ?? "");
  const [endereco, setEndereco] = useState(a.imovelEndereco ?? "");
  const [valor, setValor] = useState(
    a.imovelValor ? parseFloat(a.imovelValor).toString() : "",
  );
  const [comissao, setComissao] = useState(
    a.comissaoEstimada ? parseFloat(a.comissaoEstimada).toString() : "",
  );

  if (!editing) {
    return (
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
              imóvel
            </div>
            <h2 className="font-bold tracking-tight text-lg">
              {a.imovelDescricao ?? "Sem descrição"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1 rounded-lg border border-border hover:border-accent hover:text-accent"
          >
            ✎ editar
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Field label="Endereço" value={a.imovelEndereco} />
          <Field
            label="Valor do imóvel"
            value={a.imovelValor ? formatBRL(parseFloat(a.imovelValor)) : null}
          />
          <Field
            label="Comissão estimada"
            value={
              a.comissaoEstimada
                ? formatBRL(parseFloat(a.comissaoEstimada))
                : null
            }
            highlight
          />
          {a.imovelCidade && (
            <Field
              label="Cidade/UF"
              value={`${a.imovelCidade}${a.imovelUf ? "/" + a.imovelUf : ""}`}
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-accent bg-accent-soft p-5 md:p-6 space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-2">
        editando imóvel
      </div>
      <input
        type="text"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Descrição"
        className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm"
      />
      <input
        type="text"
        value={endereco}
        onChange={(e) => setEndereco(e.target.value)}
        placeholder="Endereço"
        className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor R$"
          className="h-10 px-3 rounded-lg border border-border bg-bg text-sm tabular text-right"
        />
        <input
          type="text"
          value={comissao}
          onChange={(e) => setComissao(e.target.value)}
          placeholder="Comissão R$"
          className="h-10 px-3 rounded-lg border border-border bg-bg text-sm tabular text-right"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs px-3 py-1.5 rounded-lg border border-border"
        >
          cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              await updateAtendimento({
                id: a.id,
                imovelDescricao: descricao,
                imovelEndereco: endereco,
                imovelValor: parseBRLNumber(valor) || null,
                comissaoEstimada: parseBRLNumber(comissao) || null,
              });
              router.refresh();
              setEditing(false);
            });
          }}
          disabled={pending}
          className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white disabled:opacity-50"
        >
          {pending ? "salvando…" : "salvar"}
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        highlight ? "border-accent/40 bg-accent-soft" : "border-border bg-bg"
      }`}
    >
      <div
        className={`font-mono text-[9px] uppercase tracking-wider mb-1 ${
          highlight ? "text-accent" : "text-fg-dim"
        }`}
      >
        {label}
      </div>
      <div
        className={`text-sm ${
          highlight ? "font-bold text-fg" : "text-fg"
        }`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function CompradorCard({ a }: { a: Atendimento }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tel = a.compradorTelefone?.replace(/\D/g, "");
  const waUrl = tel
    ? `https://wa.me/${tel.startsWith("55") ? tel : "55" + tel}`
    : null;

  const scoreColor =
    a.scoreRisco === "baixo"
      ? "text-success bg-green-50 border-success/30"
      : a.scoreRisco === "medio"
        ? "text-yellow-700 bg-yellow-50 border-yellow-300"
        : a.scoreRisco === "alto" || a.scoreRisco === "critico"
          ? "text-danger bg-red-50 border-danger/30"
          : "text-fg-muted bg-bg-card border-border";

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-4 md:p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-3">
        comprador
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="font-bold text-fg">{a.compradorNome}</div>
        {a.compradorEmail && (
          <div className="text-xs text-fg-muted break-all">
            ✉ {a.compradorEmail}
          </div>
        )}
        {a.compradorTelefone && (
          <div className="text-xs text-fg-muted">
            📱 {a.compradorTelefone}
          </div>
        )}
        {a.compradorDocumento && (
          <div className="text-xs text-fg-muted font-mono">
            🆔 {a.compradorDocumento}
          </div>
        )}
      </div>

      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener"
          className="mt-3 inline-flex items-center justify-center gap-1 w-full h-9 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 no-underline"
        >
          💬 Abrir WhatsApp
        </a>
      )}

      {/* Score */}
      <div className={`mt-3 rounded-lg border p-3 ${scoreColor}`}>
        <div className="font-mono text-[9px] uppercase tracking-wider mb-1">
          score de crédito
        </div>
        {a.scoreComprador ? (
          <>
            <div className="font-mono tabular text-2xl font-bold">
              {a.scoreComprador}
            </div>
            <div className="text-[10px] uppercase">
              risco {a.scoreRisco}
            </div>
            {a.scoreConsultadoEm && (
              <div className="text-[9px] text-fg-dim mt-1">
                consultado{" "}
                {new Date(a.scoreConsultadoEm).toLocaleDateString("pt-BR")}
              </div>
            )}
          </>
        ) : (
          <div className="text-xs">Ainda não consultado</div>
        )}
        <button
          type="button"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await consultarScoreAtendimento(a.id);
              if (!r.ok) setError(r.error ?? "Erro");
              else router.refresh();
            });
          }}
          disabled={pending || !a.compradorDocumento}
          className="mt-2 w-full h-8 rounded text-xs font-semibold bg-fg text-bg hover:bg-fg/90 disabled:opacity-50"
        >
          {pending
            ? "consultando…"
            : a.scoreComprador
              ? "↻ atualizar score"
              : "🔍 consultar score"}
        </button>
        {error && (
          <p className="text-[10px] text-danger mt-1">{error}</p>
        )}
      </div>
    </section>
  );
}

function AcoesCard({ a }: { a: Atendimento }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [parcelas, setParcelas] = useState(3);

  const podeEncaminhar =
    a.status === "fechado" && !a.operacaoId && a.comissaoEstimada;

  return (
    <section className="rounded-2xl border border-accent/30 bg-accent-soft p-4 md:p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-3">
        encaminhar p/ antecipação
      </div>
      {a.operacaoId ? (
        <Link
          href={`/painel/operacoes/${a.operacaoId}`}
          className="block rounded-lg border border-success/40 bg-green-50 p-3 text-center"
        >
          <div className="text-[10px] uppercase font-mono tracking-wider text-success mb-1">
            ✓ já encaminhado
          </div>
          <div className="text-sm font-bold text-success">
            Ver operação criada →
          </div>
        </Link>
      ) : (
        <>
          <p className="text-xs text-fg-muted mb-3">
            Atendimentos fechados podem virar operação de antecipação. Sistema
            cria como rascunho — admin completa dados da construtora depois.
          </p>
          {!a.comissaoEstimada && (
            <p className="text-xs text-warn mb-2">
              ⚠ Defina a comissão estimada acima antes de encaminhar.
            </p>
          )}
          <label className="text-[10px] uppercase font-mono tracking-wider text-fg-dim block mb-1">
            nº de parcelas (1 a 4)
          </label>
          <input
            type="number"
            min={1}
            max={4}
            value={parcelas}
            onChange={(e) => setParcelas(parseInt(e.target.value) || 1)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm mb-3"
          />
          <button
            type="button"
            disabled={!podeEncaminhar || pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await encaminharParaAntecipacao({
                  atendimentoId: a.id,
                  numeroParcelas: parcelas,
                });
                if (!r.ok) setError(r.error ?? "Erro");
                else {
                  router.refresh();
                  if (r.operacaoId) {
                    router.push(`/painel/operacoes/${r.operacaoId}`);
                  }
                }
              });
            }}
            className="w-full h-10 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent-dark disabled:opacity-50"
          >
            {pending ? "encaminhando…" : "⚡ Encaminhar p/ antecipação"}
          </button>
          {error && (
            <p className="text-xs text-danger mt-2">{error}</p>
          )}
        </>
      )}
    </section>
  );
}

function Timeline({
  atendimentoId,
  eventos,
  statusAtual,
}: {
  atendimentoId: string;
  eventos: AtendimentoEvento[];
  statusAtual: AtendimentoStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<EventoTipo>("anotacao");
  const [descricao, setDescricao] = useState("");
  const [dataAgendada, setDataAgendada] = useState("");
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isVisita = tipo === "visita_agendada";
  const isProposta = tipo === "proposta_enviada" || tipo === "contraproposta";

  const submit = () => {
    setError(null);
    if (!descricao.trim() && !valor && !dataAgendada) {
      setError("Preencha pelo menos a descrição");
      return;
    }
    startTransition(async () => {
      const r = await addEvento({
        atendimentoId,
        tipo,
        descricao,
        dataAgendada: dataAgendada || undefined,
        valor: parseBRLNumber(valor) || undefined,
      });
      if (!r.ok) setError(r.error ?? "Erro");
      else {
        setDescricao("");
        setValor("");
        setDataAgendada("");
        router.refresh();
      }
    });
  };

  void statusAtual;

  const tiposPriorizados: EventoTipo[] = [
    "anotacao",
    "ligacao",
    "whatsapp",
    "email",
    "visita_agendada",
    "visita_realizada",
    "proposta_enviada",
    "contraproposta",
    "documentacao",
  ];

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
        timeline · {eventos.length} evento(s)
      </div>

      {/* Form de adicionar */}
      <div className="rounded-xl border border-border bg-bg p-3 mb-5 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {tiposPriorizados.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`text-[11px] px-2 py-1 rounded ${
                tipo === t
                  ? "bg-accent text-white"
                  : "bg-bg-card border border-border text-fg-muted hover:border-accent hover:text-accent"
              }`}
            >
              {EVENTO_EMOJI[t]} {EVENTO_LABEL[t]}
            </button>
          ))}
        </div>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={2}
          placeholder={`Descreva ${EVENTO_LABEL[tipo].toLowerCase()}...`}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-elev text-sm resize-y"
        />
        {isVisita && (
          <input
            type="datetime-local"
            value={dataAgendada}
            onChange={(e) => setDataAgendada(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-bg-elev text-sm"
          />
        )}
        {isProposta && (
          <input
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Valor R$"
            className="w-full h-9 px-3 rounded-lg border border-border bg-bg-elev text-sm tabular text-right"
          />
        )}
        {error && (
          <p className="text-[11px] text-danger font-semibold">{error}</p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn-primary !h-9 !px-4 text-xs disabled:opacity-50"
        >
          {pending ? "registrando…" : "+ Registrar"}
        </button>
      </div>

      {/* Lista de eventos */}
      {eventos.length === 0 ? (
        <p className="text-sm text-fg-muted text-center py-8">
          Sem registros ainda. Use o form acima pra começar a timeline.
        </p>
      ) : (
        <ul className="space-y-3">
          {eventos.map((e) => (
            <EventoItem key={e.id} e={e} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EventoItem({ e }: { e: AtendimentoEvento }) {
  const tipo = e.tipo as EventoTipo;
  const isStatus = tipo === "status_change";
  return (
    <li className="flex gap-3">
      <div className="shrink-0 size-8 rounded-full bg-bg-card border border-border flex items-center justify-center text-base">
        {EVENTO_EMOJI[tipo] ?? "•"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-fg">
            {EVENTO_LABEL[tipo] ?? tipo}
          </span>
          {isStatus && e.statusFrom && e.statusTo && (
            <span className="text-xs text-fg-muted">
              <span className="line-through">
                {STATUS_LABEL[e.statusFrom as AtendimentoStatus] ?? e.statusFrom}
              </span>{" "}
              →{" "}
              <strong>
                {STATUS_LABEL[e.statusTo as AtendimentoStatus] ?? e.statusTo}
              </strong>
            </span>
          )}
          {e.valor && (
            <span className="font-mono tabular text-xs font-bold text-accent">
              {formatBRLcompact(parseFloat(e.valor))}
            </span>
          )}
          {e.dataAgendada && (
            <span className="text-[10px] font-mono text-warn">
              agendada:{" "}
              {new Date(e.dataAgendada).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        {e.descricao && (
          <p className="text-xs text-fg-muted mt-0.5 whitespace-pre-line">
            {e.descricao}
          </p>
        )}
        <div className="text-[10px] text-fg-dim font-mono mt-0.5">
          {new Date(e.createdAt).toLocaleString("pt-BR")}
        </div>
      </div>
    </li>
  );
}
