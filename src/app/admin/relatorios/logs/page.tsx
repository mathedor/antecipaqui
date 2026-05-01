import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import {
  getAuditLogsForViewer,
  getDistinctAuditActions,
} from "@/lib/actions/reports-extra";

export const metadata = { title: "Admin · Logs de auditoria" };

const ACTION_TONE: Record<string, string> = {
  login: "bg-bg-card text-fg-dim border-border",
  view_user: "bg-bg-card text-fg-muted border-border",
  view_construtora: "bg-bg-card text-fg-muted border-border",
  delete_user: "bg-red-50 text-danger border-danger/40",
  delete_construtora: "bg-red-50 text-danger border-danger/40",
  block_user: "bg-yellow-50 text-warn border-yellow-200",
  unblock_user: "bg-green-50 text-success border-green-200",
  block_construtora: "bg-yellow-50 text-warn border-yellow-200",
  change_status: "bg-accent-soft text-accent border-accent/30",
  upload_repositorio_file: "bg-accent-soft text-accent border-accent/30",
  delete_repositorio_file: "bg-yellow-50 text-warn border-yellow-200",
  approve_user: "bg-green-50 text-success border-green-200",
  approve_construtora: "bg-green-50 text-success border-green-200",
  self_edit_profile: "bg-accent-soft text-accent border-accent/30",
};

function tone(action: string) {
  if (ACTION_TONE[action]) return ACTION_TONE[action];
  if (action.includes("delete")) return "bg-red-50 text-danger border-danger/40";
  if (action.includes("error") || action.includes("failed"))
    return "bg-red-50 text-danger border-danger/40";
  if (action.includes("create") || action.includes("upload"))
    return "bg-accent-soft text-accent border-accent/30";
  if (action.includes("update") || action.includes("edit"))
    return "bg-accent-soft text-accent border-accent/30";
  if (action.includes("approve") || action.includes("unblock"))
    return "bg-green-50 text-success border-green-200";
  if (action.includes("block") || action.includes("reject"))
    return "bg-yellow-50 text-warn border-yellow-200";
  return "bg-bg-card text-fg-muted border-border";
}

type Search = {
  searchParams: Promise<{
    action?: string;
    targetType?: string;
    userId?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function AdminLogsPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const [logs, distinctActions] = await Promise.all([
    getAuditLogsForViewer(params),
    getDistinctAuditActions(),
  ]);

  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">auditoria</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Logs</span> de auditoria
        </h1>
        <p className="mt-2 text-fg-muted">
          {logs.length} {logs.length === 1 ? "evento" : "eventos"} no resultado
          (limite 200, ordem decrescente)
        </p>
      </div>

      {/* Filtros */}
      <form
        method="get"
        className="rounded-2xl border border-border bg-bg-elev p-5 mb-6 grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <Field label="Ação">
          <select name="action" defaultValue={params.action ?? ""} className="form-input">
            <option value="">Todas</option>
            {distinctActions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action} ({a.qtd})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de alvo">
          <select
            name="targetType"
            defaultValue={params.targetType ?? ""}
            className="form-input"
          >
            <option value="">Todos</option>
            <option value="user">Usuário</option>
            <option value="construtora">Construtora</option>
            <option value="operacao">Operação</option>
            <option value="ticket">Ticket</option>
            <option value="mural">Mural</option>
          </select>
        </Field>
        <Field label="Usuário (ID Clerk)">
          <input
            name="userId"
            defaultValue={params.userId ?? ""}
            placeholder="user_xxx"
            className="form-input font-mono text-xs"
          />
        </Field>
        <Field label="De">
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ""}
            className="form-input"
          />
        </Field>
        <Field label="Até">
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ""}
            className="form-input"
          />
        </Field>
        <div className="col-span-2 md:col-span-5 flex items-center gap-2">
          <button type="submit" className="btn-primary !h-10 !px-5">
            Filtrar
          </button>
          <Link
            href="/admin/relatorios/logs"
            className="text-fg-muted hover:text-fg text-sm"
          >
            limpar
          </Link>
        </div>
      </form>

      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <p className="text-fg-muted">Nenhum evento com esses filtros.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-bg-card border-b border-border">
              <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
                <th className="px-4 py-3 text-left">Quando</th>
                <th className="px-4 py-3 text-left">Quem</th>
                <th className="px-4 py-3 text-left">Ação</th>
                <th className="px-4 py-3 text-left">Alvo</th>
                <th className="px-4 py-3 text-left">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-border last:border-0 hover:bg-bg-card transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-[10px] text-fg-dim whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="text-fg truncate max-w-[200px]">
                      {l.user_email ?? "—"}
                    </div>
                    {l.user_role && (
                      <div className="text-[10px] font-mono text-fg-dim">
                        {l.user_role}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono ${tone(l.action)}`}
                    >
                      {l.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {l.target_type && (
                      <div className="text-fg-muted text-[10px] font-mono uppercase">
                        {l.target_type}
                      </div>
                    )}
                    {l.target_label && (
                      <div className="text-fg truncate max-w-[200px]">
                        {l.target_label}
                      </div>
                    )}
                    {l.target_id && (
                      <div className="text-[10px] font-mono text-fg-dim truncate max-w-[180px]">
                        {l.target_id.slice(0, 18)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted">
                    {l.metadata && Object.keys(l.metadata).length > 0 ? (
                      <details>
                        <summary className="cursor-pointer text-accent">
                          ver metadata
                        </summary>
                        <pre className="mt-2 text-[10px] font-mono whitespace-pre-wrap max-w-[250px]">
                          {JSON.stringify(l.metadata, null, 2)}
                        </pre>
                      </details>
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
    </AdminShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}
