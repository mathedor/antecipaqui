import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import {
  getConstrutoraByOwnerId,
  getOperacoesByConstrutora,
  getOperacoesByCorretor,
} from "@/lib/actions/operacoes";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { PainelShell } from "@/components/painel-shell";
import {
  DateRangeFilter,
  OperacoesStatBoxes,
} from "@/components/operacoes-stats";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Operações",
};

const PENDENTE_STATUSES = [
  "aguardando_aprovacao",
  "documentos_incompletos",
];
const ATIVOS_STATUSES = [
  "aguardando_aprovacao",
  "documentos_incompletos",
  "pre_aprovada",
  "analise_final",
  "enviada_para_assinatura",
  "enviada_para_pagamento",
  "realizada",
];

type Search = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function OperacoesPage({ searchParams }: Search) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  const isConstrutora = user.role === "construtora";
  const { from, to } = await searchParams;

  let allOps: Array<{
    id: string;
    numero: string;
    status: string;
    valorComissao: string;
    valorPresente: string;
    counterpartyLabel: string | null;
    createdAt: Date | string;
  }> = [];

  if (isConstrutora) {
    const c = await getConstrutoraByOwnerId(user.id);
    if (c) {
      const rows = await getOperacoesByConstrutora(c.id);
      allOps = rows.map((r) => ({
        id: r.id,
        numero: r.numero,
        status: r.status,
        valorComissao: r.valorComissao,
        valorPresente: r.valorPresente,
        counterpartyLabel: r.corretorNome,
        createdAt: r.createdAt,
      }));
    }
  } else {
    const rows = await getOperacoesByCorretor(user.id);
    allOps = rows.map((r) => ({
      id: r.id,
      numero: r.numero,
      status: r.status,
      valorComissao: r.valorComissao,
      valorPresente: r.valorPresente,
      counterpartyLabel: r.construtoraNome,
      createdAt: r.createdAt,
    }));
  }

  // Stats agregados (sobre TODAS as operações, ignorando o filtro de data)
  const ativas = allOps.filter((o) => ATIVOS_STATUSES.includes(o.status));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const stats = {
    totalOperacoes: allOps.length,
    valorTotalAntecipado: ativas.reduce(
      (s, o) => s + parseFloat(o.valorPresente),
      0,
    ),
    operacoesNoMes: allOps.filter(
      (o) => new Date(o.createdAt) >= monthStart,
    ).length,
    pendentesAprovacao: allOps.filter((o) =>
      PENDENTE_STATUSES.includes(o.status),
    ).length,
  };

  // Aplica filtro de data localmente (a query já trouxe tudo)
  const fromDate = from ? new Date(from + "T00:00:00") : null;
  const toDate = to ? new Date(to + "T23:59:59") : null;
  const operacoes = allOps.filter((o) => {
    const d = new Date(o.createdAt);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });

  const counterpartyHeader = isConstrutora
    ? "Imobiliária / Corretor"
    : "Construtora";
  const titleLabel = isConstrutora ? "vinculadas a você" : "operações";

  const role = (
    isConstrutora
      ? "construtora"
      : user.role === "imobiliaria"
        ? "imobiliaria"
        : "corretor"
  ) as "construtora" | "corretor" | "imobiliaria";

  return (
    <PainelShell role={role} userName={user.nome} active="/painel/operacoes">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-display-md">
            {isConstrutora ? "Operações " : "Suas "}
            <span className="text-gradient-blue">{titleLabel}</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            {operacoes.length}{" "}
            {operacoes.length === 1 ? "operação" : "operações"} no resultado
          </p>
        </div>
        {!isConstrutora && (
          <Link
            href="/painel/operacoes/nova"
            className="btn-primary !h-11 !px-5"
          >
            + Nova operação
          </Link>
        )}
      </div>

      <OperacoesStatBoxes stats={stats} />
      <DateRangeFilter />

      {operacoes.length === 0 ? (
        allOps.length === 0 ? (
          <EmptyState isConstrutora={isConstrutora} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
            <p className="text-fg-muted">
              Nenhuma operação no período selecionado.
            </p>
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border bg-bg-card">
            <div className="col-span-2">Número</div>
            <div className="col-span-3">{counterpartyHeader}</div>
            <div className="col-span-2 text-right">Comissão</div>
            <div className="col-span-2 text-right">Valor presente</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1"></div>
          </div>
          <ul>
            {operacoes.map((op) => (
              <li key={op.id} className="border-b border-border last:border-0">
                <Link
                  href={`/painel/operacoes/${op.id}`}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-bg-card transition-colors group"
                >
                  <div className="col-span-2 font-mono text-sm text-fg">
                    {op.numero}
                  </div>
                  <div className="col-span-3 text-sm text-fg-muted truncate">
                    {op.counterpartyLabel ?? "—"}
                  </div>
                  <div className="col-span-2 text-right font-mono tabular text-sm text-fg-muted">
                    {formatBRL(parseFloat(op.valorComissao))}
                  </div>
                  <div className="col-span-2 text-right font-mono tabular text-sm text-fg font-semibold">
                    {formatBRL(parseFloat(op.valorPresente))}
                  </div>
                  <div className="col-span-2">
                    <OperacaoStatusBadge status={op.status} />
                  </div>
                  <div className="col-span-1 text-right text-fg-dim group-hover:text-accent group-hover:translate-x-1 transition-all">
                    →
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PainelShell>
  );
}

function EmptyState({ isConstrutora }: { isConstrutora: boolean }) {
  if (isConstrutora) {
    return (
      <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 md:p-14 text-center">
        <div className="text-5xl mb-4">🤝</div>
        <h2 className="text-2xl font-bold tracking-tight">
          Nenhuma operação vinculada
        </h2>
        <p className="mt-3 text-fg-muted max-w-md mx-auto">
          Quando uma imobiliária / corretor antecipar uma comissão vinculada à
          sua construtora, ela vai aparecer aqui.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 md:p-14 text-center">
      <div className="text-5xl mb-4">📊</div>
      <h2 className="text-2xl font-bold tracking-tight">
        Nenhuma operação ainda
      </h2>
      <p className="mt-3 text-fg-muted max-w-md mx-auto">
        Cadastre sua primeira operação pra começar. Em até 24 horas analisamos
        e o dinheiro cai na sua conta.
      </p>
      <Link
        href="/painel/operacoes/nova"
        className="btn-primary mt-6 !h-12 !px-6"
      >
        Cadastrar primeira operação <span className="arrow">→</span>
      </Link>
    </div>
  );
}
