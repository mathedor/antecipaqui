import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { ScoreHistoricoChart } from "@/components/score-historico-chart";
import { getScoreHistoricoConstrutora } from "@/lib/actions/score-historico";
import { getScoreConstrutora } from "@/lib/scoring";
import {
  approveConstrutoraOnboardingAction,
  getConstrutoraDetail,
} from "@/lib/actions/admin";
import {
  blockConstrutoraAction,
  unblockConstrutoraAction,
} from "@/lib/actions/block";
import { getConstrutoraMonthlyStats } from "@/lib/actions/operacoes";
import { ConstrutoraCharts } from "@/components/dashboard-charts";
import { toBlobProxyHref } from "@/lib/blob-url";
import { audit, getAuditLogsByTarget, getAuditLogsByUser } from "@/lib/audit";
import { AuditLogTimeline } from "@/components/audit-log-timeline";
import { IniciarContatoButton } from "@/components/iniciar-contato-button";
import { AdminDeleteButton } from "@/components/admin-delete-button";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Admin · Construtora",
};

const TIPO_LABEL: Record<string, string> = {
  contrato_social: "Contrato social",
  comprovante_endereco: "Comprovante de endereço",
};

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Params = { params: Promise<{ id: string }> };

export default async function AdminConstrutoraDetail({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;

  const detail = await getConstrutoraDetail(id);
  if (!detail) notFound();

  const [monthly, logsTarget, logsOwner] = await Promise.all([
    getConstrutoraMonthlyStats(id),
    getAuditLogsByTarget("construtora", id, 50),
    detail.owner
      ? getAuditLogsByUser(detail.owner.id, 50)
      : Promise.resolve([]),
  ]);

  // Log da visualização (best-effort)
  audit({
    action: "view_construtora",
    targetType: "construtora",
    targetId: id,
    targetLabel: detail.construtora.razaoSocial,
  }).catch(() => undefined);

  const { construtora, owner, documentos, operacoes, corretores, totals } =
    detail;
  const isPending = construtora.onboardingStatus === "documentos_enviados";
  const enderecoCompleto = [
    construtora.endereco,
    construtora.cidade,
    construtora.uf,
    construtora.cep && `CEP ${construtora.cep}`,
  ]
    .filter(Boolean)
    .join(" · ");

  async function approve() {
    "use server";
    await approveConstrutoraOnboardingAction(id);
  }
  async function block() {
    "use server";
    await blockConstrutoraAction(id);
  }
  async function unblock() {
    "use server";
    await unblockConstrutoraAction(id);
  }

  const [scoreHist, scoreAtual] = await Promise.all([
    getScoreHistoricoConstrutora(id),
    getScoreConstrutora(id, "global"),
  ]);

  return (
    <AdminShell active="/admin/construtoras" userName={admin.nome}>
      <Link
        href="/admin/construtoras"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← construtoras
      </Link>

      <ScoreHistoricoChart
        construtoraId={id}
        historico={scoreHist}
        scoreAtual={scoreAtual.score}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-display-md">{construtora.razaoSocial}</h1>
          {construtora.nomeFantasia && (
            <p className="mt-1 text-fg-muted">{construtora.nomeFantasia}</p>
          )}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs text-fg-muted">
              CNPJ {construtora.cnpj}
            </span>
            <span className="size-1 rounded-full bg-fg-dim" />
            <span
              className={`chip ${
                construtora.onboardingStatus === "aprovado"
                  ? "chip-success"
                  : construtora.onboardingStatus === "documentos_enviados"
                    ? "chip-accent"
                    : ""
              }`}
            >
              {construtora.onboardingStatus}
            </span>
            {!construtora.isActive && (
              <span className="chip bg-red-50 border-danger/40 text-danger">
                ⛔ bloqueada
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <IniciarContatoButton
            telefone={construtora.telefone ?? owner?.telefone ?? null}
            nome={owner?.nome ?? construtora.razaoSocial}
          />
          <Link
            href={`/admin/construtoras/${id}/editar`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-medium text-sm transition-colors"
          >
            ✎ Editar
          </Link>
          {construtora.isActive ? (
            <form action={block}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-danger/40 text-danger hover:bg-red-50 font-medium text-sm transition-colors"
              >
                ⛔ Bloquear
              </button>
            </form>
          ) : (
            <form action={unblock}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-success/40 text-success hover:bg-green-50 font-medium text-sm transition-colors"
              >
                ✓ Desbloquear
              </button>
            </form>
          )}
          <AdminDeleteButton
            target="construtora"
            id={id}
            nome={construtora.razaoSocial}
          />
        </div>
      </div>

      {isPending && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-3">
            ações administrativas
          </div>
          <h3 className="text-lg font-bold mb-1">Aprovar construtora</h3>
          <p className="text-sm text-fg-muted mb-5">
            Confira o contrato social e comprovante de endereço.
          </p>
          <form action={approve}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-success text-white font-semibold text-sm hover:bg-green-700 transition-colors"
            >
              ✓ Aprovar construtora
            </button>
          </form>
        </div>
      )}

      {/* Stat cards agregados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Operações"
          value={String(totals.operacoesTotal)}
          sub={`${totals.operacoesAtivas} ativas · ${totals.operacoesRealizadas} realizadas`}
        />
        <Stat
          label="Total operado"
          value={formatBRL(totals.totalOperado)}
          highlight
        />
        <Stat
          label="Pago / antecipado"
          value={formatBRL(totals.totalPago)}
          tone="success"
        />
        <Stat
          label="Em aberto"
          value={formatBRL(totals.totalAberto)}
          tone="warn"
        />
      </div>

      {totals.cashbackTotal > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <Stat
            label="Cashback acumulado"
            value={formatBRL(totals.cashbackTotal)}
          />
          <Stat
            label="Cashback disponível"
            value={formatBRL(totals.cashbackDisponivel)}
            tone="success"
          />
          <Stat
            label="Cashback sacado"
            value={formatBRL(totals.cashbackSacado)}
          />
        </div>
      )}

      {/* Charts mensais */}
      {monthly.length > 0 && (
        <div className="mb-8">
          <ConstrutoraCharts data={monthly} />
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-5">
          <Card label="Identificação e contato">
            <Grid>
              <Field label="Razão social" value={construtora.razaoSocial} />
              <Field label="Nome fantasia" value={construtora.nomeFantasia} />
              <Field label="CNPJ" value={construtora.cnpj} mono />
              <Field label="Telefone" value={construtora.telefone} mono />
              <Field label="Email" value={construtora.email} mono />
              <Field label="Cadastrado em" value={formatDateTime(construtora.createdAt)} />
            </Grid>
            {enderecoCompleto && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
                  endereço
                </div>
                <div className="text-sm text-fg-muted">{enderecoCompleto}</div>
              </div>
            )}
          </Card>

          {owner ? (
            <Card label="Responsável cadastrado">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-base font-bold">
                    {owner.nome ?? owner.email}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
                    <a
                      href={`mailto:${owner.email}`}
                      className="hover:text-accent"
                    >
                      {owner.email}
                    </a>
                    {owner.telefone && (
                      <a
                        href={`tel:${owner.telefone}`}
                        className="font-mono hover:text-accent"
                      >
                        {owner.telefone}
                      </a>
                    )}
                  </div>
                </div>
                <Link
                  href={`/admin/usuarios/${owner.id}`}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-fg-muted hover:border-accent hover:text-accent text-xs transition-colors"
                >
                  ver perfil completo →
                </Link>
              </div>
            </Card>
          ) : (
            <Card label="Responsável">
              <div className="rounded-xl border border-warn/40 bg-yellow-50 p-3 text-sm text-warn">
                Sem dono cadastrado — provavelmente registrada por uma
                imobiliária / corretor durante operação. Use o email da
                construtora pra fazer outreach.
              </div>
            </Card>
          )}

          <Card
            label={`Imobiliárias / corretores que operam com ela (${corretores.length})`}
          >
            {corretores.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Nenhuma operação registrada ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {corretores.map((c) => (
                  <li
                    key={c.id}
                    className="grid grid-cols-12 gap-3 px-4 py-3 rounded-xl border border-border bg-bg hover:border-accent transition-colors items-center"
                  >
                    <Link
                      href={`/admin/usuarios/${c.id}`}
                      className="col-span-7 text-sm font-semibold text-fg truncate hover:text-accent"
                    >
                      {c.nome}
                    </Link>
                    <span className="col-span-2 text-right text-xs font-mono text-fg-muted">
                      {c.operacoes}x
                    </span>
                    <span className="col-span-3 text-right font-mono tabular text-sm text-fg font-semibold">
                      {formatBRL(c.valorOperado)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card label={`Operações (${operacoes.length})`}>
            {operacoes.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Nenhuma operação registrada.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border">
                      <th className="px-2 py-2 text-left">Número</th>
                      <th className="px-2 py-2 text-left">Cedente</th>
                      <th className="px-2 py-2 text-right">Comissão</th>
                      <th className="px-2 py-2 text-right">VP</th>
                      <th className="px-2 py-2 text-center">Parc.</th>
                      <th className="px-2 py-2 text-left">Status</th>
                      <th className="px-2 py-2 text-right">Cadastrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operacoes.map((op) => (
                      <tr
                        key={op.id}
                        className="border-b border-border last:border-0 hover:bg-bg transition-colors"
                      >
                        <td className="px-2 py-2">
                          <Link
                            href={`/admin/operacoes/${op.id}`}
                            className="font-mono text-xs text-fg hover:text-accent"
                          >
                            {op.numero}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-xs text-fg-muted truncate max-w-[200px]">
                          {op.corretorNome ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular text-xs text-fg-muted">
                          {formatBRL(parseFloat(op.valorComissao))}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular text-xs text-fg font-semibold">
                          {formatBRL(parseFloat(op.valorPresente))}
                        </td>
                        <td className="px-2 py-2 text-center text-xs font-mono text-fg-muted">
                          {op.numeroParcelas}x
                        </td>
                        <td className="px-2 py-2">
                          <OperacaoStatusBadge status={op.status} />
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-[10px] text-fg-dim">
                          {formatDate(op.dataVenda)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border-strong bg-bg-card font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                      <td className="px-2 py-2 text-fg-muted">Totais</td>
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2 text-right tabular text-fg font-bold">
                        {formatBRL(
                          operacoes.reduce(
                            (s, o) => s + parseFloat(o.valorComissao),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular text-fg font-bold">
                        {formatBRL(
                          operacoes.reduce(
                            (s, o) => s + parseFloat(o.valorPresente),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-2 py-2 text-center tabular text-fg-muted">
                        {operacoes.reduce((s, o) => s + o.numeroParcelas, 0)}x
                      </td>
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>

        <aside className="lg:col-span-4 space-y-5">
          <Card label="Documentos">
            {documentos.length === 0 ? (
              <p className="text-sm text-fg-muted">Nenhum documento.</p>
            ) : (
              <ul className="space-y-2">
                {documentos.map((d) => (
                  <li
                    key={d.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-bg hover:border-accent transition-colors ${
                      d.validacaoStatus === "revisao"
                        ? "border-warn/40"
                        : "border-border"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                          {TIPO_LABEL[d.tipo] ?? d.tipo}
                        </span>
                        {d.validacaoStatus === "revisao" && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono font-semibold bg-yellow-50 text-warn border border-warn/30"
                            title={d.validacaoMotivo ?? "Confiança baixa na IA — revisar"}
                          >
                            revisar
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-fg truncate">
                        {d.nomeOriginal}
                      </div>
                      {d.validacaoStatus === "revisao" && d.validacaoMotivo && (
                        <div className="mt-1 text-[10px] text-warn leading-relaxed">
                          ⚠ {d.validacaoMotivo}
                        </div>
                      )}
                    </div>
                    <a
                      href={toBlobProxyHref(d.url)}
                      target="_blank"
                      rel="noopener"
                      className="text-accent text-sm font-semibold whitespace-nowrap shrink-0"
                    >
                      abrir ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {logsTarget.length > 0 && (
            <Card label={`Histórico de ações sobre esta construtora (${logsTarget.length})`}>
              <AuditLogTimeline logs={logsTarget} />
            </Card>
          )}

          {logsOwner.length > 0 && (
            <Card label={`Atividade do responsável (${logsOwner.length})`}>
              <AuditLogTimeline
                logs={logsOwner}
                emptyLabel="Sem atividade ainda."
              />
            </Card>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
        {label}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-0.5">
        {label}
      </div>
      <div
        className={`text-sm ${mono ? "font-mono" : ""} ${
          value ? "text-fg" : "text-fg-dim italic"
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  tone?: "default" | "success" | "warn";
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : "border-border bg-bg-elev";
  const valueColor = highlight
    ? "text-accent"
    : tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : "text-fg";
  return (
    <div className={`rounded-2xl border p-4 ${baseClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight leading-tight break-words ${valueColor}`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] md:text-xs text-fg-muted mt-1">{sub}</div>
      )}
    </div>
  );
}
