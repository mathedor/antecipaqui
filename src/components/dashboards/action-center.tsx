import Link from "next/link";
import { formatBRLcompact } from "@/lib/format";

type ActionItem = {
  key: string;
  label: string;
  count: number;
  amount?: number;
  href: string;
  tone: "info" | "warn" | "danger";
  hint?: string;
};

/** Action Center: lista priorizada do que o user precisa resolver agora.
 *  Esconde se não tiver nada. */
export function ActionCenter({
  items,
  title = "Action center",
  subtitle,
}: {
  items: ActionItem[];
  title?: string;
  subtitle?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-success/30 bg-green-50 p-5 md:p-6 mb-6 flex items-center gap-3">
        <span className="text-2xl">✓</span>
        <div>
          <h2 className="font-bold text-success">Tudo em dia</h2>
          <p className="text-sm text-fg-muted">
            Sem ações pendentes no momento.
          </p>
        </div>
      </div>
    );
  }

  // Ordena por severidade (danger > warn > info)
  const ordered = [...items].sort((a, b) => {
    const sev = { danger: 0, warn: 1, info: 2 } as const;
    return sev[a.tone] - sev[b.tone];
  });
  const top = ordered.slice(0, 6);

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
            o que resolver agora
          </div>
          <h2 className="font-bold tracking-tight text-lg">{title}</h2>
          {subtitle && (
            <p className="text-xs text-fg-muted">{subtitle}</p>
          )}
        </div>
        <span className="text-[11px] font-mono text-fg-muted">
          {items.length}{" "}
          {items.length === 1 ? "pendência" : "pendências"} ativas
        </span>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {top.map((item) => {
          const toneCls =
            item.tone === "danger"
              ? "border-danger/40 bg-red-50 hover:border-danger"
              : item.tone === "warn"
                ? "border-warn/40 bg-yellow-50 hover:border-warn"
                : "border-accent/30 bg-accent-soft hover:border-accent";
          const badgeCls =
            item.tone === "danger"
              ? "bg-danger text-white"
              : item.tone === "warn"
                ? "bg-warn text-white"
                : "bg-accent text-white";
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${toneCls} transition-colors group`}
              >
                <span
                  className={`shrink-0 size-9 rounded-full ${badgeCls} flex items-center justify-center font-mono tabular text-sm font-bold`}
                >
                  {item.count}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-fg truncate">
                    {item.label}
                  </div>
                  {(item.amount != null || item.hint) && (
                    <div className="text-[11px] text-fg-muted truncate">
                      {item.amount != null && item.amount > 0
                        ? formatBRLcompact(item.amount)
                        : null}
                      {item.amount != null && item.amount > 0 && item.hint
                        ? " · "
                        : null}
                      {item.hint}
                    </div>
                  )}
                </div>
                <span className="text-fg-dim text-lg group-hover:translate-x-0.5 group-hover:text-fg transition-all shrink-0">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {ordered.length > top.length && (
        <p className="text-[11px] text-fg-muted mt-3">
          +{ordered.length - top.length} pendência(s) menos urgentes.
        </p>
      )}
    </section>
  );
}
