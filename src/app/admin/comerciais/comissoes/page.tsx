import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { listComissoesComercial } from "@/lib/actions/comissoes-comercial";
import { formatBRL } from "@/lib/format";
import { MarcarComissaoPagaButton } from "@/components/marcar-comissao-paga-button";

export const metadata = { title: "Admin · Comissões dos comerciais" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  paga: "Paga",
  cancelada: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-yellow-50 text-warn border-warn/30",
  paga: "bg-green-50 text-success border-success/30",
  cancelada: "bg-bg-card text-fg-muted border-border",
};

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default async function AdminComissoesPage() {
  const admin = await requireAdmin();
  const comissoes = await listComissoesComercial();

  const totals = comissoes.reduce(
    (acc, c) => ({
      devido: acc.devido + c.valorDevido,
      pago: acc.pago + c.valorPago,
      aPagar:
        acc.aPagar +
        (c.status === "paga"
          ? 0
          : Math.max(0, c.valorDevido - c.valorPago)),
    }),
    { devido: 0, pago: 0, aPagar: 0 },
  );

  return (
    <AdminShell active="/admin/comerciais" userName={admin.nome}>
      <Link
        href="/admin/comerciais"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← comerciais
      </Link>
      <div className="mb-6">
        <div className="eyebrow mb-2">ledger · pagamento de comissões</div>
        <h1 className="text-display-md">
          Comissões dos <span className="text-gradient-blue">comerciais</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Comissão = (spread ÷ 2) × 0,82 × 10%. Registro gerado
          automaticamente na aprovação da operação. Marque como paga conforme
          for repassando aos comerciais.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Comissões geradas" value={String(comissoes.length)} />
        <Stat
          label="Total devido"
          value={formatBRL(totals.devido)}
          highlight
        />
        <Stat label="Pago" value={formatBRL(totals.pago)} tone="success" />
        <Stat
          label="A pagar"
          value={formatBRL(totals.aPagar)}
          tone="warn"
        />
      </div>

      {comissoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-fg-muted">
          Nenhuma comissão cadastrada ainda.
        </div>
      ) : (
        <>
        <div className="hidden lg:block rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-bg-card">
                <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono text-left">
                  <th className="px-4 py-3">Operação</th>
                  <th className="px-4 py-3">Comercial</th>
                  <th className="px-4 py-3">Gerada</th>
                  <th className="px-4 py-3 text-right">Devido</th>
                  <th className="px-4 py-3 text-right">Pago</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {comissoes.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-border last:border-0 hover:bg-bg-card transition-colors ${
                      i % 2 === 1 ? "bg-bg/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/admin/operacoes/${c.operacaoId}`}
                        className="font-semibold text-fg hover:text-accent transition-colors"
                      >
                        {c.operacaoNumero}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/comerciais/${c.comercialId}`}
                        className="text-fg hover:text-accent transition-colors"
                      >
                        {c.comercialNome ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                      {fmtDate(c.geradaEm)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-fg font-semibold">
                      {formatBRL(c.valorDevido)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-success">
                      {formatBRL(c.valorPago)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold border ${
                          STATUS_COLOR[c.status]
                        }`}
                      >
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status !== "paga" && c.status !== "cancelada" && (
                        <MarcarComissaoPagaButton
                          comissaoId={c.id}
                          valorDevido={c.valorDevido}
                          valorPagoAtual={c.valorPago}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: cards */}
        <div className="lg:hidden space-y-3">
          {comissoes.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-border bg-bg-elev p-4"
            >
              <Link
                href={`/admin/operacoes/${c.operacaoId}`}
                className="block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-fg">
                      {c.operacaoNumero}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-fg-muted">
                      {c.comercialNome ?? "—"} · gerada {fmtDate(c.geradaEm)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLOR[c.status]}`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                      Devido
                    </div>
                    <div className="tabular font-mono font-semibold text-fg">
                      {formatBRL(c.valorDevido)}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                      Pago
                    </div>
                    <div className="tabular font-mono text-success">
                      {formatBRL(c.valorPago)}
                    </div>
                  </div>
                </div>
              </Link>
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                <Link
                  href={`/admin/comerciais/${c.comercialId}`}
                  className="inline-flex flex-1 items-center justify-center rounded-lg border border-border py-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition-colors hover:border-accent hover:text-accent"
                >
                  Ver comercial
                </Link>
                {c.status !== "paga" && c.status !== "cancelada" && (
                  <div className="flex-1 [&>*]:w-full">
                    <MarcarComissaoPagaButton
                      comissaoId={c.id}
                      valorDevido={c.valorDevido}
                      valorPagoAtual={c.valorPago}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "success" | "warn";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : "text-fg";
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-accent bg-accent-soft" : "border-border bg-bg-elev"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className={`font-mono tabular text-2xl font-bold mt-1 ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
