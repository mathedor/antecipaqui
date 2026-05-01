import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import {
  getConstrutoraByOwnerId,
  getOperacoesByConstrutora,
  getOperacoesByCorretor,
} from "@/lib/actions/operacoes";
import { PainelShell } from "@/components/painel-shell";
import { PainelOperacoesTable } from "@/components/painel-operacoes-table";
import {
  DateRangeFilter,
  OperacoesStatBoxes,
} from "@/components/operacoes-stats";

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
  const isFundo = user.role === "fundo";
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

  if (isFundo) {
    const { getFundoDashboard } = await import("@/lib/actions/fundos");
    const data = await getFundoDashboard();
    if (data) {
      allOps = data.operacoes.map((r) => ({
        id: r.id,
        numero: r.numero,
        status: r.status,
        valorComissao: r.valorComissao,
        valorPresente: r.valorPresente,
        counterpartyLabel:
          (r.construtoraNome ?? "—") + " · " + (r.corretorNome ?? "—"),
        createdAt: r.createdAt,
      }));
    }
  } else if (isConstrutora) {
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

  const counterpartyHeader = isFundo
    ? "Construtora · Corretor"
    : isConstrutora
      ? "Imobiliária / Corretor"
      : "Construtora";
  const titleLabel = isFundo
    ? "do fundo"
    : isConstrutora
      ? "vinculadas a você"
      : "operações";

  const role = (
    isFundo
      ? "fundo"
      : isConstrutora
        ? "construtora"
        : user.role === "imobiliaria"
          ? "imobiliaria"
          : "corretor"
  ) as "construtora" | "corretor" | "imobiliaria" | "fundo";

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
        {!isConstrutora && !isFundo && (
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

      {allOps.length === 0 ? (
        <EmptyState isConstrutora={isConstrutora} />
      ) : (
        <PainelOperacoesTable
          rows={operacoes}
          counterpartyHeader={counterpartyHeader}
        />
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
