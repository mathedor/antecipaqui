import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getOperacaoDetail } from "@/lib/actions/operacoes";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { formatBRL, formatPercent } from "@/lib/format";

export const metadata = {
  title: "Detalhe da operação",
};

type Params = { params: Promise<{ id: string }> };

const PARCELA_LABEL: Record<string, { label: string; tone: string }> = {
  a_vencer: { label: "A vencer", tone: "muted" },
  vencida: { label: "Vencida", tone: "warn" },
  paga: { label: "Paga", tone: "success" },
};

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function OperacaoDetailPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  const op = await getOperacaoDetail(id, user.id);
  if (!op) notFound();

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <Link
        href="/painel/operacoes"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← operações
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-display-md font-mono">{op.numero}</h1>
            <OperacaoStatusBadge status={op.status} />
          </div>
          <p className="text-fg-muted">
            Criada em{" "}
            {new Date(op.createdAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {op.status === "recusada" && op.motivoRecusa && (
        <div className="rounded-2xl border border-danger/40 bg-red-50 p-5 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-danger mb-2">
            motivo da recusa
          </div>
          <p className="text-fg">{op.motivoRecusa}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Coluna principal — dados */}
        <div className="lg:col-span-7 space-y-5">
          <Card title="Construtora" subtitle="A devedora da comissão">
            <div className="text-xl font-bold tracking-tight">
              {op.construtoraNome ?? "—"}
            </div>
            <div className="mt-1 font-mono text-xs text-fg-muted">
              CNPJ {op.construtoraCnpj ?? "—"}
            </div>
          </Card>

          <Card title="Dados da venda">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Data da venda" value={formatDate(op.dataVenda)} />
              <Field
                label="Valor da venda"
                value={formatBRL(parseFloat(op.valorVenda))}
              />
              <Field
                label="Comissão total"
                value={formatBRL(parseFloat(op.valorComissao))}
                highlight
              />
              <Field
                label="Número de parcelas"
                value={`${op.numeroParcelas}x`}
              />
            </div>
          </Card>

          <Card title="Cronograma de parcelas">
            <ul className="space-y-2">
              {op.parcelas.map((p) => {
                const parcela =
                  PARCELA_LABEL[p.status] ?? PARCELA_LABEL.a_vencer;
                return (
                  <li
                    key={p.id}
                    className="grid grid-cols-12 gap-3 items-center py-2.5 border-b border-border last:border-0"
                  >
                    <span className="col-span-2 font-mono text-xs text-fg-dim">
                      {String(p.numero).padStart(2, "0")}
                    </span>
                    <span className="col-span-4 text-sm text-fg">
                      {formatDate(p.vencimento)}
                    </span>
                    <span className="col-span-3 text-right font-mono tabular text-sm text-fg-muted">
                      {formatBRL(parseFloat(p.valor))}
                    </span>
                    <span
                      className={`col-span-3 text-right font-mono text-[10px] uppercase tracking-wider ${
                        parcela.tone === "success"
                          ? "text-success"
                          : parcela.tone === "warn"
                            ? "text-warn"
                            : "text-fg-dim"
                      }`}
                    >
                      {parcela.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* Coluna lateral — sumário financeiro */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 rounded-3xl bg-bg-dark text-fg-inverse p-7 md:p-9 relative overflow-hidden">
            <div className="absolute inset-0 bg-mesh-dark pointer-events-none" aria-hidden />
            <div className="relative">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-fg-inverse/70 mb-2">
                {op.status === "ativa" || op.status === "liquidada"
                  ? "você recebeu"
                  : "você recebe"}
              </div>
              <div className="font-mono tabular text-4xl md:text-5xl font-bold tracking-tight text-gradient-blue">
                {formatBRL(parseFloat(op.valorPresente))}
              </div>
              <div className="mt-1 text-fg-inverse/60 text-sm">
                taxa {formatPercent(parseFloat(op.taxaMensal))} a.m.
              </div>

              <div className="mt-7 pt-6 border-t border-white/10 space-y-3 text-sm">
                <Row
                  label="Comissão total"
                  value={formatBRL(parseFloat(op.valorComissao))}
                />
                <Row label="Diluído em" value={`${op.numeroParcelas}x`} />
                <Row
                  label="Deságio"
                  value={`− ${formatBRL(parseFloat(op.desagio))}`}
                  highlight="warn"
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
      <div className="mb-5">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-fg-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular ${
          highlight ? "text-fg text-lg font-semibold" : "text-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight = "default",
}: {
  label: string;
  value: string;
  highlight?: "default" | "muted" | "warn";
}) {
  const valueColor =
    highlight === "warn"
      ? "text-orange-300"
      : highlight === "muted"
        ? "text-fg-inverse/80"
        : "text-fg-inverse";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-fg-inverse/60 text-xs uppercase tracking-wider font-mono">
        {label}
      </span>
      <span className={`font-mono tabular ${valueColor}`}>{value}</span>
    </div>
  );
}
