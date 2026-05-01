import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { getSystemHealth } from "@/lib/actions/reports-extra";

export const metadata = { title: "Admin · Saúde do sistema" };

const ENV_LABELS: Record<string, string> = {
  blobToken: "Vercel Blob (BLOB_READ_WRITE_TOKEN)",
  databaseUrl: "Postgres (DATABASE_URL)",
  clerkSecretKey: "Clerk auth (CLERK_SECRET_KEY)",
  resendApiKey: "Resend email (RESEND_API_KEY)",
  twilioSid: "Twilio SMS (TWILIO_ACCOUNT_SID)",
  zapsignToken: "ZapSign (ZAPSIGN_API_TOKEN)",
  siteUrl: "Site URL (NEXT_PUBLIC_SITE_URL)",
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

  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">monitoramento</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Saúde</span> do sistema
        </h1>
        <p className="mt-2 text-fg-muted">
          Configuração de env, atividade recente e erros detectados nos audit
          logs.
        </p>
      </div>

      {/* === KPIs === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="Env vars"
          value={`${envOk}/${envTotal}`}
          sub={envOk === envTotal ? "tudo configurado" : "faltam configurações"}
          tone={envOk === envTotal ? "success" : "warn"}
        />
        <KpiCard
          label="Eventos hoje"
          value={String(health.todayQty)}
          sub={`média 7d: ${health.avg7d.toFixed(0)} (${trendUp ? "+" : ""}${trend}%)`}
        />
        <KpiCard
          label="Erros detectados"
          value={String(health.errors.length)}
          sub="últimos 30 eventos com 'error'/'failed'"
          tone={health.errors.length > 0 ? "danger" : "success"}
        />
        <KpiCard
          label="Sessões 24h"
          value={String(health.sessoes24h)}
          sub="usuários distintos com login"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* === Env vars === */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            configuração de env vars
          </div>
          <ul className="space-y-2">
            {envEntries.map(([key, ok]) => (
              <li
                key={key}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
                  ok
                    ? "border-success/30 bg-green-50"
                    : "border-danger/30 bg-red-50"
                }`}
              >
                <span className="text-sm text-fg truncate">
                  {ENV_LABELS[key]}
                </span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                    ok ? "text-success" : "text-danger"
                  }`}
                >
                  {ok ? "✓ ok" : "✕ ausente"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-fg-muted">
            ✕ ausente significa que o serviço relacionado vai falhar. Configure
            no Vercel → Settings → Environment Variables.
          </p>
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
              Ver logs completos →
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

        {/* === Erros detectados === */}
        <section className="rounded-2xl border border-danger/30 bg-red-50 p-5 md:p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-danger">
              erros detectados nos logs
            </div>
            <span className="text-xs text-fg-muted">
              últimos 30 eventos com action ~ 'error|failed|fail|erro' OU metadata
              contendo "error"
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
                    <tr key={e.id} className="border-b border-danger/20 last:border-0">
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
                <span className="text-xs font-mono text-fg-muted">{t.nome}</span>
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
      {sub && <div className="text-[10px] md:text-xs text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
