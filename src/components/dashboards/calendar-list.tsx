import Link from "next/link";
import { formatBRLcompact } from "@/lib/format";

type CalItem = {
  data: string; // YYYY-MM-DD
  valor: number;
  contrapartes: string[];
  qtd: number;
  href?: string;
  tone: "vencer" | "vencido" | "pago";
};

const WEEKDAY_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function diasAte(s: string): number {
  const target = parseLocalDate(s);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

function dateLabel(s: string): { dia: string; mes: string; weekday: string } {
  const d = parseLocalDate(s);
  return {
    dia: String(d.getDate()).padStart(2, "0"),
    mes: d.toLocaleString("pt-BR", { month: "short" }).replace(".", ""),
    weekday: WEEKDAY_PT[d.getDay()] ?? "",
  };
}

/** Calendário cronológico simples — agrupa por dia, mostra valor + contrapartes. */
export function CalendarList({
  items,
  title,
  emptyText,
  href,
  hrefLabel = "ver tudo",
  highlightToday = true,
  limit = 14,
}: {
  items: CalItem[];
  title: string;
  emptyText: string;
  href?: string;
  hrefLabel?: string;
  highlightToday?: boolean;
  limit?: number;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-2">
          {title}
        </div>
        <p className="text-sm text-fg-muted">{emptyText}</p>
      </section>
    );
  }

  const display = items.slice(0, limit);
  const total = items.reduce((s, i) => s + i.valor, 0);

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
            {title}
          </div>
          <h3 className="font-bold tracking-tight text-base">
            {formatBRLcompact(total)} em{" "}
            <span className="text-fg-muted font-normal">
              {items.length} {items.length === 1 ? "data" : "datas"}
            </span>
          </h3>
        </div>
        {href && (
          <Link
            href={href}
            className="text-accent text-xs font-semibold hover:underline shrink-0"
          >
            {hrefLabel} →
          </Link>
        )}
      </div>
      <ul className="space-y-1.5">
        {display.map((it) => {
          const d = dateLabel(it.data);
          const dt = diasAte(it.data);
          const isToday = dt === 0;
          const isPast = dt < 0;
          const toneCls =
            it.tone === "vencido" || isPast
              ? "bg-red-50 border-danger/30"
              : isToday && highlightToday
                ? "bg-accent-soft border-accent/40"
                : "bg-bg border-border";
          const relLabel =
            dt === 0
              ? "hoje"
              : dt === 1
                ? "amanhã"
                : dt === -1
                  ? "ontem"
                  : dt < 0
                    ? `${Math.abs(dt)}d atrás`
                    : `em ${dt}d`;
          return (
            <li
              key={it.data}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${toneCls}`}
            >
              <div className="text-center w-12 shrink-0">
                <div className="font-mono tabular text-lg font-bold text-fg leading-none">
                  {d.dia}
                </div>
                <div className="font-mono text-[9px] uppercase text-fg-dim leading-tight">
                  {d.mes}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-fg truncate">
                  {it.contrapartes.slice(0, 2).join(", ")}
                  {it.contrapartes.length > 2 &&
                    ` +${it.contrapartes.length - 2}`}
                </div>
                <div className="font-mono text-[10px] text-fg-muted">
                  {d.weekday} · {relLabel} · {it.qtd}{" "}
                  {it.qtd === 1 ? "parcela" : "parcelas"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`font-mono tabular text-sm font-bold ${
                    it.tone === "vencido" || isPast
                      ? "text-danger"
                      : isToday
                        ? "text-accent"
                        : "text-fg"
                  }`}
                >
                  {formatBRLcompact(it.valor)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {items.length > display.length && (
        <p className="text-[11px] text-fg-muted mt-3">
          +{items.length - display.length} data(s) seguinte(s) não mostrada(s).
        </p>
      )}
    </section>
  );
}
