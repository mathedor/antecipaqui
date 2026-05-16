import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listRegrasFundo } from "@/lib/actions/fundo-mesa";
import { formatBRL } from "@/lib/format";
import { CriarRegraForm } from "@/components/criar-regra-form";
import { RegraToggleButtons } from "@/components/regra-toggle-buttons";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Regras · Painel do fundo" };
export const dynamic = "force-dynamic";

function fmtPct(v: string | null) {
  if (!v) return "—";
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(2).replace(".", ",")}%`;
}

export default async function FundoRegrasPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "fundo") redirect("/painel");

  const regras = await listRegrasFundo();

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/regras">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel do fundo · automação</div>
        <h1 className="text-display-md">
          Regras de <span className="text-gradient-blue">auto-aprovação</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Configure critérios pra aprovar ops automaticamente sem precisar
          revisar uma a uma. Toda regra ativa é avaliada na ordem de
          prioridade — se a op satisfaz <strong>todos</strong> os critérios de
          alguma regra, é auto-aprovada e creditada à regra que disparou.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-regras" />
        </div>
      </div>

      {/* Form criar */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
        <h2 className="text-lg font-bold tracking-tight mb-3">Nova regra</h2>
        <CriarRegraForm />
      </section>

      {/* Lista */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <h2 className="text-lg font-bold tracking-tight mb-4">
          Regras cadastradas ({regras.length})
        </h2>
        {regras.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-bg-card p-6 text-center text-sm text-fg-muted">
            Nenhuma regra cadastrada. Sem regras ativas, toda operação fica
            pendente esperando sua decisão manual.
          </div>
        ) : (
          <ul className="space-y-3">
            {regras.map((r) => (
              <li
                key={r.id}
                className={`rounded-xl border p-4 ${
                  r.ativa
                    ? "border-success/40 bg-green-50/50"
                    : "border-border bg-bg opacity-70"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-fg">{r.nome}</h3>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono font-semibold ${
                          r.ativa
                            ? "bg-success text-white"
                            : "bg-bg-card text-fg-muted border border-border"
                        }`}
                      >
                        {r.ativa ? "ativa" : "desativada"}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-fg-dim mt-0.5">
                      acionada {r.contadorAcionamentos}{" "}
                      {r.contadorAcionamentos === 1 ? "vez" : "vezes"} ·
                      prioridade {r.prioridade}
                    </div>
                  </div>
                  <RegraToggleButtons regraId={r.id} ativa={r.ativa} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Criterio
                    label="Taxa mínima"
                    value={fmtPct(r.taxaMinima)}
                  />
                  <Criterio
                    label="Prazo máximo"
                    value={
                      r.prazoMaximoMeses
                        ? `${r.prazoMaximoMeses} parcelas`
                        : "—"
                    }
                  />
                  <Criterio
                    label="Valor máx. comissão"
                    value={
                      r.valorMaximoComissao
                        ? formatBRL(parseFloat(r.valorMaximoComissao))
                        : "—"
                    }
                  />
                  <Criterio
                    label="Construtoras"
                    value={
                      r.construtorasIds && r.construtorasIds.length > 0
                        ? `${r.construtorasIds.length} específica${
                            r.construtorasIds.length === 1 ? "" : "s"
                          }`
                        : "qualquer"
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-fg-muted">
        <Link href="/painel/aprovar" className="text-accent hover:underline">
          ← voltar pra mesa de decisão
        </Link>
      </p>
    </PainelShell>
  );
}

function Criterio({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg-elev border border-border px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className="font-mono tabular text-xs text-fg font-semibold">
        {value}
      </div>
    </div>
  );
}
