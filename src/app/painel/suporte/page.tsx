import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { getMyTickets } from "@/lib/actions/tickets";
import { PainelShell } from "@/components/painel-shell";
import { TicketStatusBadge } from "@/components/ticket-status-badge";

export const metadata = {
  title: "Suporte",
};

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

export default async function SuportePage() {
  const user = await requireActiveUser();
  if (user.role === "admin") redirect("/admin/tickets");

  const tickets = await getMyTickets();

  const role = (
    user.role === "construtora"
      ? "construtora"
      : user.role === "imobiliaria"
        ? "imobiliaria"
        : "corretor"
  ) as "construtora" | "corretor" | "imobiliaria";

  return (
    <PainelShell
      role={role}
      userName={user.nome}
      active="/painel/suporte"
    >
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-display-md">
            <span className="text-gradient-blue">Suporte</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            Abra um ticket pra falar com o time da Antecipaqui — respondemos em
            até 1 dia útil.
          </p>
        </div>
        <Link
          href="/painel/suporte/novo"
          className="btn-primary !h-11 !px-5"
        >
          + Abrir ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 md:p-14 text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-2xl font-bold tracking-tight">
            Nenhum ticket aberto
          </h2>
          <p className="mt-3 text-fg-muted max-w-md mx-auto">
            Tem dúvida ou precisa de ajuda com uma operação? Abra um ticket que
            o time responde rapidinho.
          </p>
          <Link
            href="/painel/suporte/novo"
            className="btn-primary mt-6 !h-12 !px-6"
          >
            Abrir primeiro ticket <span className="arrow">→</span>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/painel/suporte/${t.id}`}
                className="grid grid-cols-12 gap-3 px-5 py-4 rounded-2xl border border-border bg-bg-elev hover:border-accent transition-colors items-center"
              >
                <div className="col-span-12 md:col-span-7">
                  <div className="font-bold text-fg truncate">{t.assunto}</div>
                  <div className="text-xs text-fg-muted font-mono mt-0.5">
                    Atualizado em {formatDateTime(t.updatedAt)}
                  </div>
                </div>
                <div className="col-span-8 md:col-span-4 flex md:justify-end">
                  <TicketStatusBadge status={t.status} />
                </div>
                <div className="col-span-4 md:col-span-1 text-right text-fg-dim">
                  →
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PainelShell>
  );
}
