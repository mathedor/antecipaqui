import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { listMyConvites } from "@/lib/actions/pending-operacoes";
import { PainelShell } from "@/components/painel-shell";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Meus convites" };

function formatDate(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default async function ConvitesPage() {
  const user = await requireActiveUser();
  if (user.role === "construtora") redirect("/painel");
  if (user.role === "admin") redirect("/admin");

  const convites = await listMyConvites();

  const role = (user.role === "imobiliaria" ? "imobiliaria" : "corretor") as
    | "corretor"
    | "imobiliaria";

  return (
    <PainelShell role={role} userName={user.nome} active="/painel/convites">
      <div className="mb-6">
        <div className="eyebrow mb-2">convites</div>
        <h1 className="text-display-md">
          Operações <span className="text-gradient-blue">recebidas</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Construtoras pré-cadastraram operações pra você. Pra cada uma, você
          pode anexar contratos + nota fiscal e enviar pra análise da
          Antecipaqui.
        </p>
      </div>

      {convites.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 md:p-14 text-center">
          <div className="text-5xl mb-4">📨</div>
          <h2 className="text-2xl font-bold tracking-tight">
            Nenhum convite no momento
          </h2>
          <p className="mt-3 text-fg-muted max-w-md mx-auto">
            Quando uma construtora cadastrar uma operação que envolve você,
            ela aparece aqui pra ser completada.
          </p>
          <Link href="/painel/operacoes/nova" className="btn-primary mt-6 !h-12 !px-6">
            Cadastrar operação manualmente <span className="arrow">→</span>
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {convites.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-accent/30 bg-accent-soft p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-1">
                    construtora
                  </div>
                  <h2 className="text-lg font-bold">{c.construtoraNome}</h2>
                  <p className="text-xs text-fg-muted font-mono">
                    CNPJ {c.construtoraCnpj}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono tabular text-2xl font-bold text-fg">
                    {formatBRL(parseFloat(c.valorComissao))}
                  </div>
                  <div className="text-xs text-fg-muted">
                    comissão · {c.numeroParcelas}x · 1ª{" "}
                    {formatDate(c.dataPrimeiraParcela)}
                  </div>
                </div>
              </div>
              {c.observacoes && (
                <p className="text-sm text-fg-muted bg-bg-elev rounded-lg px-3 py-2 mb-3">
                  {c.observacoes}
                </p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href={`/painel/convites/${c.id}`}
                  className="btn-primary !h-10 !px-5"
                >
                  Completar e enviar pra análise <span className="arrow">→</span>
                </Link>
                <span className="text-xs text-fg-dim font-mono">
                  recebido {formatDate(c.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PainelShell>
  );
}
