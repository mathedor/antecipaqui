import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { formatBRL } from "@/lib/format";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Admin · Convites de operação" };

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "aguardando_cedente", label: "Aguardando cedente" },
  { value: "reivindicada", label: "Reivindicados" },
  { value: "descartada", label: "Descartados" },
];

const STATUS_STYLE: Record<string, string> = {
  aguardando_cedente: "bg-yellow-50 text-warn border-yellow-200",
  reivindicada: "bg-green-50 text-success border-green-200",
  descartada: "bg-bg-card text-fg-dim border-border",
};

function extractRows<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === "object" && "rows" in r) {
    return (r as { rows: T[] }).rows;
  }
  return [];
}

type Search = { searchParams: Promise<{ status?: string }> };

export default async function AdminConvitesPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const { status = "" } = await searchParams;

  const where = status
    ? sql`WHERE p.status = ${status}::pending_operacao_status`
    : sql``;
  const result = await db.execute(sql`
    SELECT
      p.id,
      p.corretor_email,
      p.corretor_nome,
      p.valor_venda,
      p.valor_comissao,
      p.numero_parcelas,
      p.data_primeira_parcela,
      p.status,
      p.created_at,
      c.razao_social AS construtora_nome
    FROM pending_operacoes p
    LEFT JOIN construtoras c ON c.id = p.construtora_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT 500
  `);
  const rows = extractRows<{
    id: string;
    corretor_email: string;
    corretor_nome: string | null;
    valor_venda: string;
    valor_comissao: string;
    numero_parcelas: number;
    data_primeira_parcela: string;
    status: string;
    created_at: string;
    construtora_nome: string | null;
  }>(result);

  const totalComissao = rows.reduce(
    (s, r) => s + parseFloat(r.valor_comissao),
    0,
  );

  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <div className="mb-6">
        <Link
          href="/admin/relatorios/indices"
          className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
        >
          ← índices
        </Link>
        <div className="eyebrow mb-2">convites de operação</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Convites</span> enviados
        </h1>
        <p className="mt-2 text-fg-muted">
          {rows.length} {rows.length === 1 ? "convite" : "convites"} —{" "}
          comissão total {formatBRL(totalComissao)}
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-convites" />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-16 shrink-0">
          Status
        </span>
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value || "all"}
            href={
              f.value ? `/admin/convites?status=${f.value}` : "/admin/convites"
            }
            className={`chip transition-colors hover:border-accent ${
              status === f.value ? "chip-accent" : ""
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <p className="text-fg-muted">Nenhum convite encontrado.</p>
        </div>
      ) : (
        <>
        <div className="hidden lg:block rounded-2xl border border-border bg-bg-elev overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-bg-card border-b border-border">
              <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
                <th className="px-4 py-3 text-left">Cedente</th>
                <th className="px-4 py-3 text-left">Construtora</th>
                <th className="px-4 py-3 text-right">Comissão</th>
                <th className="px-4 py-3 text-right">VV</th>
                <th className="px-4 py-3 text-center">Parc.</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Enviado em</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-0 hover:bg-bg-card transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-fg truncate">
                      {r.corretor_nome ?? "(sem nome)"}
                    </div>
                    <div className="text-[11px] text-fg-muted font-mono">
                      {r.corretor_email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fg-muted truncate max-w-[200px]">
                    {r.construtora_nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular text-fg font-semibold">
                    {formatBRL(parseFloat(r.valor_comissao))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular text-fg-muted text-xs">
                    {formatBRL(parseFloat(r.valor_venda))}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-fg-muted text-xs">
                    {r.numero_parcelas}x
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono ${STATUS_STYLE[r.status] ?? ""}`}
                    >
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[10px] text-fg-dim">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-strong bg-bg-card font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                <td className="px-4 py-3 text-fg-muted">Totais</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular text-fg font-bold">
                  {formatBRL(totalComissao)}
                </td>
                <td className="px-4 py-3 text-right tabular text-fg font-bold">
                  {formatBRL(
                    rows.reduce((s, r) => s + parseFloat(r.valor_venda), 0),
                  )}
                </td>
                <td className="px-4 py-3 text-center tabular text-fg-muted">
                  {rows.reduce((s, r) => s + r.numero_parcelas, 0)}x
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="lg:hidden space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-border bg-bg-elev p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-fg">
                    {r.corretor_nome ?? "(sem nome)"}
                  </div>
                  <div className="font-mono text-[11px] text-fg-muted">
                    {r.corretor_email}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-fg-muted">
                    {r.construtora_nome ?? "—"}
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLE[r.status] ?? ""}`}
                >
                  {r.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    Comissão
                  </div>
                  <div className="tabular font-mono font-semibold text-fg">
                    {formatBRL(parseFloat(r.valor_comissao))}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    VV
                  </div>
                  <div className="tabular font-mono text-fg-muted">
                    {formatBRL(parseFloat(r.valor_venda))}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    Parcelas
                  </div>
                  <div className="font-mono text-fg-muted">
                    {r.numero_parcelas}x
                  </div>
                </div>
              </div>
              <div className="mt-2 font-mono text-[10px] text-fg-dim">
                Enviado em {new Date(r.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </AdminShell>
  );
}
