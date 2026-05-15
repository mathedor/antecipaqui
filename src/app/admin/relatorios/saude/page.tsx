import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { getSystemHealth } from "@/lib/actions/reports-extra";
import { EnvVarsList } from "@/components/env-var-help";
import { formatBRLcompact } from "@/lib/format";

export const metadata = { title: "Admin · Saúde do sistema" };
export const dynamic = "force-dynamic";

function timeAgo(iso: string | null): string {
  if (!iso) return "nunca";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtDT(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PERIODO_LABEL: Record<string, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
};

export default async function AdminSaudePage() {
  const admin = await requireAdmin();
  const health = await getSystemHealth();

  const envEntries = Object.entries(health.env) as [
    keyof typeof health.env,
    boolean,
  ][];
  const envOk = envEntries.filter(([, v]) => v).length;
  const envTotal = envEntries.length;

  const trend =
    health.avg7d > 0
      ? ((health.todayQty / health.avg7d - 1) * 100).toFixed(0)
      : "0";
  const trendUp = parseFloat(trend) >= 0;

  const cronsLate = health.crons.filter((c) => c.status === "late").length;
  const cronsNever = health.crons.filter((c) => c.status === "never").length;
  const cronsHealthy =
    cronsLate === 0 && cronsNever === 0
      ? "success"
      : cronsLate > 0
        ? "warn"
        : "danger";

  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <div className="mb-6 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <Link
            href="/admin/relatorios"
            className="text-xs text-fg-muted hover:text-accent"
          >
            ← Relatórios
          </Link>
          <div className="eyebrow mt-2 mb-2">monitoramento</div>
          <h1 className="text-display-md">
            <span className="text-gradient-blue">Saúde</span> do sistema
          </h1>
          <p className="mt-2 text-fg-muted max-w-2xl">
            Status dos crons, integrações, fila de webhooks, recaps gerados e
            erros recentes. Tudo num lugar só.
          </p>
        </div>
      </div>

      {/* === KPIs principais === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Env vars"
          value={`${envOk}/${envTotal}`}
          sub={envOk === envTotal ? "tudo configurado" : "faltam configs"}
          tone={envOk === envTotal ? "success" : "warn"}
        />
        <KpiCard
          label="Crons"
          value={`${health.crons.length - cronsLate - cronsNever}/${health.crons.length}`}
          sub={
            cronsLate > 0
              ? `${cronsLate} atrasado(s)`
              : cronsNever > 0
                ? `${cronsNever} nunca rodou`
                : "todos no horário"
          }
          tone={cronsHealthy}
        />
        <KpiCard
          label="Webhooks fila"
          value={String(
            health.webhooks.pendentes + health.webhooks.falhou,
          )}
          sub={`${health.webhooks.taxa24h ?? "—"}% entregues 24h · ${health.webhooks.desistido} desistido(s)`}
          tone={
            health.webhooks.falhou + health.webhooks.desistido > 0
              ? "warn"
              : "success"
          }
        />
        <KpiCard
          label="Erros detectados"
          value={String(health.errors.length)}
          sub="últimos 30 com 'error/failed'"
          tone={health.errors.length > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard
          label="Eventos hoje"
          value={String(health.todayQty)}
          sub={`média 7d: ${health.avg7d.toFixed(0)} (${trendUp ? "+" : ""}${trend}%)`}
        />
        <KpiCard
          label="Sessões 24h"
          value={String(health.sessoes24h)}
          sub="usuários distintos com login"
        />
        <KpiCard
          label="Recaps hoje"
          value={String(health.recaps.hoje)}
          sub={`${health.recaps.list.length} séries ativas`}
        />
        <KpiCard
          label="Snapshots score 24h"
          value={String(health.snapshots24h)}
          sub={`${health.notif.total24h} notificações enviadas`}
        />
      </div>

      {/* === KPIs de features novas === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="Chat · abertos"
          value={String(health.chat.abertos)}
          sub={`${health.chat.msgs24h} msgs 24h · ${health.chat.sem_resposta_3d} sem resposta 3d+`}
          tone={health.chat.sem_resposta_3d > 5 ? "warn" : "default"}
        />
        <KpiCard
          label="Faturas em aberto"
          value={formatBRLcompact(health.faturas.valor_aberto)}
          sub={`${health.faturas.pendentes + health.faturas.parciais + health.faturas.vencidas} fatura(s) · ${health.faturas.vencidas} vencida(s)`}
          tone={health.faturas.vencidas > 0 ? "warn" : "default"}
        />
        <KpiCard
          label="Comissões a pagar"
          value={formatBRLcompact(health.comissoes.valor_pendente)}
          sub={`${health.comissoes.pendentes} pendente(s) · pago 30d: ${formatBRLcompact(health.comissoes.pago30d)}`}
        />
        <KpiCard
          label="Contratos travados"
          value={String(health.contratos.travados_5d)}
          sub={`${health.contratos.aguardando_assinatura} aguardando · ${health.contratos.assinados} assinados`}
          tone={health.contratos.travados_5d > 0 ? "warn" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* === CRONS === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              crons agendados
            </div>
            <span className="text-[10px] text-fg-dim font-mono">
              última exec inferida pelo efeito no banco
            </span>
          </div>
          <ul className="space-y-2">
            {health.crons.map((c) => {
              const toneCls =
                c.status === "ok"
                  ? "border-success/40 bg-green-50"
                  : c.status === "late"
                    ? "border-warn/40 bg-yellow-50"
                    : "border-danger/40 bg-red-50";
              const dot =
                c.status === "ok"
                  ? "bg-success"
                  : c.status === "late"
                    ? "bg-warn"
                    : "bg-danger";
              return (
                <li
                  key={c.id}
                  className={`rounded-xl border ${toneCls} p-3 flex items-center gap-3`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm">{c.label}</div>
                    <div className="text-[11px] text-fg-muted">
                      {c.descricao}
                    </div>
                    <div className="text-[10px] text-fg-dim font-mono mt-1">
                      cron{" "}
                      <code className="bg-bg-card px-1 rounded">
                        {c.schedule}
                      </code>{" "}
                      · /api/cron/{c.id}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold">
                      {timeAgo(c.lastAt)}
                    </div>
                    <div className="text-[10px] text-fg-dim font-mono">
                      {fmtDT(c.lastAt)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* === WEBHOOKS === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              webhooks externos
            </div>
            <Link
              href="/admin/webhooks"
              className="text-accent text-xs font-semibold hover:underline"
            >
              gerenciar →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniStat
              label="Inscrições ativas"
              value={`${health.webhooks.subscriptions.ativas}/${health.webhooks.subscriptions.total}`}
            />
            <MiniStat
              label="Criados 24h"
              value={String(health.webhooks.criados24h)}
            />
            <MiniStat
              label="Pendentes"
              value={String(health.webhooks.pendentes)}
              tone={health.webhooks.pendentes > 50 ? "warn" : "default"}
            />
            <MiniStat
              label="Falhou (retry)"
              value={String(health.webhooks.falhou)}
              tone={health.webhooks.falhou > 0 ? "warn" : "default"}
            />
            <MiniStat
              label="Desistido"
              value={String(health.webhooks.desistido)}
              tone={health.webhooks.desistido > 0 ? "danger" : "success"}
            />
            <MiniStat
              label="Taxa 24h"
              value={
                health.webhooks.taxa24h !== null
                  ? `${health.webhooks.taxa24h}%`
                  : "—"
              }
              tone={
                health.webhooks.taxa24h === null
                  ? "default"
                  : health.webhooks.taxa24h >= 90
                    ? "success"
                    : health.webhooks.taxa24h >= 60
                      ? "warn"
                      : "danger"
              }
            />
          </div>
        </section>

        {/* === RECAPS === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              recaps gerados
            </div>
            <Link
              href="/admin/relatorios/recaps"
              className="text-accent text-xs font-semibold hover:underline"
            >
              abrir →
            </Link>
          </div>
          {health.recaps.list.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Nenhum recap gerado ainda. O cron roda às 03:30 UTC todos os dias.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {health.recaps.list.map((r) => (
                <li
                  key={`${r.periodo}-${r.escopo}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg border border-border text-xs"
                >
                  <span className="font-mono">
                    {PERIODO_LABEL[r.periodo] ?? r.periodo}
                    <span className="text-fg-dim"> · {r.escopo}</span>
                  </span>
                  <span className="text-right">
                    <div className="font-bold">{timeAgo(r.ultimo)}</div>
                    <div className="text-[10px] text-fg-dim">
                      {r.qtd} salvo(s)
                    </div>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* === Env vars === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 lg:col-span-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            configuração de env vars
          </div>
          <EnvVarsList env={health.env} />
        </section>

        {/* === Atividade últimas 24h === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              atividade · últimas 24h
            </div>
            <Link
              href="/admin/relatorios/logs"
              className="text-accent text-xs font-semibold hover:underline"
            >
              logs completos →
            </Link>
          </div>
          {health.last24h.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Nenhuma atividade registrada nas últimas 24h.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {health.last24h.map((a) => (
                <li
                  key={a.action}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-bg border border-border"
                >
                  <Link
                    href={`/admin/relatorios/logs?action=${encodeURIComponent(a.action)}`}
                    className="font-mono text-[11px] text-fg hover:text-accent truncate flex-1"
                  >
                    {a.action.replace(/_/g, " ")}
                  </Link>
                  <span className="font-mono tabular text-sm font-bold text-accent">
                    {a.qtd}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* === Notificações === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            notificações últimas 24h
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Total" value={String(health.notif.total24h)} />
            <MiniStat
              label="Email enviado"
              value={String(health.notif.email_ok)}
              tone={
                health.notif.total24h > 0 && health.notif.email_ok === 0
                  ? "warn"
                  : "default"
              }
            />
            <MiniStat
              label="SMS enviado"
              value={String(health.notif.sms_ok)}
            />
          </div>
          <p className="text-[11px] text-fg-dim mt-3">
            Se Email/SMS = 0 mas Total &gt; 0, verifique RESEND_API_KEY e
            TWILIO_ACCOUNT_SID nas env vars.
          </p>
        </section>

        {/* === Erros detectados === */}
        <section className="rounded-2xl border border-danger/30 bg-red-50 p-5 md:p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-danger">
              erros detectados nos logs
            </div>
            <span className="text-xs text-fg-muted">
              últimos 30 com action ~ &apos;error|failed|erro&apos;
            </span>
          </div>
          {health.errors.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Nenhum erro detectado nos audit logs. ✓
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-danger/30">
                  <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
                    <th className="px-3 py-2 text-left">Quando</th>
                    <th className="px-3 py-2 text-left">Ação</th>
                    <th className="px-3 py-2 text-left">Quem</th>
                    <th className="px-3 py-2 text-left">Alvo</th>
                    <th className="px-3 py-2 text-left">Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {health.errors.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-danger/20 last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-[10px] text-fg-dim whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-red-50 text-danger border-danger/40">
                          {e.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-fg truncate max-w-[180px]">
                        {e.user_email ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-fg-muted truncate max-w-[180px]">
                        {e.target_label ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-fg-muted">
                        {e.metadata ? (
                          <pre className="text-[10px] font-mono whitespace-pre-wrap max-w-[300px]">
                            {JSON.stringify(e.metadata, null, 2)}
                          </pre>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* === CHAT (tickets) === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              chat · tickets
            </div>
            <Link
              href="/admin/tickets"
              className="text-accent text-xs font-semibold hover:underline"
            >
              abrir tickets →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Abertos" value={String(health.chat.abertos)} />
            <MiniStat
              label="Criados 24h"
              value={String(health.chat.criados24h)}
            />
            <MiniStat
              label="Arquivados"
              value={String(health.chat.arquivados)}
            />
            <MiniStat label="Msgs 24h" value={String(health.chat.msgs24h)} />
            <MiniStat
              label="Mensagens system 24h"
              value={String(health.chat.sys24h)}
            />
            <MiniStat
              label="Anexos 7d"
              value={String(health.chat.anexos7d)}
            />
            <MiniStat
              label="Sem resposta 3d+"
              value={String(health.chat.sem_resposta_3d)}
              tone={
                health.chat.sem_resposta_3d > 10
                  ? "danger"
                  : health.chat.sem_resposta_3d > 5
                    ? "warn"
                    : "default"
              }
            />
          </div>
          <p className="text-[11px] text-fg-dim mt-3">
            Auto-nudge (cron 12:30 UTC) cutuca chats sem resposta automaticamente.
          </p>
        </section>

        {/* === FATURAS DOS FUNDOS === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              faturas dos fundos
            </div>
            <Link
              href="/admin/faturas"
              className="text-accent text-xs font-semibold hover:underline"
            >
              gerenciar →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Total" value={String(health.faturas.total)} />
            <MiniStat
              label="Pendentes"
              value={String(health.faturas.pendentes)}
              tone={health.faturas.pendentes > 0 ? "warn" : "default"}
            />
            <MiniStat label="Pagas" value={String(health.faturas.pagas)} />
            <MiniStat label="Parciais" value={String(health.faturas.parciais)} />
            <MiniStat
              label="Vencidas"
              value={String(health.faturas.vencidas)}
              tone={health.faturas.vencidas > 0 ? "danger" : "success"}
            />
            <MiniStat
              label="Emitidas 30d"
              value={String(health.faturas.emitidas30d)}
            />
          </div>
          <p className="text-[11px] text-fg-dim mt-3">
            Valor total em aberto:{" "}
            <span className="font-bold text-fg">
              {formatBRLcompact(health.faturas.valor_aberto)}
            </span>
          </p>
        </section>

        {/* === COMISSÕES COMERCIAIS === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              comissões dos comerciais
            </div>
            <Link
              href="/admin/comerciais/comissoes"
              className="text-accent text-xs font-semibold hover:underline"
            >
              pagar →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Total" value={String(health.comissoes.total)} />
            <MiniStat
              label="Pendentes"
              value={String(health.comissoes.pendentes)}
              tone={health.comissoes.pendentes > 0 ? "warn" : "default"}
            />
            <MiniStat label="Pagas" value={String(health.comissoes.pagas)} />
            <MiniStat
              label="Canceladas"
              value={String(health.comissoes.canceladas)}
            />
            <MiniStat
              label="A pagar"
              value={formatBRLcompact(health.comissoes.valor_pendente)}
            />
            <MiniStat
              label="Pago 30d"
              value={formatBRLcompact(health.comissoes.pago30d)}
            />
          </div>
        </section>

        {/* === CONTRATOS ZapSign === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              contratos · assinatura digital
            </div>
            <span className="text-[10px] text-fg-dim font-mono">
              integra ZapSign
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Total" value={String(health.contratos.total)} />
            <MiniStat
              label="Gerados"
              value={String(health.contratos.gerados)}
            />
            <MiniStat
              label="Aguardando assin."
              value={String(health.contratos.aguardando_assinatura)}
              tone={
                health.contratos.aguardando_assinatura > 0 ? "warn" : "default"
              }
            />
            <MiniStat
              label="Assinados"
              value={String(health.contratos.assinados)}
              tone="success"
            />
            <MiniStat
              label="Travados 5d+"
              value={String(health.contratos.travados_5d)}
              tone={health.contratos.travados_5d > 0 ? "danger" : "success"}
            />
            <MiniStat
              label="Cancelados"
              value={String(health.contratos.cancelados)}
            />
          </div>
        </section>

        {/* === ANTECIPAÇÕES / RENEGOCIAÇÕES === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            antecipações & renegociações de parcelas
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-fg-muted mb-2">
                Antecipações
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat
                  label="Pendentes"
                  value={String(health.antecipacoes.pendentes)}
                  tone={
                    health.antecipacoes.pendentes > 0 ? "warn" : "default"
                  }
                />
                <MiniStat
                  label="Aprovadas"
                  value={String(health.antecipacoes.aprovadas)}
                />
                <MiniStat
                  label="Quitadas"
                  value={String(health.antecipacoes.quitadas)}
                />
                <MiniStat
                  label="Criadas 30d"
                  value={String(health.antecipacoes.criadas30d)}
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-fg-muted mb-2">
                Renegociações
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat
                  label="Pendentes"
                  value={String(health.renegociacoes.pendentes)}
                  tone={
                    health.renegociacoes.pendentes > 0 ? "warn" : "default"
                  }
                />
                <MiniStat
                  label="Aplicadas"
                  value={String(health.renegociacoes.aplicadas)}
                />
                <MiniStat
                  label="Total"
                  value={String(health.renegociacoes.total)}
                />
                <MiniStat
                  label="Criadas 30d"
                  value={String(health.renegociacoes.criadas30d)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* === ANÁLISE DE CRÉDITO === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              análise de crédito
            </div>
            <Link
              href="/admin/credito"
              className="text-accent text-xs font-semibold hover:underline"
            >
              consultar →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Total" value={String(health.credito.total)} />
            <MiniStat
              label="Consultas 24h"
              value={String(health.credito.consultas24h)}
            />
            <MiniStat
              label="Consultas 30d"
              value={String(health.credito.consultas30d)}
            />
            <MiniStat
              label="Docs únicos"
              value={String(health.credito.docs_unicos)}
            />
            <MiniStat
              label="Risco alto/crítico"
              value={String(health.credito.risco_alto)}
              tone={health.credito.risco_alto > 0 ? "warn" : "default"}
            />
            <MiniStat
              label="Stub (sem provedor)"
              value={String(health.credito.stub_total)}
              tone={
                health.credito.stub_total > 0 &&
                health.credito.stub_total === health.credito.total
                  ? "warn"
                  : "default"
              }
            />
          </div>
          {health.credito.stub_total > 0 &&
            health.credito.stub_total === health.credito.total && (
              <p className="text-[11px] text-warn mt-3">
                Todas as consultas usam o provedor stub. Configure
                CREDIT_PROVIDER_API_KEY para integrar Serasa/Boavista de verdade.
              </p>
            )}
        </section>

        {/* === API EXTERNA / WEBHOOKS DE COBRANÇA === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              API externa dos fundos
            </div>
            <Link
              href="/admin/api-docs"
              className="text-accent text-xs font-semibold hover:underline"
            >
              docs →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat
              label="Keys ativas"
              value={String(health.apiKeys.ativas)}
            />
            <MiniStat
              label="Revogadas"
              value={String(health.apiKeys.revogadas)}
            />
            <MiniStat
              label="Usadas 24h"
              value={String(health.apiKeys.usadas24h)}
            />
            <MiniStat
              label="Nunca usadas"
              value={String(health.apiKeys.nunca_usadas)}
              tone={health.apiKeys.nunca_usadas > 0 ? "warn" : "default"}
            />
            <MiniStat
              label="Último uso"
              value={health.apiKeys.ultimo_uso ? timeAgo(health.apiKeys.ultimo_uso) : "—"}
            />
            <MiniStat
              label="Subs cobrança"
              value={`${health.webhooks.subscriptions.ativas}/${health.webhooks.subscriptions.total}`}
            />
          </div>
        </section>

        {/* === CONVITES DE COMPRADOR === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            convites de coleta · comprador
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat
              label="Aguardando"
              value={String(health.compradorTokens.aguardando)}
            />
            <MiniStat
              label="Preenchidos"
              value={String(health.compradorTokens.preenchidos)}
              tone="success"
            />
            <MiniStat
              label="Expirados"
              value={String(health.compradorTokens.expirados)}
              tone={health.compradorTokens.expirados > 0 ? "warn" : "default"}
            />
            <MiniStat
              label="Total"
              value={String(health.compradorTokens.total)}
            />
            <MiniStat
              label="Criados 7d"
              value={String(health.compradorTokens.criados7d)}
            />
            <MiniStat
              label="Conversão"
              value={
                health.compradorTokens.total > 0
                  ? `${Math.round((health.compradorTokens.preenchidos / health.compradorTokens.total) * 100)}%`
                  : "—"
              }
            />
          </div>
        </section>

        {/* === MURAL & REPOSITÓRIO === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            mural & repositório
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <div className="text-xs font-semibold text-fg-muted">
                  Mural de recados
                </div>
                <Link
                  href="/admin/mural"
                  className="text-accent text-[10px] font-semibold hover:underline"
                >
                  abrir →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat
                  label="Ativos"
                  value={String(health.mural.ativos)}
                />
                <MiniStat label="Total" value={String(health.mural.total)} />
                <MiniStat
                  label="Expirados ativos"
                  value={String(health.mural.expirados_ativos)}
                  tone={
                    health.mural.expirados_ativos > 0 ? "warn" : "default"
                  }
                />
                <MiniStat
                  label="Último em"
                  value={health.mural.ultimo_em ? timeAgo(health.mural.ultimo_em) : "—"}
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-fg-muted mb-2">
                Repositório (uploads admin)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat
                  label="Arquivos"
                  value={String(health.repositorio.total)}
                />
                <MiniStat
                  label="Criados 7d"
                  value={String(health.repositorio.criados7d)}
                />
                <MiniStat
                  label="Tamanho"
                  value={formatBytes(health.repositorio.bytes)}
                />
                <MiniStat
                  label="Solicitações pend."
                  value={String(health.docsSol.pendentes)}
                  tone={
                    health.docsSol.pendentes_7d_plus > 0 ? "warn" : "default"
                  }
                />
              </div>
            </div>
          </div>
          {health.docsSol.pendentes_7d_plus > 0 && (
            <p className="text-[11px] text-warn mt-3">
              {health.docsSol.pendentes_7d_plus} solicitação(ões) de documento
              pendente(s) há mais de 7 dias.
            </p>
          )}
        </section>

        {/* === Tamanho das tabelas === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 lg:col-span-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            tamanho das tabelas (qtd de linhas)
          </div>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {health.tables.map((t) => (
              <li
                key={t.nome}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg border border-border"
              >
                <span className="text-xs font-mono text-fg-muted">
                  {t.nome}
                </span>
                <span className="font-mono tabular text-sm font-bold text-fg">
                  {t.qtd.toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const styles =
    tone === "danger"
      ? "border-danger/40 bg-red-50"
      : tone === "warn"
        ? "border-warn/40 bg-yellow-50"
        : tone === "success"
          ? "border-success/40 bg-green-50"
          : "border-border bg-bg-elev";
  return (
    <div className={`rounded-2xl border p-4 md:p-5 ${styles}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] mb-2 ${
          tone === "danger"
            ? "text-danger"
            : tone === "warn"
              ? "text-warn"
              : tone === "success"
                ? "text-success"
                : "text-fg-dim"
        }`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight text-fg leading-tight break-words">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] md:text-xs text-fg-muted mt-1">{sub}</div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const valueCls =
    tone === "danger"
      ? "text-danger"
      : tone === "warn"
        ? "text-warn"
        : tone === "success"
          ? "text-success"
          : "text-fg";
  return (
    <div className="rounded-lg border border-border bg-bg p-2.5">
      <div className="text-[10px] uppercase tracking-[0.15em] text-fg-dim font-mono mb-1">
        {label}
      </div>
      <div className={`font-mono tabular text-base font-bold ${valueCls}`}>
        {value}
      </div>
    </div>
  );
}
