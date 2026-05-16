"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createConviteLink,
  deleteConviteLink,
  toggleConviteLink,
} from "@/lib/actions/comercial-convite";
import type { ComercialConviteLink } from "@/db/schema";

export function ConviteLinksManager({
  initialLinks,
  siteUrl,
}: {
  initialLinks: ComercialConviteLink[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totalCliques = initialLinks.reduce((s, l) => s + l.cliques, 0);
  const totalConv = initialLinks.reduce((s, l) => s + l.conversoes, 0);
  const taxa = totalCliques > 0 ? (totalConv / totalCliques) * 100 : 0;

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      try {
        await createConviteLink({ label });
        setLabel("");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Kpi label="Links ativos" value={String(initialLinks.filter((l) => l.isActive).length)} />
        <Kpi label="Cliques total" value={String(totalCliques)} />
        <Kpi
          label="Cadastros via link"
          value={String(totalConv)}
          sub={`taxa: ${taxa.toFixed(0)}%`}
          highlight={totalConv > 0}
        />
      </div>

      {/* Gerar novo */}
      <section className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6 mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-2">
          gerar novo link
        </div>
        <p className="text-sm text-fg-muted mb-3">
          Dê um nome pro link (pra você saber pra que serve depois) e clique
          gerar. Você pode ter quantos links quiser.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='ex: "Evento RioImobi", "Indicação João", "Geral WhatsApp"'
            className="flex-1 h-11 px-3 rounded-lg border border-border bg-bg text-sm"
            maxLength={80}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={pending}
            className="btn-primary !h-11 !px-5 disabled:opacity-50"
          >
            {pending ? "gerando…" : "+ Gerar link"}
          </button>
        </div>
        {error && (
          <p className="text-xs text-danger font-semibold mt-2">{error}</p>
        )}
      </section>

      {/* Lista */}
      {initialLinks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">🔗</div>
          <h2 className="text-xl font-bold tracking-tight">
            Sem links ainda
          </h2>
          <p className="mt-2 text-fg-muted">
            Gere seu primeiro link acima e compartilhe no WhatsApp pra começar
            a rastrear quem se cadastra por você.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {initialLinks.map((l) => (
            <LinkRow key={l.id} link={l} siteUrl={siteUrl} />
          ))}
        </ul>
      )}
    </>
  );
}

function LinkRow({
  link,
  siteUrl,
}: {
  link: ComercialConviteLink;
  siteUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const url = `${siteUrl}/c/${link.token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // sem clipboard — ignora
    }
  };

  const toggle = () =>
    startTransition(async () => {
      await toggleConviteLink(link.id);
      router.refresh();
    });

  const remove = () => {
    if (
      !confirm(
        link.conversoes > 0
          ? `Esse link já converteu ${link.conversoes} cadastro(s). Tem certeza?`
          : "Remover este link?",
      )
    )
      return;
    startTransition(async () => {
      await deleteConviteLink(link.id);
      router.refresh();
    });
  };

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(
    `Oi! Te convido pra conhecer a Antecipaqui — antecipação de comissão imobiliária. Se cadastra por esse link: ${url}`,
  )}`;

  return (
    <li
      className={`rounded-2xl border p-4 md:p-5 ${
        link.isActive
          ? "border-border bg-bg-elev"
          : "border-border bg-bg-card opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-fg">
              {link.label || "(sem nome)"}
            </span>
            {!link.isActive && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-bg-card border border-border text-fg-muted">
                inativo
              </span>
            )}
          </div>
          <div className="text-[10px] text-fg-dim font-mono mt-0.5">
            criado em{" "}
            {new Date(link.createdAt).toLocaleDateString("pt-BR")}
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <div className="text-right">
            <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim">
              cliques
            </div>
            <div className="font-mono tabular text-lg font-bold text-fg">
              {link.cliques}
            </div>
          </div>
          <div className="text-right">
            <div
              className={`font-mono text-[9px] uppercase tracking-wider ${
                link.conversoes > 0 ? "text-success" : "text-fg-dim"
              }`}
            >
              cadastros
            </div>
            <div
              className={`font-mono tabular text-lg font-bold ${
                link.conversoes > 0 ? "text-success" : "text-fg"
              }`}
            >
              {link.conversoes}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg border border-border mb-3">
        <code className="flex-1 font-mono text-xs text-fg-muted truncate">
          {url}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded bg-fg text-bg hover:bg-fg/90"
        >
          {copied ? "✓ copiado" : "copiar"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={whatsappShare}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-success text-white text-xs font-semibold hover:bg-success/90"
        >
          💬 Compartilhar no WhatsApp
        </a>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-bg text-fg-muted text-xs font-semibold hover:border-fg-muted hover:text-fg disabled:opacity-50"
        >
          {link.isActive ? "desativar" : "ativar"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-danger/30 text-danger text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
        >
          remover
        </button>
      </div>
    </li>
  );
}

function Kpi({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-success/40 bg-green-50" : "border-border bg-bg-elev"
      }`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] mb-2 ${
          highlight ? "text-success" : "text-fg-dim"
        }`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-2xl font-bold text-fg">
        {value}
      </div>
      {sub && <div className="text-[10px] text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
