"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatBRL } from "@/lib/format";
import {
  buildWhatsappLink,
  normalizePhoneBR,
} from "@/lib/whatsapp";

type RankingRow = {
  id: string;
  nome: string;
  documento: string;
  email: string | null;
  telefone: string | null;
  isActive: boolean;
  qtdOperacoes: number;
  valorOperado: number;
  valorPago: number;
  valorAberto: number;
  ownerUserId?: string | null;
};

type Props = {
  rows: RankingRow[];
  tipo: "construtora" | "imobiliaria" | "fundo";
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";

function whatsappMessageFor(row: RankingRow, tipo: Props["tipo"]) {
  const nome = row.nome.split(" ")[0];
  if (tipo === "construtora") {
    return `Olá ${nome}, aqui é da Antecipaqui!\n\nEstamos passando pra acompanhar suas operações em curso. Se precisar de qualquer coisa, é só responder.\n\n${SITE_URL}/painel`;
  }
  if (tipo === "fundo") {
    return `Olá ${nome}, aqui é da Antecipaqui!\n\nEstamos passando pra acompanhar as operações antecipadas pelo seu fundo. Qualquer ajuste, é só responder.\n\n${SITE_URL}/painel`;
  }
  return `Olá ${nome}, aqui é da Antecipaqui!\n\nEstamos passando pra acompanhar suas operações de antecipação. Qualquer dúvida ou nova operação, é só falar com a gente.\n\n${SITE_URL}/painel`;
}

type SortKey =
  | "nome"
  | "valorOperado"
  | "valorPago"
  | "valorAberto"
  | "qtdOperacoes"
  | "isActive";

export function RankingTable({ rows, tipo }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("valorOperado");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Strings: default asc; números/bool: default desc
      setSortDir(
        key === "nome" || key === "isActive" ? "asc" : "desc",
      );
    }
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else if (typeof av === "boolean" && typeof bv === "boolean")
        cmp = av === bv ? 0 : av ? 1 : -1;
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
        <p className="text-fg-muted">
          Nenhum resultado pros filtros atuais.
        </p>
      </div>
    );
  }

  function Th({
    field,
    align = "left",
    children,
  }: {
    field: SortKey | null;
    align?: "left" | "right" | "center";
    children: React.ReactNode;
  }) {
    const alignCls =
      align === "right"
        ? "text-right"
        : align === "center"
          ? "text-center"
          : "text-left";
    if (field === null) {
      return (
        <th
          className={`px-3 md:px-4 py-3 ${alignCls} whitespace-nowrap`}
        >
          {children}
        </th>
      );
    }
    const active = sortKey === field;
    return (
      <th
        onClick={() => handleSort(field)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSort(field);
          }
        }}
        className={`px-3 md:px-4 py-3 ${alignCls} whitespace-nowrap cursor-pointer select-none hover:text-fg transition-colors`}
      >
        <span
          className={`inline-flex items-center gap-1 ${
            align === "right" ? "flex-row-reverse" : ""
          } ${active ? "text-fg" : ""}`}
        >
          {children}
          <span
            className={`text-[8px] leading-none transition-opacity ${
              active ? "opacity-100" : "opacity-30"
            }`}
            aria-hidden
          >
            {active ? (sortDir === "desc" ? "▼" : "▲") : "▼"}
          </span>
        </span>
      </th>
    );
  }

  const totals = sorted.reduce(
    (acc, r) => ({
      valorOperado: acc.valorOperado + r.valorOperado,
      valorPago: acc.valorPago + r.valorPago,
      valorAberto: acc.valorAberto + r.valorAberto,
      qtdOperacoes: acc.qtdOperacoes + r.qtdOperacoes,
    }),
    { valorOperado: 0, valorPago: 0, valorAberto: 0, qtdOperacoes: 0 },
  );

  return (
    <>
    <div className="hidden lg:block rounded-2xl border border-border bg-bg-elev overflow-x-auto">
      <table className="w-full text-sm min-w-[760px]">
        <thead className="bg-bg-card border-b border-border">
          <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
            <Th field={null}>#</Th>
            <Th field="nome">
              {tipo === "construtora"
                ? "Construtora"
                : tipo === "fundo"
                  ? "Fundo"
                  : "Imobiliária / Corretor"}
            </Th>
            <Th field="valorOperado" align="right">
              Valor operado
            </Th>
            <Th field="valorPago" align="right">
              Pago
            </Th>
            <Th field="valorAberto" align="right">
              Em aberto
            </Th>
            <Th field="qtdOperacoes" align="right">
              Ops
            </Th>
            <Th field="isActive" align="center">
              Status
            </Th>
            <Th field={null} align="right">
              Ações
            </Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const phone = normalizePhoneBR(r.telefone);
            const waLink = phone
              ? buildWhatsappLink(r.telefone, whatsappMessageFor(r, tipo))
              : null;
            const cadastroHref =
              tipo === "construtora"
                ? `/admin/construtoras/${r.id}`
                : tipo === "fundo"
                  ? `/admin/fundos/${r.id}`
                  : `/admin/usuarios/${r.id}`;
            return (
              <tr
                key={r.id}
                className="border-b border-border last:border-0 hover:bg-bg-card transition-colors"
              >
                <td className="px-3 md:px-4 py-3 font-mono text-xs text-fg-dim">
                  {i + 1}
                </td>
                <td className="px-3 md:px-4 py-3">
                  <div className="font-semibold text-fg">{r.nome}</div>
                  <div className="text-[11px] text-fg-muted font-mono">
                    {r.documento || r.email || "—"}
                  </div>
                </td>
                <td className="px-3 md:px-4 py-3 text-right font-mono tabular text-fg font-semibold">
                  {formatBRL(r.valorOperado)}
                </td>
                <td className="px-3 md:px-4 py-3 text-right font-mono tabular text-success">
                  {formatBRL(r.valorPago)}
                </td>
                <td className="px-3 md:px-4 py-3 text-right font-mono tabular text-warn">
                  {formatBRL(r.valorAberto)}
                </td>
                <td className="px-3 md:px-4 py-3 text-right font-mono tabular text-fg-muted">
                  {r.qtdOperacoes}
                </td>
                <td className="px-3 md:px-4 py-3 text-center">
                  {r.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-green-50 text-success border-green-200">
                      ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-red-50 text-danger border-danger/40">
                      bloqueado
                    </span>
                  )}
                </td>
                <td className="px-3 md:px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener"
                        title={`WhatsApp · ${r.telefone}`}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-border text-fg-muted hover:border-success hover:text-success transition-colors"
                      >
                        <WhatsappIcon />
                      </a>
                    ) : (
                      <span
                        title="Sem telefone cadastrado"
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-border text-fg-dim cursor-not-allowed opacity-50"
                      >
                        <WhatsappIcon />
                      </span>
                    )}
                    <Link
                      href={cadastroHref}
                      title="Ver cadastro"
                      className="inline-flex items-center justify-center size-8 rounded-lg border border-border text-fg-muted hover:border-accent hover:text-accent transition-colors"
                    >
                      <EyeIcon />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border-strong bg-bg-card font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            <td className="px-3 md:px-4 py-3" />
            <td className="px-3 md:px-4 py-3 text-fg-muted">Totais</td>
            <td className="px-3 md:px-4 py-3 text-right tabular text-fg font-bold">
              {formatBRL(totals.valorOperado)}
            </td>
            <td className="px-3 md:px-4 py-3 text-right tabular text-success font-bold">
              {formatBRL(totals.valorPago)}
            </td>
            <td className="px-3 md:px-4 py-3 text-right tabular text-warn font-bold">
              {formatBRL(totals.valorAberto)}
            </td>
            <td className="px-3 md:px-4 py-3 text-right tabular text-fg-muted font-bold">
              {totals.qtdOperacoes}
            </td>
            <td className="px-3 md:px-4 py-3" />
            <td className="px-3 md:px-4 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>

    {/* Mobile: cards */}
    <div className="lg:hidden space-y-3">
      {sorted.map((r, i) => {
        const phone = normalizePhoneBR(r.telefone);
        const waLink = phone
          ? buildWhatsappLink(r.telefone, whatsappMessageFor(r, tipo))
          : null;
        const cadastroHref =
          tipo === "construtora"
            ? `/admin/construtoras/${r.id}`
            : tipo === "fundo"
              ? `/admin/fundos/${r.id}`
              : `/admin/usuarios/${r.id}`;
        return (
          <div
            key={r.id}
            className="rounded-2xl border border-border bg-bg-elev p-4"
          >
            <Link href={cadastroHref} className="block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-fg-dim">
                      #{i + 1}
                    </span>
                    <span className="font-semibold text-fg truncate">
                      {r.nome}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-fg-muted">
                    {r.documento || r.email || "—"}
                  </div>
                </div>
                {r.isActive ? (
                  <span className="shrink-0 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">
                    ativo
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center rounded-full border border-danger/40 bg-red-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-danger">
                    bloqueado
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    Operado
                  </div>
                  <div className="tabular font-mono font-semibold text-fg">
                    {formatBRL(r.valorOperado)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    Pago
                  </div>
                  <div className="tabular font-mono text-success">
                    {formatBRL(r.valorPago)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    Em aberto
                  </div>
                  <div className="tabular font-mono text-warn">
                    {formatBRL(r.valorAberto)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    Ops
                  </div>
                  <div className="tabular font-mono text-fg-muted">
                    {r.qtdOperacoes}
                  </div>
                </div>
              </div>
            </Link>
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition-colors hover:border-success hover:text-success"
                >
                  <WhatsappIcon /> WhatsApp
                </a>
              ) : (
                <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 font-mono text-[11px] uppercase tracking-wider text-fg-dim opacity-50">
                  <WhatsappIcon /> Sem fone
                </span>
              )}
              <Link
                href={cadastroHref}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition-colors hover:border-accent hover:text-accent"
              >
                <EyeIcon /> Ver
              </Link>
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}

function WhatsappIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
