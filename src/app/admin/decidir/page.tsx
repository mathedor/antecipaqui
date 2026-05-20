import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import {
  getAdminMesaStats,
  getMesaFiltroOpcoes,
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

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Resolve preset de período → { de, ate } em YYYY-MM-DD. */
function resolvePeriodo(
  periodo: string | undefined,
  deRaw: string | undefined,
  ateRaw: string | undefined,
): { de?: string; ate?: string } {
  const hoje = new Date();
  const hojeStr = isoDate(hoje);
  switch (periodo) {
    case "hoje":
      return { de: hojeStr, ate: hojeStr };
    case "7d": {
      const d = new Date(hoje);
      d.setDate(d.getDate() - 6);
      return { de: isoDate(d), ate: hojeStr };
    }
    case "30d": {
      const d = new Date(hoje);
      d.setDate(d.getDate() - 29);
      return { de: isoDate(d), ate: hojeStr };
    }
    case "mes": {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { de: isoDate(d), ate: hojeStr };
    }
    case "custom":
      return { de: deRaw || undefined, ate: ateRaw || undefined };
    default:
      return {};
  }
}

type SearchParams = {
  filtro?: string;
  construtora?: string;
  imobiliaria?: string;
  comercial?: string;
  periodo?: string;
  de?: string;
  ate?: string;
};

type Search = {
  searchParams: Promise<SearchParams>;
};

/** Monta href preservando params atuais, com overrides. Remove vazios. */
function buildHref(base: SearchParams, overrides: Partial<SearchParams>): string {
  const merged: Record<string, string | undefined> = { ...base, ...overrides };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `/admin/decidir?${s}` : "/admin/decidir";
}

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

  const { de, ate } = resolvePeriodo(params.periodo, params.de, params.ate);

  const [ops, stats, opcoes] = await Promise.all([
    getOpsAguardandoAdmin({
      status: statusFiltro,
      construtoraId: params.construtora,
      imobiliariaId: params.imobiliaria,
      comercialId: params.comercial,
      dataInicio: de,
      dataFim: ate,
    }),
    getAdminMesaStats(),
    getMesaFiltroOpcoes(),
  ]);

  // Aplica filtro adicional pra fundo_pendente
  const opsFiltradas =
    filtro === "fundo_pendente"
      ? ops.filter((o) => o.fundoAprovacao === "pendente")
      : filtro === "fundo_recusou"
        ? ops.filter((o) => o.fundoAprovacao === "recusada")
        : ops;

  const temFiltrosAvancados =
    !!params.construtora ||
    !!params.imobiliaria ||
    !!params.comercial ||
    !!params.periodo;

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

      {/* Chips de status — preservam filtros avançados */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <FilterChip
          label={`Todos pendentes (${ops.length})`}
          href={buildHref(params, { filtro: undefined })}
          active={filtro === "todos"}
        />
        <FilterChip
          label={`Aguardando análise (${stats.qtdAguardandoAprovacao})`}
          href={buildHref(params, { filtro: "aguardando" })}
          active={filtro === "aguardando"}
          tone={stats.qtdAguardandoAprovacao > 0 ? "warn" : "default"}
        />
        <FilterChip
          label={`Docs incompletos (${stats.qtdDocsIncompletos})`}
          href={buildHref(params, { filtro: "docs_incompletos" })}
          active={filtro === "docs_incompletos"}
        />
        <FilterChip
          label={`Fundo pendente (${stats.qtdFundoPendente})`}
          href={buildHref(params, { filtro: "fundo_pendente" })}
          active={filtro === "fundo_pendente"}
          tone={stats.qtdFundoPendente > 0 ? "warn" : "default"}
        />
        {stats.qtdFundoRecusou > 0 && (
          <FilterChip
            label={`Fundo recusou (${stats.qtdFundoRecusou})`}
            href={buildHref(params, { filtro: "fundo_recusou" })}
            active={filtro === "fundo_recusou"}
            tone="danger"
          />
        )}
      </div>

      {/* Filtros avançados — form GET (data/período, construtora, imob, comercial) */}
      <MesaFiltros
        params={params}
        opcoes={opcoes}
        ativo={temFiltrosAvancados}
      />

      {opsFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-fg-muted">
          {temFiltrosAvancados || filtro !== "todos" ? (
            <>
              Nenhuma operação bate com os filtros.{" "}
              <Link href="/admin/decidir" className="text-accent hover:underline">
                Limpar filtros
              </Link>
            </>
          ) : (
            "🎉 Nenhuma operação na fila."
          )}
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

function MesaFiltros({
  params,
  opcoes,
  ativo,
}: {
  params: SearchParams;
  opcoes: {
    construtoras: { id: string; nome: string }[];
    imobiliarias: { id: string; nome: string }[];
    comerciais: { id: string; nome: string }[];
  };
  ativo: boolean;
}) {
  const selectCls =
    "h-9 rounded-lg border border-border bg-bg px-2.5 text-sm text-fg focus:border-accent focus:outline-none";
  const labelCls =
    "font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1 block";
  return (
    <form
      method="get"
      className="rounded-2xl border border-border bg-bg-card p-4 mb-6"
    >
      {/* Preserva o filtro de status atual ao submeter */}
      {params.filtro && (
        <input type="hidden" name="filtro" value={params.filtro} />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className={labelCls} htmlFor="f-periodo">
            Período (criação)
          </label>
          <select
            id="f-periodo"
            name="periodo"
            defaultValue={params.periodo ?? ""}
            className={`${selectCls} w-full`}
          >
            <option value="">Qualquer data</option>
            <option value="hoje">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="mes">Este mês</option>
            <option value="custom">Período personalizado ↓</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="f-de">
            De
          </label>
          <input
            id="f-de"
            type="date"
            name="de"
            defaultValue={params.de ?? ""}
            className={`${selectCls} w-full`}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="f-ate">
            Até
          </label>
          <input
            id="f-ate"
            type="date"
            name="ate"
            defaultValue={params.ate ?? ""}
            className={`${selectCls} w-full`}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="f-construtora">
            Construtora
          </label>
          <select
            id="f-construtora"
            name="construtora"
            defaultValue={params.construtora ?? ""}
            className={`${selectCls} w-full`}
          >
            <option value="">Todas</option>
            {opcoes.construtoras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="f-imobiliaria">
            Imobiliária
          </label>
          <select
            id="f-imobiliaria"
            name="imobiliaria"
            defaultValue={params.imobiliaria ?? ""}
            className={`${selectCls} w-full`}
          >
            <option value="">Todas</option>
            {opcoes.imobiliarias.map((im) => (
              <option key={im.id} value={im.id}>
                {im.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="f-comercial">
            Comercial
          </label>
          <select
            id="f-comercial"
            name="comercial"
            defaultValue={params.comercial ?? ""}
            className={`${selectCls} w-full`}
          >
            <option value="">Todos</option>
            {opcoes.comerciais.map((cm) => (
              <option key={cm.id} value={cm.id}>
                {cm.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition"
        >
          Aplicar filtros
        </button>
        {ativo && (
          <Link
            href={buildHref(
              {},
              { filtro: params.filtro === "todos" ? undefined : params.filtro },
            )}
            className="h-9 px-4 inline-flex items-center rounded-lg border border-border text-fg-muted font-semibold text-sm hover:border-accent transition"
          >
            Limpar
          </Link>
        )}
        <span className="text-[11px] text-fg-dim font-mono ml-auto">
          use &quot;personalizado&quot; com De/Até pra range específico
        </span>
      </div>
    </form>
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
            {op.comercialNome && (
              <>
                {" · comercial "}
                <span className="text-fg">{op.comercialNome}</span>
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
