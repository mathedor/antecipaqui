import Link from "next/link";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { PageHelp } from "@/components/page-help";
import { listMinhasSolicitacoesDocumento } from "@/lib/actions/construtora-operacional";

export const metadata = { title: "Pendências" };

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PendenciasPage() {
  const user = await requireActiveUser();

  const role = (
    user.role === "fundo"
      ? "fundo"
      : user.role === "construtora"
        ? "construtora"
        : user.role === "imobiliaria"
          ? "imobiliaria"
          : user.role === "comercial"
            ? "comercial"
            : "corretor"
  ) as "construtora" | "corretor" | "imobiliaria" | "fundo" | "comercial";

  const solicitacoes = await listMinhasSolicitacoesDocumento();

  return (
    <PainelShell role={role} userName={user.nome} active="/painel/pendencias">
      <div className="mb-6">
        <div className="eyebrow mb-2">to-do</div>
        <h1 className="text-display-md">
          Pendências de <span className="text-gradient-blue">documentos</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Documentos solicitados pela Antecipaqui ou pelo fundo da operação.
          Anexe na operação correspondente pra atender.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-pendencias-construtora" />
        </div>
      </div>

      {solicitacoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">✓</div>
          <p className="text-fg-muted">Nenhuma pendência. Tudo em dia!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {solicitacoes.map((s) => (
            <li key={s.id}>
              <div className="px-5 py-4 rounded-2xl border border-warn/40 bg-yellow-50">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-warn mb-1">
                      {s.tipoDocumento}
                    </div>
                    <p className="font-semibold text-sm text-fg">
                      {s.mensagem}
                    </p>
                    <p className="text-xs text-fg-muted mt-1">
                      Pedido por{" "}
                      {s.solicitadoPorNome ?? s.solicitadoPorEmail} ·{" "}
                      {formatDateTime(s.createdAt)}
                    </p>
                  </div>
                  {s.operacaoId && (
                    <Link
                      href={`/painel/operacoes/${s.operacaoId}`}
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark"
                    >
                      Atender →
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PainelShell>
  );
}
