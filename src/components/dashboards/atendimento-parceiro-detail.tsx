"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  darOpiniaoConstrutora,
  removerVinculoConstrutora,
} from "@/lib/actions/atendimento-construtoras";
import {
  TIPO_OPINIAO_LABEL,
  type TipoOpiniao,
} from "@/lib/atendimento-construtoras-types";
import {
  type AtendimentoStatus,
  EVENTO_EMOJI,
  EVENTO_LABEL,
  type EventoTipo,
  STATUS_LABEL,
} from "@/lib/atendimento-types";
import { formatBRL, formatBRLcompact } from "@/lib/format";
import type { Atendimento, AtendimentoEvento } from "@/db/schema";

type Imob = {
  id: string;
  razaoSocial: string;
  telefone: string | null;
} | null;

type Corretor = {
  id: string;
  nome: string | null;
  email: string;
  telefone: string | null;
} | null;

type Vinculo = {
  id: string;
  aguardandoOpiniao: boolean;
  tipoOpiniaoSolicitada: string | null;
  opiniaoSolicitadaEm: Date | null;
  opiniaoSolicitadaTexto: string | null;
  opiniaoRecebidaEm: Date | null;
  opiniaoTexto: string | null;
  opiniaoRecomenda: boolean | null;
};

export function AtendimentoParceiroDetail({
  atendimento,
  vinculo,
  imob,
  corretor,
  eventos,
}: {
  atendimento: Atendimento;
  vinculo: Vinculo;
  imob: Imob;
  corretor: Corretor;
  eventos: AtendimentoEvento[];
}) {
  const a = atendimento;
  const corretorTel = corretor?.telefone?.replace(/\D/g, "");
  const waUrl = corretorTel
    ? `https://wa.me/${corretorTel.startsWith("55") ? corretorTel : "55" + corretorTel}`
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
              atendimento parceiro · {STATUS_LABEL[a.status as AtendimentoStatus]}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {a.compradorNome}
            </h1>
            {a.imovelDescricao && (
              <p className="text-sm text-fg-muted mt-1">
                🏠 {a.imovelDescricao}
              </p>
            )}
          </div>
          {a.imovelValor && (
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                valor do imóvel
              </div>
              <div className="font-mono tabular text-2xl font-bold text-accent">
                {formatBRLcompact(parseFloat(a.imovelValor))}
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-fg-muted">
          conduzido por <strong>{imob?.razaoSocial}</strong>
          {corretor && (
            <>
              {" · "}
              corretor <strong>{corretor.nome ?? corretor.email}</strong>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener"
                  className="ml-2 text-success font-semibold hover:underline"
                >
                  💬 chamar
                </a>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pedido de opinião destacado */}
      {vinculo.aguardandoOpiniao && (
        <OpiniaoForm vinculo={vinculo} />
      )}

      {/* Resposta já dada */}
      {vinculo.opiniaoTexto && !vinculo.aguardandoOpiniao && (
        <OpiniaoDada vinculo={vinculo} />
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DadosImovel a={a} />
          <TimelineReadOnly eventos={eventos} />
        </div>
        <aside className="space-y-4">
          <CompradorCard a={a} />
          <ContatosCard imob={imob} corretor={corretor} />
          <SairBox vinculoId={vinculo.id} />
        </aside>
      </div>
    </div>
  );
}

function OpiniaoForm({ vinculo }: { vinculo: Vinculo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [texto, setTexto] = useState("");
  const [recomenda, setRecomenda] = useState<"sim" | "nao" | "cond">("sim");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (!texto.trim()) {
      setError("Escreva sua resposta");
      return;
    }
    startTransition(async () => {
      const r = await darOpiniaoConstrutora({
        vinculoId: vinculo.id,
        texto,
        recomenda:
          recomenda === "sim" ? true : recomenda === "nao" ? false : null,
      });
      if (!r.ok) setError(r.error ?? "Erro");
      else {
        router.refresh();
      }
    });
  };

  return (
    <section className="rounded-2xl border-2 border-warn bg-yellow-50 p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-warn mb-2">
        ⏸ aguardando sua opinião
      </div>
      <div className="mb-3">
        <h2 className="font-bold text-lg text-fg">
          {vinculo.tipoOpiniaoSolicitada &&
            TIPO_OPINIAO_LABEL[vinculo.tipoOpiniaoSolicitada as TipoOpiniao]}
        </h2>
        <p className="text-sm text-fg-muted mt-1 whitespace-pre-line">
          {vinculo.opiniaoSolicitadaTexto}
        </p>
        {vinculo.opiniaoSolicitadaEm && (
          <p className="text-[10px] text-fg-dim font-mono mt-1">
            solicitado em{" "}
            {new Date(vinculo.opiniaoSolicitadaEm).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-2">
            sua recomendação
          </label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["sim", "✓ Recomendo prosseguir", "border-success bg-green-100 text-success"],
                ["nao", "✕ Não recomendo", "border-danger bg-red-100 text-danger"],
                ["cond", "↪ Condicional / explicar", "border-warn bg-yellow-100 text-warn"],
              ] as const
            ).map(([k, label, cls]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRecomenda(k as "sim" | "nao" | "cond")}
                className={`text-xs px-3 h-9 rounded-lg border-2 font-semibold ${
                  recomenda === k ? cls : "border-border bg-bg text-fg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
            sua resposta *
          </label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Sua opinião / orientação pra imobiliária"
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm resize-y"
          />
        </div>
        {error && (
          <p className="text-xs text-danger font-semibold">{error}</p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="w-full h-11 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent-dark disabled:opacity-50"
        >
          {pending ? "enviando…" : "📤 Enviar opinião"}
        </button>
      </div>
    </section>
  );
}

function OpiniaoDada({ vinculo }: { vinculo: Vinculo }) {
  const recomendaLabel =
    vinculo.opiniaoRecomenda === true
      ? "✓ Você recomendou prosseguir"
      : vinculo.opiniaoRecomenda === false
        ? "✕ Você não recomendou"
        : "↪ Condicional";
  const tone =
    vinculo.opiniaoRecomenda === true
      ? "border-success/40 bg-green-50 text-success"
      : vinculo.opiniaoRecomenda === false
        ? "border-danger/40 bg-red-50 text-danger"
        : "border-warn/40 bg-yellow-50 text-warn";
  return (
    <section className={`rounded-2xl border p-5 md:p-6 ${tone}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2">
        ✓ sua opinião enviada
      </div>
      <h2 className="font-bold text-base mb-1">{recomendaLabel}</h2>
      {vinculo.opiniaoTexto && (
        <p className="text-sm text-fg whitespace-pre-line">
          {vinculo.opiniaoTexto}
        </p>
      )}
      {vinculo.opiniaoRecebidaEm && (
        <p className="text-[10px] font-mono text-fg-dim mt-1">
          enviado em{" "}
          {new Date(vinculo.opiniaoRecebidaEm).toLocaleString("pt-BR")}
        </p>
      )}
    </section>
  );
}

function DadosImovel({ a }: { a: Atendimento }) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-3">
        imóvel
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <Field label="Descrição" value={a.imovelDescricao} />
        <Field label="Endereço" value={a.imovelEndereco} />
        {a.imovelCidade && (
          <Field
            label="Cidade/UF"
            value={`${a.imovelCidade}${a.imovelUf ? "/" + a.imovelUf : ""}`}
          />
        )}
        <Field
          label="Valor"
          value={a.imovelValor ? formatBRL(parseFloat(a.imovelValor)) : null}
          highlight
        />
      </div>
    </section>
  );
}

function CompradorCard({ a }: { a: Atendimento }) {
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
          <div className="text-xs text-fg-muted">📱 {a.compradorTelefone}</div>
        )}
        {a.compradorDocumento && (
          <div className="text-xs text-fg-muted font-mono">
            🆔 {a.compradorDocumento}
          </div>
        )}
        {a.scoreComprador && (
          <div className="mt-2 text-[11px]">
            Score:{" "}
            <span className="font-mono font-bold">{a.scoreComprador}</span>{" "}
            ({a.scoreRisco})
          </div>
        )}
      </div>
    </section>
  );
}

function ContatosCard({
  imob,
  corretor,
}: {
  imob: Imob;
  corretor: Corretor;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-4 md:p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-3">
        parceria
      </div>
      <div className="space-y-2 text-sm">
        {imob && (
          <div>
            <div className="text-[10px] uppercase font-mono text-fg-dim mb-0.5">
              imobiliária
            </div>
            <div className="font-bold text-fg">{imob.razaoSocial}</div>
            {imob.telefone && (
              <div className="text-xs text-fg-muted">📱 {imob.telefone}</div>
            )}
          </div>
        )}
        {corretor && (
          <div>
            <div className="text-[10px] uppercase font-mono text-fg-dim mb-0.5">
              corretor conduzindo
            </div>
            <div className="font-bold text-fg">
              {corretor.nome ?? corretor.email}
            </div>
            {corretor.telefone && (
              <div className="text-xs text-fg-muted">
                📱 {corretor.telefone}
              </div>
            )}
            <div className="text-[10px] text-fg-dim break-all">
              {corretor.email}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SairBox({ vinculoId }: { vinculoId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="text-[10px] text-fg-muted mb-2">
        não quer mais acompanhar?
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Deixar de acompanhar este atendimento?")) return;
          startTransition(async () => {
            await removerVinculoConstrutora({ vinculoId });
            router.push("/painel/atendimentos-parceiros");
          });
        }}
        className="w-full h-9 rounded-lg border border-danger/30 text-danger text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
      >
        Deixar de acompanhar
      </button>
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
      <div className="text-sm text-fg">{value ?? "—"}</div>
    </div>
  );
}

function TimelineReadOnly({ eventos }: { eventos: AtendimentoEvento[] }) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
        timeline · {eventos.length} evento(s)
      </div>
      {eventos.length === 0 ? (
        <p className="text-sm text-fg-muted text-center py-6">
          Sem eventos registrados.
        </p>
      ) : (
        <ul className="space-y-3">
          {eventos.map((e) => {
            const tipo = e.tipo as EventoTipo;
            return (
              <li key={e.id} className="flex gap-3">
                <div className="shrink-0 size-8 rounded-full bg-bg-card border border-border flex items-center justify-center text-base">
                  {EVENTO_EMOJI[tipo] ?? "•"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-fg">
                    {EVENTO_LABEL[tipo] ?? tipo}
                  </div>
                  {e.descricao && (
                    <p className="text-xs text-fg-muted mt-0.5 whitespace-pre-line">
                      {e.descricao}
                    </p>
                  )}
                  {e.valor && (
                    <p className="text-xs font-mono tabular font-bold text-accent">
                      {formatBRLcompact(parseFloat(e.valor))}
                    </p>
                  )}
                  <div className="text-[10px] text-fg-dim font-mono mt-0.5">
                    {new Date(e.createdAt).toLocaleString("pt-BR")}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
