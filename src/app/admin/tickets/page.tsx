import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { getAllTicketsForAdmin } from "@/lib/actions/tickets";

export const metadata = {
  title: "Admin · Tickets",
};

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "aberto", label: "Abertos" },
  { value: "aguardando_resposta", label: "Aguardando cliente" },
  { value: "finalizado", label: "Finalizados" },
];

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Admin",
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

type Search = { searchParams: Promise<{ status?: string }> };

export default async function AdminTicketsPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const { status: statusFilter } = await searchParams;
  const tickets = await getAllTicketsForAdmin(statusFilter || undefined);

  return (
    <AdminShell active="/admin/tickets" userName={admin.nome}>
      <div className="mb-8">
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Tickets</span> de suporte
        </h1>
        <p className="mt-2 text-fg-muted">
          {tickets.length}{" "}
          {tickets.length === 1 ? "ticket" : "tickets"}
          {statusFilter ? ` · filtro: ${statusFilter}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((f) => {
          const isActive = (statusFilter ?? "") === f.value;
          return (
            <Link
              key={f.value}
              href={f.value ? `/admin/tickets?status=${f.value}` : "/admin/tickets"}
              className={`chip transition-colors hover:border-accent ${
                isActive ? "chip-accent" : ""
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-fg-muted">Nenhum ticket por aqui.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/tickets/${t.id}`}
                className="grid grid-cols-12 gap-3 px-5 py-4 rounded-2xl border border-border bg-bg-elev hover:border-accent transition-colors items-center"
              >
                <div className="col-span-12 md:col-span-5">
                  <div className="font-bold text-fg truncate">{t.assunto}</div>
                  <div className="text-xs text-fg-muted truncate mt-0.5">
                    {t.userNome ?? t.userEmail} · {ROLE_LABEL[t.userRole ?? ""]}
                  </div>
                </div>
                <div className="col-span-6 md:col-span-3 text-xs text-fg-muted font-mono">
                  {formatDateTime(t.updatedAt)}
                </div>
                <div className="col-span-6 md:col-span-3 flex md:justify-end">
                  <TicketStatusBadge status={t.status} forAdmin />
                </div>
                <div className="hidden md:block col-span-1 text-right text-fg-dim">
                  →
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
