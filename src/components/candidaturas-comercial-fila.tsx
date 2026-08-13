"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback-provider";
import {
  aprovarCandidaturaComercialAction,
  recusarCandidaturaComercialAction,
} from "@/lib/actions/comercial-candidatura";
import { maskCNPJ, maskCPF, maskPhone } from "@/lib/cnpj";
import type { Comercial } from "@/db/schema";

const fmtData = (d: Date | string) =>
  new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function CandidaturasComercialFila({ rows }: { rows: Comercial[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="mb-8 rounded-2xl border border-warn/50 bg-warn/5 p-5 md:p-6">
      <div className="flex items-center gap-3 mb-1">
        <span className="inline-flex items-center justify-center h-7 min-w-7 px-2 rounded-lg bg-warn text-white text-xs font-bold font-mono">
          {rows.length}
        </span>
        <h2 className="font-bold text-lg">
          {rows.length === 1
            ? "candidatura aguardando sua decisão"
            : "candidaturas aguardando sua decisão"}
        </h2>
      </div>
      <p className="text-xs text-fg-muted mb-5 leading-relaxed">
        Vieram do formulário público{" "}
        <span className="font-mono">/quero-ser-comercial</span>. Aprovar cria o
        acesso com perfil <b>comercial</b> e dispara o convite por e-mail.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((c) => (
          <CandidaturaCard key={c.id} c={c} />
        ))}
      </div>
    </section>
  );
}

function CandidaturaCard({ c }: { c: Comercial }) {
  const router = useRouter();
  const { alertSuccess, alertError, confirm } = useFeedback();
  const [pending, startTransition] = useTransition();
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");

  function aprovar() {
    startTransition(async () => {
      const ok = await confirm({
        title: "Aprovar candidatura",
        message: `Aprovar ${c.nomeCompleto}? O acesso vira comercial e o convite é enviado pra ${c.email}.`,
        confirmLabel: "Aprovar",
        variant: "success",
      });
      if (!ok) return;
      const fd = new FormData();
      fd.set("comercialId", c.id);
      const res = await aprovarCandidaturaComercialAction(null, fd);
      if (res?.ok) {
        await alertSuccess(res.message, "Aprovado");
        router.refresh();
      } else {
        await alertError(res?.error ?? "Erro ao aprovar", "Erro");
      }
    });
  }

  function recusar() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("comercialId", c.id);
      if (motivo.trim()) fd.set("motivo", motivo.trim());
      const res = await recusarCandidaturaComercialAction(null, fd);
      if (res?.ok) {
        await alertSuccess(res.message, "Recusada");
        router.refresh();
      } else {
        await alertError(res?.error ?? "Erro ao recusar", "Erro");
      }
    });
  }

  const doc =
    c.tipoPessoa === "fisica" ? maskCPF(c.documento) : maskCNPJ(c.documento);

  return (
    <article className="rounded-xl border border-border bg-bg-elev p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold leading-tight">{c.nomeCompleto}</h3>
          {c.apelido && (
            <p className="text-xs text-fg-muted mt-0.5">“{c.apelido}”</p>
          )}
        </div>
        <span className="chip text-[10px]">
          {c.tipoPessoa === "fisica" ? "Pessoa Física" : "Pessoa Jurídica"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Info label={c.tipoPessoa === "fisica" ? "CPF" : "CNPJ"} value={doc} mono />
        <Info
          label="Onde atua"
          value={[c.cidade, c.uf].filter(Boolean).join("/") || "—"}
        />
        <Info label="E-mail" value={c.email} mono />
        <Info
          label="Telefone"
          value={c.telefone ? maskPhone(c.telefone) : "—"}
        />
        <Info label="Recebida em" value={fmtData(c.createdAt)} />
        <Info label="Endereço" value={c.endereco ?? "—"} />
      </dl>

      {c.experiencia && (
        <div className="mt-4 rounded-lg border border-border bg-bg p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-fg-dim font-mono mb-1.5">
            Experiência
          </div>
          <p className="text-xs text-fg-muted leading-relaxed whitespace-pre-line">
            {c.experiencia}
          </p>
        </div>
      )}

      {recusando && (
        <div className="mt-4">
          <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim font-mono mb-2">
            Motivo da recusa (opcional, fica registrado no histórico)
          </label>
          <textarea
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="form-input resize-y text-xs"
            placeholder="Ex: sem atuação no mercado imobiliário na região."
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={aprovar}
          disabled={pending}
          className="h-10 px-4 rounded-lg bg-success text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? "Processando…" : "Aprovar e liberar acesso"}
        </button>
        {recusando ? (
          <>
            <button
              type="button"
              onClick={recusar}
              disabled={pending}
              className="h-10 px-4 rounded-lg bg-danger text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
            >
              Confirmar recusa
            </button>
            <button
              type="button"
              onClick={() => setRecusando(false)}
              disabled={pending}
              className="h-10 px-4 rounded-lg border border-border text-sm font-bold hover:border-accent transition"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setRecusando(true)}
            disabled={pending}
            className="h-10 px-4 rounded-lg border border-border text-sm font-bold hover:border-danger hover:text-danger transition"
          >
            Recusar
          </button>
        )}
      </div>
    </article>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-fg-dim font-mono">
        {label}
      </dt>
      <dd className={`mt-0.5 break-words ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
