import Link from "next/link";
import { PainelShell } from "@/components/painel-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { ComercialChartsClient } from "@/components/comercial-charts-client";
import {
  getCurrentComercial,
  getComercialDashboard,
} from "@/lib/actions/comerciais";
import { formatBRL } from "@/lib/format";
import type { User } from "@/db/schema";

export async function ComercialDashboard({ user }: { user: User }) {
  const comercial = await getCurrentComercial();
  if (!comercial) {
    return (
      <PainelShell role="comercial" userName={user.nome} active="/painel">
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-10 text-center">
          <h1 className="text-xl font-bold text-warn mb-2">
            Comercial não vinculado
          </h1>
          <p className="text-fg-muted">
            Sua conta ainda não está vinculada a nenhum cadastro comercial.
            Avise o admin pra completar a configuração.
          </p>
        </div>
      </PainelShell>
    );
  }

  const data = await getComercialDashboard(comercial.id);
  const ultimas = data.operacoes.slice(0, 8);

  return (
    <PainelShell role="comercial" userName={user.nome} active="/painel">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel comercial</div>
        <h1 className="text-display-md">
          Olá,{" "}
          <span className="text-gradient-blue">
            {comercial.apelido ?? comercial.nomeCompleto}
          </span>
        </h1>
        <p className="mt-2 text-fg-muted">
          Suas operações, comissão acumulada e parceiros sob sua
          responsabilidade.
        </p>
      </div>

      {/* KPIs financeiros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Comissão acumulada"
          value={formatBRL(data.totals.comissaoAcumulada)}
          sub={`Realizada: ${formatBRL(data.totals.comissaoRealizada)}`}
          highlight
        />
        <Stat
          label="A receber"
          value={formatBRL(data.totals.comissaoPendente)}
          sub="ops aprovadas, ainda não liquidadas"
          tone="success"
        />
        <Stat
          label="Faturado no mês"
          value={formatBRL(data.totals.faturadoNoMes)}
          sub="parcelas pagas neste mês"
        />
        <Stat
          label="Inadimplência"
          value={formatBRL(data.totals.valorVencido)}
          sub="parcelas vencidas em aberto"
          tone="danger"
        />
      </div>

      {/* KPIs operacionais */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat
          label="Operações"
          value={String(data.totals.qtdOperacoes)}
          sub="total sob sua responsabilidade"
        />
        <Stat
          label="Construtoras"
          value={String(data.totals.qtdConstrutoras)}
          sub="distintas atendidas"
        />
        <Stat
          label="A vencer"
          value={formatBRL(data.totals.valorAVencer)}
          sub="parcelas em aberto"
        />
      </div>

      {/* Charts */}
      <div className="mb-8">
        <ComercialChartsClient porMes={data.porMes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Últimas operações */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-bold tracking-tight">Operações recentes</h2>
            <Link
              href="/painel/daily"
              className="text-accent text-xs font-semibold hover:underline"
            >
              Ver Daily completo →
            </Link>
          </div>
          {ultimas.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-8">
              Nenhuma operação ainda sob sua responsabilidade.
            </p>
          ) : (
            <ul className="space-y-2">
              {ultimas.map((op) => (
                <li
                  key={op.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-border bg-bg hover:border-accent transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/painel/daily?periodo=&construtoraId=${op.construtoraId ?? ""}`}
                      className="font-mono text-sm font-semibold text-fg hover:text-accent"
                    >
                      {op.numero}
                    </Link>
                    <div className="text-[11px] text-fg-muted truncate">
                      {op.construtoraNome ?? "—"} ·{" "}
                      {op.imobiliariaNome ?? op.corretorNome ?? "—"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono tabular text-sm text-fg font-semibold">
                      {formatBRL(parseFloat(op.valorPresente))}
                    </div>
                    <OperacaoStatusBadge status={op.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top construtoras */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            top construtoras
          </div>
          {data.construtoras.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-4">
              Nenhuma ainda.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {data.construtoras.slice(0, 8).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg border border-border"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-fg font-semibold truncate">
                      {c.nome}
                    </div>
                    <div className="text-[10px] text-fg-muted">
                      {c.qtd} {c.qtd === 1 ? "operação" : "operações"}
                    </div>
                  </div>
                  <span className="font-mono tabular text-xs text-fg-muted shrink-0">
                    {formatBRL(c.valorOperado)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PainelShell>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warn" | "danger";
  highlight?: boolean;
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : tone === "success"
        ? "border-success/40 bg-green-50"
        : tone === "danger"
          ? "border-danger/40 bg-red-50"
          : "border-border bg-bg-elev";
  const labelColor = highlight
    ? "text-accent"
    : tone === "warn"
      ? "text-warn"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : "text-fg-dim";
  return (
    <div className={`rounded-2xl border p-4 md:p-5 ${baseClass}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] mb-2 ${labelColor}`}
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
