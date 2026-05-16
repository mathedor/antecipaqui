import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getCurrentFundo } from "@/lib/actions/fundos";
import {
  getComercialDesempenho,
  listComerciaisDoFundo,
} from "@/lib/actions/comercial-desempenho";
import { formatBRLcompact } from "@/lib/format";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Comerciais vinculados" };
export const dynamic = "force-dynamic";

export default async function FundoComerciaisPage() {
  const user = await requireActiveUser();
  if (user.role !== "fundo") redirect("/painel");

  const fundo = await getCurrentFundo();
  if (!fundo) redirect("/painel");

  const comerciais = await listComerciaisDoFundo(fundo.id);

  // Carrega desempenho de cada um pra mostrar resumo na lista
  const linhas = await Promise.all(
    comerciais.map(async (c) => {
      const d = await getComercialDesempenho(c.id);
      return { c, d };
    }),
  );

  return (
    <PainelShell
      role="fundo"
      userName={user.nome}
      active="/painel/comerciais"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">comerciais vinculados</div>
        <h1 className="text-display-md">
          Seu time{" "}
          <span className="text-gradient-blue">comercial</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Comerciais cadastrados pelo admin como dedicados ao seu fundo.
          Veja o desempenho de cada um — desde faturamento até prospecção
          de novos clientes.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-comerciais-fundo" />
        </div>
      </div>

      {linhas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">🤝</div>
          <h2 className="text-xl font-bold tracking-tight">
            Sem comerciais vinculados ainda
          </h2>
          <p className="mt-2 text-fg-muted max-w-md mx-auto">
            Solicite ao admin pra cadastrar um comercial dedicado ao seu
            fundo. Ele vai aparecer aqui com indicadores completos.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {linhas.map(({ c, d }) =>
            d ? (
              <li key={c.id}>
                <Link
                  href={`/painel/comerciais/${c.id}`}
                  className="block rounded-2xl border border-border bg-bg-elev p-5 md:p-6 hover:border-accent transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">
                        {d.nome}
                      </h2>
                      <div className="text-xs text-fg-muted font-mono">
                        {d.email}
                        {d.telefone && ` · ${d.telefone}`}
                      </div>
                    </div>
                    {!d.isActive && (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-red-100 text-red-700">
                        inativo
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <MiniKpi
                      label="Pago histórico"
                      value={formatBRLcompact(d.comissaoPaga)}
                    />
                    <MiniKpi
                      label="A receber"
                      value={formatBRLcompact(d.comissaoPendente)}
                      highlight
                    />
                    <MiniKpi
                      label="Ops aprovadas"
                      value={String(d.qtdOpsAprovadas)}
                    />
                    <MiniKpi
                      label="Imobs ativas"
                      value={String(d.qtdImobsAtivas90d)}
                    />
                    <MiniKpi
                      label="Leads abertos"
                      value={String(d.qtdLeadsAtivos)}
                    />
                  </div>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </PainelShell>
  );
}

function MiniKpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        highlight ? "border-accent bg-accent-soft" : "border-border bg-bg"
      }`}
    >
      <div
        className={`font-mono text-[9px] uppercase tracking-wider mb-0.5 ${
          highlight ? "text-accent" : "text-fg-dim"
        }`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-base font-bold text-fg">
        {value}
      </div>
    </div>
  );
}
