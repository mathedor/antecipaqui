"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  notificarParcelaPorEmailAction,
  gerarBoletoParcelaAction,
  type DailyRow,
} from "@/lib/actions/daily";
import { useFeedback } from "@/components/feedback-provider";
import { ExportCsvButton } from "@/components/export-csv-button";
import { buildWhatsappLink, normalizePhoneBR } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/format";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";

type SortKey =
  | "construtora"
  | "imobiliaria"
  | "vencimento"
  | "valorParcela"
  | "dataOperacao"
  | "valorOperacao"
  | "jurosParcela"
  | "encargosTotal"
  | "valorAtual"
  | "diasAtraso";

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function buildWhatsappMessageConstrutora(r: DailyRow) {
  const dias = Math.max(r.diasAtraso, 0);
  const lines = [
    `Olá ${r.construtoraNome ?? ""}, aqui é da Antecipaqui.`,
    "",
    dias > 0
      ? `Estamos passando sobre a parcela #${String(r.parcelaNumero).padStart(2, "0")} da operação *${r.operacaoNumero}* (cedente: ${r.imobiliariaNome ?? r.corretorNome ?? "—"}), com vencimento em *${fmtDate(r.vencimento)}* e *${dias} dia(s) de atraso*.`
      : `Lembrete da parcela #${String(r.parcelaNumero).padStart(2, "0")} da operação *${r.operacaoNumero}* (cedente: ${r.imobiliariaNome ?? r.corretorNome ?? "—"}), com vencimento em *${fmtDate(r.vencimento)}*.`,
    "",
    `Valor original: *${formatBRL(r.valorParcela)}*.`,
    dias > 0
      ? `Valor atualizado (com encargos): *${formatBRL(r.valorAtual)}*.`
      : "",
    "",
    `Acesse: ${SITE_URL}/painel/duplicatas`,
  ].filter(Boolean);
  return lines.join("\n");
}

function buildWhatsappMessageImobiliaria(r: DailyRow) {
  const nome = (r.corretorNome ?? "").split(" ")[0] ?? "";
  const dias = Math.max(r.diasAtraso, 0);
  const lines = [
    `Olá ${nome}, aqui é da Antecipaqui.`,
    "",
    dias > 0
      ? `A parcela #${String(r.parcelaNumero).padStart(2, "0")} da operação *${r.operacaoNumero}* (construtora: ${r.construtoraNome ?? "—"}) venceu em *${fmtDate(r.vencimento)}* e está com *${dias} dia(s) de atraso*. Estamos em contato com a construtora pra regularizar.`
      : `Lembrete: parcela #${String(r.parcelaNumero).padStart(2, "0")} da operação *${r.operacaoNumero}* (construtora: ${r.construtoraNome ?? "—"}) vence em *${fmtDate(r.vencimento)}*.`,
    "",
    `Valor: *${formatBRL(r.valorParcela)}*.`,
    "",
    `Acesse: ${SITE_URL}/painel/operacoes`,
  ];
  return lines.join("\n");
}

