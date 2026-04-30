import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { getCashbackSummaryForCurrentConstrutora } from "@/lib/actions/cashback";
import { PainelShell } from "@/components/painel-shell";
import { SolicitarSaqueForm } from "@/components/solicitar-saque-form";
import { formatBRL } from "@/lib/format";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";

export const metadata = { title: "Cashback" };

function formatDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default async function CashbackPage() {
  const user = await requireActiveUser();
  if (user.role !== "construtora") redirect("/painel");

  const summary = await getCashbackSummaryForCurrentConstrutora();

  return (
    <PainelShell role="construtora" userName={user.nome} active="/painel/cashback">
      <div className="mb-6">
        <div className="eyebrow mb-2">benefícios</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Cashback</span> Antecipaqui
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Cashback é um percentual sobre o valor presente das operações da
          sua construtora, concedido pela Antecipaqui na aprovação final. O
          saldo disponível pode ser sacado a qualquer momento.
        </p>
      </div>

      {!summary ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <p className="text-fg-muted">
            Cadastro da construtora ainda não está completo.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <SaldoCard
              label="Saldo disponível"
              value={summary.saldoDisponivel}
              highlight
            />
            <SaldoCard label="Total acumulado" value={summary.totalAcumulado} />
            <SaldoCard label="Já sacado" value={summary.totalSacado} />
          </div>

          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7">
              <h2 className="font-bold mb-3 tracking-tight">
                Operações com cashback
              </h2>
              {summary.operacoes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-8 text-center">
                  <p className="text-sm text-fg-muted">
                    Nenhuma operação com cashback ainda. Quando uma operação
                    sua é aprovada com cashback, aparece aqui.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {summary.operacoes.map((op) => (
                    <li
                      key={op.id}
                      className="grid grid-cols-12 gap-3 px-5 py-4 rounded-2xl border border-border bg-bg-elev items-center"
                    >
                      <Link
                        href={`/painel/operacoes/${op.id}`}
                        className="col-span-12 md:col-span-3 font-mono text-sm text-fg hover:text-accent"
                      >
                        {op.numero}
                      </Link>
                      <div className="col-span-6 md:col-span-3 text-xs text-fg-muted">
                        VP: {formatBRL(parseFloat(op.valorPresente))}
                      </div>
                      <div className="col-span-6 md:col-span-2 text-xs">
                        <OperacaoStatusBadge status={op.status} />
                      </div>
                      <div className="col-span-6 md:col-span-2 text-right">
                        <div className="font-mono tabular text-sm font-bold text-success">
                          {formatBRL(parseFloat(op.cashbackValor ?? "0"))}
                        </div>
                        <div className="text-[10px] text-fg-dim font-mono">
                          {(parseFloat(op.cashbackPercent ?? "0") * 100)
                            .toFixed(2)
                            .replace(".", ",")}
                          %
                        </div>
                      </div>
                      <div className="col-span-6 md:col-span-2 text-right text-[10px] font-mono">
                        {op.cashbackSacadoEm ? (
                          <span className="text-fg-dim">
                            sacado {formatDate(op.cashbackSacadoEm)}
                          </span>
                        ) : (
                          <span className="text-success">disponível</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <aside className="lg:col-span-5">
              <div className="lg:sticky lg:top-24 rounded-2xl border border-accent/30 bg-accent-soft p-6">
                <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-3">
                  solicitar saque
                </div>
                {summary.saldoDisponivel > 0 ? (
                  <>
                    <div className="mb-4">
                      <div className="text-xs text-fg-muted">
                        Saldo disponível
                      </div>
                      <div className="font-mono tabular text-3xl font-bold text-fg">
                        {formatBRL(summary.saldoDisponivel)}
                      </div>
                    </div>
                    <SolicitarSaqueForm
                      saldo={summary.saldoDisponivel}
                      construtoraNome={summary.construtora.razaoSocial}
                      construtoraCnpj={summary.construtora.cnpj}
                    />
                  </>
                ) : (
                  <p className="text-sm text-fg-muted">
                    Sem saldo disponível pra saque no momento.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </PainelShell>
  );
}

function SaldoCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? "border-accent bg-accent-soft"
          : "border-border bg-bg-elev"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular text-2xl md:text-3xl font-bold tracking-tight ${
          highlight ? "text-accent" : "text-fg"
        }`}
      >
        {formatBRL(value)}
      </div>
    </div>
  );
}
