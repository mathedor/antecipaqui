import { formatBRLcompact } from "@/lib/format";

type Stage = {
  key: string;
  label: string;
  count: number;
  amount: number;
  tone: "info" | "warn" | "success" | "default";
};

/** Pipeline visual horizontal — barra com proporção por stage. */
export function PipelineFunnel({ stages }: { stages: Stage[] }) {
  const totalCount = stages.reduce((s, st) => s + st.count, 0);
  const totalAmount = stages.reduce((s, st) => s + st.amount, 0);

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
            pipeline · estado atual
          </div>
          <h2 className="font-bold tracking-tight text-lg">
            {totalCount} operação(ões) ativa(s) · {formatBRLcompact(totalAmount)} em movimento
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {stages.map((s) => {
          const cls =
            s.tone === "success"
              ? "border-success/40 bg-green-50"
              : s.tone === "warn"
                ? "border-warn/40 bg-yellow-50"
                : s.tone === "info"
                  ? "border-accent/30 bg-accent-soft"
                  : "border-border bg-bg-card";
          const labelCls =
            s.tone === "success"
              ? "text-success"
              : s.tone === "warn"
                ? "text-warn"
                : s.tone === "info"
                  ? "text-accent"
                  : "text-fg-dim";
          return (
            <div
              key={s.key}
              className={`rounded-xl border p-3 ${cls}`}
            >
              <div
                className={`font-mono text-[9px] uppercase tracking-wider mb-1 ${labelCls}`}
              >
                {s.label}
              </div>
              <div className="font-mono tabular text-xl font-bold text-fg leading-none">
                {s.count}
              </div>
              <div className="text-[10px] text-fg-muted mt-0.5 truncate">
                {formatBRLcompact(s.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
