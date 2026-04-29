import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getOperacoesByCorretor } from "@/lib/actions/operacoes";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Operações",
};

export default async function OperacoesPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  const operacoes = await getOperacoesByCorretor(user.id);

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <Link
            href="/painel"
            className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-2 inline-block"
          >
            ← painel
          </Link>
          <h1 className="text-display-md">
            Suas <span className="text-gradient-blue">operações</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            Total: {operacoes.length}{" "}
            {operacoes.length === 1 ? "operação" : "operações"}
          </p>
        </div>
        <Link href="/painel/operacoes/nova" className="btn-primary !h-11 !px-5">
          + Nova operação
        </Link>
      </div>

      {operacoes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border bg-bg-card">
            <div className="col-span-2">Número</div>
            <div className="col-span-3">Construtora</div>
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
                  <div className="col-span-2 font-mono text-sm text-fg">{op.numero}</div>
                  <div className="col-span-3 text-sm text-fg-muted truncate">
                    {op.construtoraNome ?? "—"}
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
    </section>
  );
}

function EmptyState() {
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
