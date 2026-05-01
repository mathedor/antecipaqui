import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getFundoDashboard } from "@/lib/actions/fundos";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Parceiros do fundo" };

export default async function FundoParceirosPage() {
  const user = await requireActiveUser();
  if (user.role !== "fundo") redirect("/painel");

  const data = await getFundoDashboard();
  if (!data) redirect("/painel");

  const { construtoras, imobiliarias } = data;

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/parceiros">
      <div className="mb-6">
        <div className="eyebrow mb-2">parceiros</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Parceiros</span> que já operaram
          com você
        </h1>
        <p className="mt-2 text-fg-muted">
          {construtoras.length} construtoras · {imobiliarias.length} imobiliárias
          / corretores
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="px-5 py-3 bg-bg-card border-b border-border">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              construtoras
            </div>
          </div>
          {construtoras.length === 0 ? (
            <p className="px-5 py-8 text-sm text-fg-muted text-center">
              Nenhuma construtora ainda.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
                  <th className="px-4 py-2 text-left">Razão social</th>
                  <th className="px-4 py-2 text-right">Ops</th>
                  <th className="px-4 py-2 text-right">Operado</th>
                </tr>
              </thead>
              <tbody>
                {construtoras.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0 hover:bg-bg-card transition-colors"
                  >
                    <td className="px-4 py-3 text-fg font-semibold truncate max-w-[280px]">
                      {c.nome}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-fg-muted">
                      {c.qtd}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-fg font-semibold">
                      {formatBRL(c.valorOperado)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-strong bg-bg-card font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                  <td className="px-4 py-3 text-fg-muted">Totais</td>
                  <td className="px-4 py-3 text-right tabular text-fg font-bold">
                    {construtoras.reduce((s, c) => s + c.qtd, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular text-fg font-bold">
                    {formatBRL(
                      construtoras.reduce((s, c) => s + c.valorOperado, 0),
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="px-5 py-3 bg-bg-card border-b border-border">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
              imobiliárias / corretores
            </div>
          </div>
          {imobiliarias.length === 0 ? (
            <p className="px-5 py-8 text-sm text-fg-muted text-center">
              Nenhuma imobiliária ainda.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
                  <th className="px-4 py-2 text-left">Razão social</th>
                  <th className="px-4 py-2 text-right">Ops</th>
                  <th className="px-4 py-2 text-right">Operado</th>
                </tr>
              </thead>
              <tbody>
                {imobiliarias.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-border last:border-0 hover:bg-bg-card transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-fg font-semibold truncate max-w-[280px]">
                        {i.nome}
                      </div>
                      <div className="text-[10px] font-mono text-fg-dim">
                        {i.cnpj}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-fg-muted">
                      {i.qtd}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-fg font-semibold">
                      {formatBRL(i.valorOperado)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-strong bg-bg-card font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                  <td className="px-4 py-3 text-fg-muted">Totais</td>
                  <td className="px-4 py-3 text-right tabular text-fg font-bold">
                    {imobiliarias.reduce((s, i) => s + i.qtd, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular text-fg font-bold">
                    {formatBRL(
                      imobiliarias.reduce((s, i) => s + i.valorOperado, 0),
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>
      </div>
    </PainelShell>
  );
}