export function DailyTable({ rows }: { rows: DailyRow[] }) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [pending, start] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey>("vencimento");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function handleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(
        k === "vencimento" || k === "construtora" || k === "imobiliaria"
          ? "asc"
          : "desc",
      );
    }
  }

  function handleWhatsConstrutora(r: DailyRow) {
    const phone = normalizePhoneBR(r.construtoraTelefone);
    if (!phone) {
      alertError(
        "Construtora sem telefone cadastrado.",
        "Não foi possível abrir o WhatsApp",
      );
      return;
    }
    const link = buildWhatsappLink(
      r.construtoraTelefone,
      buildWhatsappMessageConstrutora(r),
    );
    if (link) window.open(link, "_blank", "noopener");
  }

  function handleWhatsImobiliaria(r: DailyRow) {
    const phone = normalizePhoneBR(
      r.imobiliariaTelefone ?? r.corretorTelefone,
    );
    if (!phone) {
      alertError(
        "Imobiliária / corretor sem telefone cadastrado.",
        "Não foi possível abrir o WhatsApp",
      );
      return;
    }
    const link = buildWhatsappLink(
      r.imobiliariaTelefone ?? r.corretorTelefone,
      buildWhatsappMessageImobiliaria(r),
    );
    if (link) window.open(link, "_blank", "noopener");
  }

  async function handleEmail(r: DailyRow) {
    const ok = await confirm({
      title: "Notificar por email",
      message: `Enviar email pra construtora (${r.construtoraEmail ?? "sem email"}) e pro corretor (${r.corretorEmail ?? "sem email"}) sobre a parcela ${r.parcelaNumero} da operação ${r.operacaoNumero}?`,
      confirmLabel: "Enviar emails",
    });
    if (!ok) return;
    start(async () => {
      try {
        const res = await notificarParcelaPorEmailAction(r.parcelaId);
        const msg: string[] = [];
        if (res.enviados.construtora) msg.push("✓ Construtora notificada");
        else msg.push("✕ Construtora sem email cadastrado");
        if (res.enviados.imobiliaria)
          msg.push("✓ Imobiliária / corretor notificada");
        else msg.push("✕ Sem email da imobiliária / corretor");
        await alertSuccess(msg.join("\n"), "Emails processados");
      } catch (e) {
        await alertError(
          (e as Error).message,
          "Erro ao notificar por email",
        );
      }
    });
  }

  async function handleBoleto(r: DailyRow) {
    start(async () => {
      try {
        const res = await gerarBoletoParcelaAction(r.parcelaId);
        const ok2 = await confirm({
          title: "Abrir API de boletos",
          message: `Vamos abrir a URL da API do banco emissor configurado no fundo "${res.fundoNome}" (${res.bancoNome ?? "—"}).\n\nDados pra preencher:\n• Parcela: ${res.parcela.numero}\n• Operação: ${res.parcela.operacaoNumero}\n• Vencimento: ${fmtDate(res.parcela.vencimento)}\n• Valor: ${formatBRL(res.parcela.valor)}\n\nContinuar?`,
          confirmLabel: "Abrir API",
        });
        if (ok2) {
          window.open(res.apiUrl, "_blank", "noopener");
        }
      } catch (e) {
        await alertError(
          (e as Error).message,
          "Erro ao gerar boleto",
        );
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
        <p className="text-fg-muted">
          Nenhuma parcela com esses filtros.
        </p>
      </div>
    );
  }

  // Totais
  const totalParcela = sorted.reduce((s, r) => s + r.valorParcela, 0);
  const totalEncargos = sorted.reduce((s, r) => s + r.encargosTotal, 0);
  const totalAtual = sorted.reduce((s, r) => s + r.valorAtual, 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportCsvButton
          filename={`daily-${new Date().toISOString().slice(0, 10)}`}
          headers={[
            "Operação",
            "Construtora",
            "Imobiliária / Corretor",
            "Fundo",
            "Vencimento",
            "Dias atraso",
            "Valor parcela (R$)",
            "Data operação",
            "Valor operação (R$)",
            "Juros parcela (R$)",
            "Encargos (R$)",
            "Valor atual (R$)",
          ]}
          getRows={() =>
            sorted.map((r) => [
              r.operacaoNumero,
              r.construtoraNome ?? "",
              r.imobiliariaNome ?? r.corretorNome ?? "",
              r.fundoNome ?? "",
              r.vencimento,
              r.diasAtraso,
              r.valorParcela.toFixed(2),
              r.dataOperacao,
              r.valorOperacao.toFixed(2),
              r.jurosParcela.toFixed(2),
              r.encargosTotal.toFixed(2),
              r.valorAtual.toFixed(2),
            ])
          }
        />
      </div>

      <div className="rounded-2xl border border-border bg-bg-elev overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: "1400px" }}>
          <thead className="bg-bg-card border-b border-border">
            <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
              <Th onClick={() => handleSort("construtora")} active={sortKey === "construtora"} dir={sortDir}>
                Construtora
              </Th>
              <Th onClick={() => handleSort("imobiliaria")} active={sortKey === "imobiliaria"} dir={sortDir}>
                Imobiliária / Corretor
              </Th>
              <Th onClick={() => handleSort("vencimento")} active={sortKey === "vencimento"} dir={sortDir} align="right">
                Vencimento
              </Th>
              <Th onClick={() => handleSort("diasAtraso")} active={sortKey === "diasAtraso"} dir={sortDir} align="right">
                Atraso
              </Th>
              <Th onClick={() => handleSort("valorParcela")} active={sortKey === "valorParcela"} dir={sortDir} align="right">
                Valor parcela
              </Th>
              <Th onClick={() => handleSort("dataOperacao")} active={sortKey === "dataOperacao"} dir={sortDir} align="right">
                Data op.
              </Th>
              <Th onClick={() => handleSort("valorOperacao")} active={sortKey === "valorOperacao"} dir={sortDir} align="right">
                Valor op.
              </Th>
              <Th onClick={() => handleSort("jurosParcela")} active={sortKey === "jurosParcela"} dir={sortDir} align="right">
                Juros parcela
              </Th>
              <Th onClick={() => handleSort("encargosTotal")} active={sortKey === "encargosTotal"} dir={sortDir} align="right">
                Encargos
              </Th>
              <Th onClick={() => handleSort("valorAtual")} active={sortKey === "valorAtual"} dir={sortDir} align="right">
                Valor atual
              </Th>
              <th className="px-3 py-3 text-right whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const overdue = r.diasAtraso > 0;
              return (
                <tr
                  key={r.parcelaId}
                  className={`border-b border-border last:border-0 hover:bg-bg-card transition-colors ${overdue ? "bg-red-50/30" : ""}`}
                >
                  <td className="px-3 py-3 text-xs">
                    {r.construtoraId ? (
                      <Link
                        href={`/admin/construtoras/${r.construtoraId}`}
                        className="text-fg font-semibold truncate hover:text-accent block max-w-[160px]"
                      >
                        {r.construtoraNome ?? "—"}
                      </Link>
                    ) : (
                      <span className="text-fg-muted">—</span>
                    )}
                    <Link
                      href={`/admin/operacoes/${r.operacaoId}`}
                      className="font-mono text-[10px] text-accent hover:underline"
                    >
                      {r.operacaoNumero}
                    </Link>
                    <span className="font-mono text-[10px] text-fg-dim">
                      {" · "}#{String(r.parcelaNumero).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {r.corretorId ? (
                      <Link
                        href={`/admin/usuarios/${r.corretorId}`}
                        className="text-fg truncate hover:text-accent block max-w-[180px]"
                      >
                        {r.imobiliariaNome ?? r.corretorNome ?? "—"}
                      </Link>
                    ) : (
                      <span className="text-fg-muted">
                        {r.imobiliariaNome ?? r.corretorNome ?? "—"}
                      </span>
                    )}
                    {r.fundoId && (
                      <Link
                        href={`/admin/fundos/${r.fundoId}`}
                        className="text-[10px] font-mono text-accent hover:underline"
                      >
                        🏦 {r.fundoNome}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs">
                    {fmtDate(r.vencimento)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {overdue ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono font-semibold ${
                          r.diasAtraso >= 90
                            ? "bg-red-50 text-danger border-danger/40"
                            : r.diasAtraso >= 30
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-yellow-50 text-warn border-yellow-200"
                        }`}
                      >
                        {r.diasAtraso}d
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-fg-dim">
                        em {Math.abs(r.diasAtraso)}d
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular text-xs text-fg font-semibold">
                    {formatBRL(r.valorParcela)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-fg-muted">
                    {fmtDate(r.dataOperacao)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular text-xs text-fg-muted">
                    {formatBRL(r.valorOperacao)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular text-xs text-fg-muted">
                    {formatBRL(r.jurosParcela)}
                  </td>
                  <td
                    className="px-3 py-3 text-right font-mono tabular text-xs"
                    title={
                      overdue
                        ? `Multa 2%: ${formatBRL(r.encargosMulta)}\nJuros mora (${(r.taxaMensal * 100).toFixed(2)}% × ${r.diasAtraso}d/30): ${formatBRL(r.encargosJurosMora)}`
                        : "Sem encargos"
                    }
                  >
                    {overdue ? (
                      <span className="text-warn font-semibold">
                        + {formatBRL(r.encargosTotal)}
                      </span>
                    ) : (
                      <span className="text-fg-dim">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular text-xs text-fg font-bold">
                    {formatBRL(r.valorAtual)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ActionBtn
                        title="Gerar boleto"
                        onClick={() => handleBoleto(r)}
                        disabled={pending}
                        icon={<DocIcon />}
                        tone="accent"
                      />
                      <ActionBtn
                        title={`WhatsApp construtora · ${r.construtoraTelefone ?? "sem telefone"}`}
                        onClick={() => handleWhatsConstrutora(r)}
                        icon={<WhatsIcon />}
                        tone="success"
                      />
                      <ActionBtn
                        title={`WhatsApp imobiliária / corretor · ${r.imobiliariaTelefone ?? r.corretorTelefone ?? "sem telefone"}`}
                        onClick={() => handleWhatsImobiliaria(r)}
                        icon={<WhatsIcon />}
                        tone="success"
                        outline
                      />
                      <ActionBtn
                        title="Notificar por email"
                        onClick={() => handleEmail(r)}
                        disabled={pending}
                        icon={<MailIcon />}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border-strong bg-bg-card font-mono text-[10px] uppercase tracking-wider text-fg-dim">
              <td className="px-3 py-3 text-fg-muted" colSpan={4}>
                {sorted.length} parcela(s)
              </td>
              <td className="px-3 py-3 text-right tabular text-fg font-bold">
                {formatBRL(totalParcela)}
              </td>
              <td className="px-3 py-3" />
              <td className="px-3 py-3" />
              <td className="px-3 py-3" />
              <td className="px-3 py-3 text-right tabular text-warn font-bold">
                + {formatBRL(totalEncargos)}
              </td>
              <td className="px-3 py-3 text-right tabular text-fg font-bold">
                {formatBRL(totalAtual)}
              </td>
              <td className="px-3 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Th({
  onClick,
  active,
  dir,
  align = "left",
  children,
}: {
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  align?: "left" | "right" | "center";
  children: React.ReactNode;
}) {
  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`px-3 py-3 ${alignCls} whitespace-nowrap cursor-pointer select-none hover:text-fg transition-colors`}
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
          {active ? (dir === "desc" ? "▼" : "▲") : "▼"}
        </span>
      </span>
    </th>
  );
}

function ActionBtn({
  title,
  onClick,
  disabled = false,
  icon,
  tone = "default",
  outline = false,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  tone?: "default" | "accent" | "success";
  outline?: boolean;
}) {
  const styles =
    tone === "accent"
      ? "border-accent/40 text-accent hover:bg-accent-soft"
      : tone === "success"
        ? outline
          ? "border-success/40 text-success hover:bg-green-50"
          : "border-success/60 bg-green-50 text-success hover:bg-green-100"
        : "border-border text-fg-muted hover:border-accent hover:text-accent";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center size-8 rounded-lg border ${styles} transition-colors disabled:opacity-50`}
    >
      {icon}
    </button>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function WhatsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
