"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLead,
  deleteLead,
  updateLead,
  updateLeadStatus,
} from "@/lib/actions/comercial-leads";
import {
  type LeadStatus,
  STATUS_LABEL,
  STATUS_ORDER,
} from "@/lib/comercial-leads-types";
import { formatBRLcompact, parseBRLNumber } from "@/lib/format";
import type { ComercialLead } from "@/db/schema";

const STATUS_COLOR: Record<LeadStatus, string> = {
  prospect: "border-fg-dim/40 bg-bg-card",
  contato: "border-accent/30 bg-accent-soft",
  reuniao: "border-warn/40 bg-yellow-50",
  proposta: "border-warn/40 bg-yellow-50",
  fechado: "border-success/40 bg-green-50",
  perdido: "border-danger/40 bg-red-50",
};

const STATUS_HEADER_CLS: Record<LeadStatus, string> = {
  prospect: "text-fg-muted",
  contato: "text-accent",
  reuniao: "text-warn",
  proposta: "text-warn",
  fechado: "text-success",
  perdido: "text-danger",
};

export function LeadsKanban({
  initialLeads,
}: {
  initialLeads: ComercialLead[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ComercialLead | null>(null);

  const byStatus = STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = initialLeads.filter((l) => l.status === s);
      return acc;
    },
    {} as Record<LeadStatus, ComercialLead[]>,
  );

  const valorAtivo = STATUS_ORDER.filter(
    (s) => s !== "fechado" && s !== "perdido",
  ).reduce(
    (s, st) =>
      s +
      byStatus[st].reduce(
        (acc, l) => acc + (l.valorEstimado ? parseFloat(l.valorEstimado) : 0),
        0,
      ),
    0,
  );
  const totalAtivos = STATUS_ORDER.filter(
    (s) => s !== "fechado" && s !== "perdido",
  ).reduce((s, st) => s + byStatus[st].length, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-3 items-baseline flex-wrap">
          <span className="text-sm text-fg-muted">
            <strong className="text-fg">{totalAtivos}</strong> lead(s) no
            pipeline · valor estimado{" "}
            <strong className="text-fg">{formatBRLcompact(valorAtivo)}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary !h-11 !px-5"
        >
          + Novo lead
        </button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATUS_ORDER.map((s) => {
          const items = byStatus[s];
          const total = items.reduce(
            (acc, l) =>
              acc + (l.valorEstimado ? parseFloat(l.valorEstimado) : 0),
            0,
          );
          return (
            <section
              key={s}
              className="rounded-2xl border border-border bg-bg-elev p-3 min-h-[120px]"
            >
              <div className="flex items-baseline justify-between gap-2 mb-3">
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
                <div className="text-[10px] font-mono text-fg-muted mb-2">
                  {formatBRLcompact(total)}
                </div>
              )}
              <ul className="space-y-2">
                {items.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    onEdit={() => {
                      setEditing(l);
                      setShowForm(true);
                    }}
                  />
                ))}
                {items.length === 0 && (
                  <li className="text-[11px] text-fg-dim text-center py-4">
                    vazio
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      {showForm && (
        <LeadModal
          lead={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onDone={() => router.refresh()}
        />
      )}
    </>
  );
}

function LeadCard({
  lead,
  onEdit,
}: {
  lead: ComercialLead;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);

  const move = (status: LeadStatus) => {
    const motivoPerda =
      status === "perdido"
        ? prompt("Motivo da perda (opcional):")?.trim() || undefined
        : undefined;
    startTransition(async () => {
      await updateLeadStatus({ id: lead.id, status, motivoPerda });
      router.refresh();
      setShowMenu(false);
    });
  };

  const remove = () => {
    if (!confirm(`Remover lead "${lead.nome}"?`)) return;
    startTransition(async () => {
      await deleteLead(lead.id);
      router.refresh();
    });
  };

  return (
    <li
      className={`rounded-lg border p-2.5 ${STATUS_COLOR[lead.status as LeadStatus]}`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-semibold text-fg hover:text-accent truncate text-left"
        >
          {lead.nome}
        </button>
        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          className="size-6 text-fg-dim hover:text-fg shrink-0 text-base leading-none"
          aria-label="ações"
        >
          ⋯
        </button>
      </div>
      {lead.empresa && (
        <div className="text-[11px] text-fg-muted truncate">{lead.empresa}</div>
      )}
      {lead.cidade && (
        <div className="text-[10px] text-fg-dim font-mono">
          {lead.cidade}
          {lead.uf ? `/${lead.uf}` : ""}
        </div>
      )}
      {lead.valorEstimado && (
        <div className="text-[10px] font-mono tabular text-fg mt-1 font-semibold">
          {formatBRLcompact(parseFloat(lead.valorEstimado))}
        </div>
      )}
      {showMenu && (
        <div className="mt-2 pt-2 border-t border-border space-y-1">
          <div className="text-[9px] uppercase font-mono text-fg-dim">
            mover para
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_ORDER.filter((s) => s !== lead.status).map((s) => (
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
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="w-full text-[10px] mt-1 py-1 rounded border border-danger/30 text-danger hover:bg-red-50 disabled:opacity-50"
          >
            remover
          </button>
        </div>
      )}
    </li>
  );
}

function LeadModal({
  lead,
  onClose,
  onDone,
}: {
  lead: ComercialLead | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState(lead?.nome ?? "");
  const [empresa, setEmpresa] = useState(lead?.empresa ?? "");
  const [cnpjCpf, setCnpjCpf] = useState(lead?.cnpjCpf ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [telefone, setTelefone] = useState(lead?.telefone ?? "");
  const [cidade, setCidade] = useState(lead?.cidade ?? "");
  const [uf, setUf] = useState(lead?.uf ?? "");
  const [origem, setOrigem] = useState(lead?.origem ?? "");
  const [valorEstimado, setValorEstimado] = useState(
    lead?.valorEstimado ?? "",
  );
  const [notas, setNotas] = useState(lead?.notas ?? "");

  const submit = () => {
    setError(null);
    if (!nome.trim()) {
      setError("Nome obrigatório");
      return;
    }
    const valor = parseBRLNumber(valorEstimado);
    startTransition(async () => {
      try {
        if (lead) {
          await updateLead({
            id: lead.id,
            nome,
            empresa,
            cnpjCpf,
            email,
            telefone,
            cidade,
            uf,
            origem,
            valorEstimado: valor > 0 ? valor : null,
            notas,
          });
        } else {
          await createLead({
            nome,
            empresa,
            cnpjCpf,
            email,
            telefone,
            cidade,
            uf,
            origem,
            valorEstimado: valor > 0 ? valor : undefined,
            notas,
          });
        }
        onDone();
        onClose();
      } catch (e) {
        setError((e as Error).message);
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
      <div className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-bg-elev shadow-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-2 mb-4">
          <h3 className="font-bold text-lg text-fg">
            {lead ? "Editar lead" : "Novo lead"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full border border-border flex items-center justify-center text-fg-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nome do contato *">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm"
              />
            </Field>
            <Field label="Empresa">
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="CNPJ / CPF">
              <input
                type="text"
                value={cnpjCpf}
                onChange={(e) => setCnpjCpf(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm"
              />
            </Field>
            <Field label="Telefone (com DDD)">
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm"
              />
            </Field>
          </div>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm"
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Field label="Cidade">
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm"
                />
              </Field>
            </div>
            <Field label="UF">
              <input
                type="text"
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Origem">
              <input
                type="text"
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                placeholder="indicação, evento, linkedin…"
                className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm"
              />
            </Field>
            <Field label="Valor estimado (R$)">
              <input
                type="text"
                value={valorEstimado}
                onChange={(e) => setValorEstimado(e.target.value)}
                placeholder="0,00"
                className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-sm tabular text-right"
              />
            </Field>
          </div>
          <Field label="Notas">
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm resize-y"
            />
          </Field>

          {error && (
            <p className="text-xs text-danger font-semibold">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border text-fg-muted text-sm font-medium hover:text-fg"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
            >
              {pending ? "salvando…" : lead ? "salvar" : "criar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
