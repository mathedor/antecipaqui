import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import {
  getAdminMesaStats,
  getOpsAguardandoAdmin,
} from "@/lib/actions/admin-mesa";
import { formatBRL } from "@/lib/format";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { scoreColorClass } from "@/lib/scoring";
import { AdminAcaoOpForm } from "@/components/admin-acao-op-form";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Admin · Mesa de decisão" };
export const dynamic = "force-dynamic";

function fmtDate(d: string | Date | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return dt.toLocaleDateString("pt-BR");
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(2).replace(".", ",")}%`;
}

type Search = {
  searchParams: Promise<{ filtro?: string }>;
};

export default async function AdminDecidirPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const filtro = params.filtro ?? "todos";

  let statusFiltro: string[] | undefined;
  if (filtro === "aguardando")
    statusFiltro = ["aguardando_aprovacao"];
  else if (filtro === "docs_incompletos")
    statusFiltro = ["documentos_incompletos"];
  else if (filtro === "fundo_pendente")
    statusFiltro = ["pre_aprovada", "analise_final", "enviada_para_assinatura"];

  const [ops, stats] = await Promise.all([
    getOpsAguardandoAdmin(statusFiltro ? { status: statusFiltro } : undefined),
    getAdminMesaStats(),
  ]);

  // Aplica filtro adicional pra fundo_pendente
  const opsFiltradas =
    filtro === "fundo_pendente"
      ? ops.filter((o) => o.fundoAprovacao === "pendente")
      : filtro === "fundo_recusou"
        ? ops.filter((o) => o.fundoAprovacao === "recusada")
        : ops;

  return (
    <AdminShell active="/admin/decidir" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">admin · mesa de decisão</div>
        <h1 className="text-display-md">
          Decidir <span className="text-gradient-blue">operações</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Fila consolidada com score automático da construtora, badges de
          validação IA dos documentos e decomposição financeira inline. Decida
          em 30 segundos sem precisar entrar em cada op.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-decidir" />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <FilterChip
          label={`Todos pendentes (${ops.length})`}
          href="/admin/decidir"
          active={filtro === "todos"}
        />
        <FilterChip
          label={`Aguardando análise (${stats.qtdAguardandoAprovacao})`}
          href="/admin/decidir?filtro=aguardando"
          active={filtro === "aguardando"}
          tone={stats.qtdAguardandoAprovacao > 0 ? "warn" : "default"}
        />
        <FilterChip
          label={`Docs incompletos (${stats.qtdDocsIncompletos})`}
          href="/admin/decidir?filtro=docs_incompletos"
          active={filtro === "docs_incompletos"}
        />
        <FilterChip
          label={`Fundo pendente (${stats.qtdFundoPendente})`}
          href="/admin/decidir?filtro=fundo_pendente"
          active={filtro === "fundo_pendente"}
          tone={stats.qtdFundoPendente > 0 ? "warn" : "default"}
        />
        {stats.qtdFundoRecusou > 0 && (
          <FilterChip
            label={`Fundo recusou (${stats.qtdFundoRecusou})`}
            href="/admin/decidir?filtro=fundo_recusou"
            active={filtro === "fundo_recusou"}
            tone="danger"
          />
        )}
      </div>

      {opsFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-fg-muted">
          🎉 Nenhuma operação na fila selecionada.
        </div>
      ) : (
        <div className="space-y-4">
          {opsFiltradas.map((op) => (
            <OpCard key={op.operacaoId} op={op} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function OpCard({ op }: { op: Awaited<ReturnType<typeof getOpsAguardandoAdmin>>[number] }) {
  const scoreClass = scoreColorClass(op.scoreConstrutora.score);
  const fundoRecusou = op.fundoAprovacao === "recusada";
  const fundoAprovou = op.fundoAprovacao === "aprovada";

  return (
    <article
      className={`rounded-2xl border p-5 md:p-6 ${
        fundoRecusou ? "border-danger/30 bg-red-50" : "border-border bg-bg-elev"
      }`}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/admin/operacoes/${op.operacaoId}`}
              className="font-mono text-base font-bold text-fg hover:text-accent"
            >
              {op.numero}
            </Link>
            <OperacaoStatusBadge status={op.status as never} />
            {fundoRecusou && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold bg-red-100 text-danger border border-danger/30">
                Fundo recusou
              </span>
            )}
            {fundoAprovou && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold bg-green-50 text-success border border-success/30">
                Fundo aprovou
              </span>
            )}
          </div>
          <div className="text-sm text-fg-muted mt-1">
            <strong>{op.construtoraNome ?? "—"}</strong>
            {op.imobiliariaNome && ` · ${op.imobiliariaNome}`}
            {op.corretorNome && ` · ${op.corretorNome}`}
            {op.fundoNome && (
              <>
                {" · fundo "}
                <span className="text-fg">{op.fundoNome}</span>
              </>
            )}
          </div>
          <div className="text-[10px] font-mono text-fg-dim mt-0.5">
            criada em {fmtDate(op.createdAt)} · venda{" "}
            {fmtDate(op.dataVenda)}
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            score construtora
          </div>
          <div className={`font-mono tabular text-3xl font-bold ${scoreClass}`}>
            {op.scoreConstrutora.score}
            <span className="text-xs text-fg-muted font-normal ml-0.5">/100</span>
          </div>
          <div className="text-[10px] text-fg-dim">
            {op.scoreConstrutora.totalParcelas} parcela
            {op.scoreConstrutora.totalParcelas === 1 ? "" : "s"} ·{" "}
            {op.scoreConstrutora.vencidas} vencidas
          </div>
        </div>
      </div>

      {/* Motivo recusa fundo */}
      {fundoRecusou && op.fundoRecusaMotivo && (
        <div className="rounded-lg border border-danger/30 bg-red-100 px-3 py-2 mb-3 text-xs">
          <strong className="text-danger">Motivo do fundo:</strong>{" "}
          {op.fundoRecusaMotivo}
        </div>
      )}

      {/* Decomposição financeira */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Stat label="Valor comissão" value={formatBRL(op.valorComissao)} />
        <Stat
          label="VP (fundo desembolsa)"
          value={formatBRL(op.valorPresente)}
        />
        <Stat
          label="Spread (taxas)"
          value={`${fmtPct(op.spreadPctMensal)}/m`}
          tone={op.spreadPctMensal > 0 ? "success" : "warn"}
        />
        <Stat
          label="Resultado AQ"
          value={formatBRL(op.resultadoAQ)}
          tone="success"
        />
      </div>

      {/* Mini info */}
      <div className="flex items-center gap-3 mb-4 flex-wrap text-xs">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
          taxa op {fmtPct(op.taxaOpMensal)} · fundo{" "}
          {op.fundoNome ? fmtPct(op.taxaFundoMensal) : "—"} ·{" "}
          {op.numeroParcelas} parcelas · juros{" "}
          {formatBRL(op.juros)} · custos {formatBRL(op.custos)}
        </span>
      </div>

      {/* Docs status */}
      <div className="flex items-center gap-2 mb-4 flex-wrap text-xs">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
          docs:
        </span>
        {op.docsStatus.total === 0 ? (
          <span className="text-danger">⚠ nenhum doc anexado</span>
        ) : (
          <>
            {op.docsStatus.ok > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-green-50 text-success border border-success/30">
                ✓ {op.docsStatus.ok} validado{op.docsStatus.ok === 1 ? "" : "s"}
              </span>
            )}
            {op.docsStatus.revisao > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-yellow-50 text-warn border border-warn/30">
                ⚠ {op.docsStatus.revisao} revisar
              </span>
            )}
            {op.docsStatus.semValidacao > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-bg-card text-fg-muted border border-border">
                {op.docsStatus.semValidacao} sem IA
              </span>
            )}
          </>
        )}
        <span className="flex-1" />
        <Link
          href={`/admin/operacoes/${op.operacaoId}`}
          className="text-accent text-xs font-mono hover:underline"
        >
          ver 360 →
        </Link>
      </div>

      {/* Ações de transição */}
      <AdminAcaoOpForm operacaoId={op.operacaoId} status={op.status} />
    </article>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn";
}) {
  const valueCls =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : "text-fg";
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim mb-0.5">
        {label}
      </div>
      <div
        className={`font-mono tabular text-sm md:text-base font-bold ${valueCls}`}
      >
        {value}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
  tone = "default",
}: {
  label: string;
  href: string;
  active: boolean;
  tone?: "default" | "warn" | "danger";
}) {
  const baseClass = active
    ? "bg-accent text-white border-accent"
    : tone === "warn"
      ? "bg-yellow-50 text-warn border-warn/30 hover:bg-yellow-100"
      : tone === "danger"
        ? "bg-red-50 text-danger border-danger/30 hover:bg-red-100"
        : "bg-bg-elev text-fg border-border hover:border-accent";
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${baseClass}`}
    >
      {label}
    </Link>
  );
}
