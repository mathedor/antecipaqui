import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { listImpersonationHistorico } from "@/lib/actions/admin-impersonate";

export const metadata = { title: "Admin · Histórico de impersonations" };
export const dynamic = "force-dynamic";

const ROLE_COLOR: Record<string, string> = {
  corretor: "bg-blue-100 text-blue-700",
  imobiliaria: "bg-indigo-100 text-indigo-700",
  construtora: "bg-orange-100 text-orange-700",
  fundo: "bg-purple-100 text-purple-700",
  comercial: "bg-green-100 text-green-700",
};

function fmtDT(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(min: number | null): string {
  if (min == null) return "em aberto";
  if (min < 1) return "<1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? `${m}m` : ""}`;
}

export default async function HistoricoPage() {
  const admin = await requireAdmin();
  const historico = await listImpersonationHistorico(100);

  const totalAcoes = historico.reduce((s, h) => s + h.acoesExecutadas, 0);
  const totalSessoes = historico.length;
  const usersDistintos = new Set(historico.map((h) => h.targetId)).size;

  return (
    <AdminShell active="/admin/visao" userName={admin.nome}>
      <div className="mb-6 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <Link
            href="/admin/visao"
            className="text-xs text-fg-muted hover:text-accent"
          >
            ← visualizar como
          </Link>
          <div className="eyebrow mt-2 mb-2">histórico · auditoria</div>
          <h1 className="text-display-md">
            Seu{" "}
            <span className="text-gradient-blue">histórico de visões</span>
          </h1>
          <p className="mt-2 text-fg-muted max-w-2xl">
            Toda vez que você abriu "ver como" alguém, com duração e quantas
            ações foram executadas. Tudo auditado pra compliance.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Kpi label="Sessões" value={String(totalSessoes)} />
        <Kpi
          label="Users distintos"
          value={String(usersDistintos)}
          tone="info"
        />
        <Kpi
          label="Ações executadas"
          value={String(totalAcoes)}
          tone={totalAcoes > 0 ? "warn" : "default"}
        />
      </div>

      {historico.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">👁</div>
          <h2 className="text-xl font-bold">Sem histórico ainda</h2>
          <p className="mt-2 text-fg-muted">
            Vá em "Visualizar como" e impersone alguém pra começar.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-card border-b border-border">
              <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim font-mono">
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3 text-center">Role</th>
                <th className="px-4 py-3 text-right">Duração</th>
                <th className="px-4 py-3 text-right">Ações</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h, i) => (
                <tr
                  key={i}
                  className="border-b border-border last:border-0 hover:bg-bg-card/30"
                >
                  <td className="px-4 py-3 font-mono text-xs text-fg-muted whitespace-nowrap">
                    {fmtDT(h.startedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-fg">
                      {h.targetNome ?? h.targetEmail}
                    </div>
                    <div className="text-[10px] text-fg-muted font-mono">
                      {h.targetEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        ROLE_COLOR[h.targetRole] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {h.targetRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular text-fg">
                    {fmtDuration(h.durationMin)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono tabular ${
                      h.acoesExecutadas > 0
                        ? "text-warn font-semibold"
                        : "text-fg-dim"
                    }`}
                  >
                    {h.acoesExecutadas}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/relatorios/logs?action=&userId=${h.targetId}`}
                      className="text-xs text-accent hover:underline"
                      title="ver logs do user"
                    >
                      logs →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-fg-muted mt-4">
        Mostrando até 100 últimas sessões. Cada ação executada durante uma
        sessão tem <code>metadata.impersonatedBy</code> apontando pra você no{" "}
        <Link
          href="/admin/relatorios/logs"
          className="text-accent hover:underline"
        >
          audit log
        </Link>
        .
      </p>
    </AdminShell>
  );
}

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "info" | "warn";
}) {
  const cls =
    tone === "warn"
      ? "border-warn/40 bg-yellow-50 text-warn"
      : tone === "info"
        ? "border-accent/30 bg-accent-soft text-accent"
        : "border-border bg-bg-elev text-fg-dim";
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="font-mono text-[10px] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="font-mono tabular text-2xl font-bold text-fg">
        {value}
      </div>
    </div>
  );
}
