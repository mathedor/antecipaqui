import { ACTION_LABEL, type AuditLogWithUser } from "@/lib/audit";

function fmtDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Administrador",
};

function actionTone(action: string): "default" | "warn" | "success" | "danger" {
  if (action.startsWith("block") || action === "reject_user") return "danger";
  if (action.startsWith("unblock") || action === "approve_user") return "success";
  if (action.startsWith("change_status") || action === "edit_operacao")
    return "warn";
  if (action === "login") return "default";
  return "default";
}

export function AuditLogTimeline({
  logs,
  emptyLabel = "Sem registros ainda.",
}: {
  logs: AuditLogWithUser[];
  emptyLabel?: string;
}) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-fg-muted text-center py-6">{emptyLabel}</p>
    );
  }
  return (
    <ol className="space-y-3">
      {logs.map((l) => {
        const tone = actionTone(l.action);
        const dotCls =
          tone === "danger"
            ? "bg-danger"
            : tone === "success"
              ? "bg-success"
              : tone === "warn"
                ? "bg-warn"
                : "bg-accent";
        return (
          <li key={l.id} className="flex gap-3 text-sm">
            <span
              className={`mt-1.5 size-2 rounded-full shrink-0 ${dotCls}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <span className="font-semibold text-fg">
                  {ACTION_LABEL[l.action] ?? l.action}
                </span>
                <span className="font-mono text-[10px] text-fg-dim">
                  {fmtDateTime(l.createdAt)}
                </span>
              </div>
              {l.targetLabel && (
                <div className="text-xs text-fg-muted">
                  {l.targetLabel}
                </div>
              )}
              {l.userId && (
                <div className="text-[11px] text-fg-dim font-mono mt-0.5">
                  por {l.userNome ?? l.userEmail ?? "—"}
                  {l.userRole && (
                    <>
                      {" · "}
                      <span className="text-fg-muted">
                        {ROLE_LABEL[l.userRole] ?? l.userRole}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
