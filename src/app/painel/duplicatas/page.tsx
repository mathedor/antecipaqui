import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import {
  getConstrutoraByOwnerId,
  getDuplicatasParaPagar,
} from "@/lib/actions/operacoes";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Duplicatas",
};

const STATUS = {
  a_vencer: {
    label: "A vencer",
    className: "bg-bg-soft text-fg-muted border-border",
  },
  vencida: {
    label: "Vencida",
    className: "bg-red-50 text-danger border-red-200",
  },
  paga: {
    label: "Paga",
    className: "bg-green-50 text-success border-green-200",
  },
} as const;

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function isOverdue(vencimento: string, status: string) {
  if (status !== "a_vencer") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const v = new Date(vencimento + "T00:00:00");
  return v < today;
}

export default async function DuplicatasPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  if (user.role !== "construtora") {
    redirect("/painel");
  }

  const construtora = await getConstrutoraByOwnerId(user.id);
  if (!construtora) {
    redirect("/painel/onboarding");
  }

  const duplicatas = await getDuplicatasParaPagar(construtora.id);

  // Agrupar por mês de vencimento
  const grupos = new Map<string, typeof duplicatas>();
  for (const d of duplicatas) {
    const key = d.vencimento.slice(0, 7); // YYYY-MM
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(d);
  }

  const totals = {
    aPagar: duplicatas
      .filter((d) => d.statusParcela === "a_vencer")
      .reduce((s, d) => s + parseFloat(d.valor), 0),
    vencidas: duplicatas
      .filter(
        (d) =>
          d.statusParcela === "vencida" ||
          isOverdue(d.vencimento, d.statusParcela),
      )
      .reduce((s, d) => s + parseFloat(d.valor), 0),
    pagas: duplicatas
      .filter((d) => d.statusParcela === "paga")
      .reduce((s, d) => s + parseFloat(d.pagoValor ?? d.valor), 0),
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:py-16 min-h-[60vh]">
      <Link
        href="/painel"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← painel
      </Link>

      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-display-md">
            <span className="text-gradient-blue">Duplicatas</span> a pagar
          </h1>
          <p className="mt-2 text-fg-muted">
            Cronograma das parcelas que você deve pra Antecipaqui pelas
            comissões antecipadas dos corretores.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="A vencer" value={formatBRL(totals.aPagar)} />
        <Stat label="Vencidas" value={formatBRL(totals.vencidas)} tone="warn" />
        <Stat label="Já pagas" value={formatBRL(totals.pagas)} />
      </div>

      {duplicatas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-5xl mb-3">📭</div>
          <h2 className="text-xl font-bold">Nenhuma duplicata pendente</h2>
          <p className="mt-2 text-fg-muted">
            Quando uma operação vinculada à sua construtora for aprovada, as
            parcelas aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grupos.entries()).map(([month, items]) => (
            <div
              key={month}
              className="rounded-2xl border border-border bg-bg-elev overflow-hidden"
            >
              <div className="px-6 py-3 bg-bg-card border-b border-border flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-fg-muted">
                  {new Date(month + "-01T00:00:00").toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="font-mono tabular text-sm text-fg-muted">
                  {formatBRL(
                    items.reduce((s, i) => s + parseFloat(i.valor), 0),
                  )}
                </span>
              </div>
              <ul>
                {items.map((d) => {
                  const overdue = isOverdue(d.vencimento, d.statusParcela);
                  const effectiveStatus = overdue ? "vencida" : d.statusParcela;
                  const s =
                    STATUS[effectiveStatus as keyof typeof STATUS] ?? STATUS.a_vencer;
                  return (
                    <li
                      key={d.parcelaId}
                      className="border-b border-border last:border-0"
                    >
                      <Link
                        href={`/painel/operacoes/${d.operacaoId}`}
                        className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-bg-card transition-colors items-center"
                      >
                        <div className="col-span-1 font-mono text-xs text-fg-dim">
                          #{String(d.numero).padStart(2, "0")}
                        </div>
                        <div className="col-span-3 md:col-span-2 text-sm text-fg">
                          {formatDate(d.vencimento)}
                        </div>
                        <div className="hidden md:block col-span-3 font-mono text-sm text-fg-muted truncate">
                          op {d.operacaoNumero}
                        </div>
                        <div className="hidden md:block col-span-2 text-sm text-fg-muted truncate">
                          {d.corretorNome ?? "—"}
                        </div>
                        <div className="col-span-5 md:col-span-2 text-right font-mono tabular text-sm text-fg font-semibold">
                          {formatBRL(parseFloat(d.valor))}
                        </div>
                        <div className="col-span-3 md:col-span-2 flex justify-end">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-wider font-mono font-semibold ${s.className}`}
                          >
                            <span className="size-1.5 rounded-full bg-current" />
                            {s.label}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  const isWarn = tone === "warn";
  return (
    <div
      className={`rounded-2xl border p-5 ${
        isWarn ? "border-warn/40 bg-yellow-50" : "border-border bg-bg-elev"
      }`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-2 ${
          isWarn ? "text-warn" : "text-fg-dim"
        }`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-2xl md:text-3xl font-bold tracking-tight text-fg">
        {value}
      </div>
    </div>
  );
}
