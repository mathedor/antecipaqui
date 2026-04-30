import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminRowActions } from "@/components/admin-row-actions";
import { AdminCobrarButton } from "@/components/admin-cobrar-button";
import { listAllConstrutoras } from "@/lib/actions/admin";

export const metadata = {
  title: "Admin · Construtoras",
};

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "completo", label: "Cadastro completo" },
  { value: "pendente", label: "Pendente de docs" },
  { value: "sem_dono", label: "Sem responsável" },
  { value: "bloqueado", label: "Bloqueadas" },
];

type Search = { searchParams: Promise<{ status?: string }> };

export default async function AdminConstrutorasPage({
  searchParams,
}: Search) {
  const admin = await requireAdmin();
  const { status: statusFiltro = "" } = await searchParams;
  const list = await listAllConstrutoras();

  const filtered = list.filter((c) => {
    if (statusFiltro === "completo" && !c.cadastroCompleto) return false;
    if (statusFiltro === "pendente" && c.cadastroCompleto) return false;
    if (statusFiltro === "sem_dono" && c.ownerUserId) return false;
    if (statusFiltro === "bloqueado" && c.isActive) return false;
    return true;
  });

  return (
    <AdminShell active="/admin/construtoras" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">construtoras</div>
        <h1 className="text-display-md">
          Todas as <span className="text-gradient-blue">construtoras</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          {list.length} {list.length === 1 ? "construtora" : "construtoras"}{" "}
          cadastradas
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-16 shrink-0">
          Status
        </span>
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value || "all"}
            href={
              f.value
                ? `/admin/construtoras?status=${f.value}`
                : "/admin/construtoras"
            }
            className={`chip transition-colors hover:border-accent ${
              statusFiltro === f.value ? "chip-accent" : ""
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="text-xs text-fg-muted mb-3 font-mono">
        {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
      </div>

      <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border bg-bg-card">
          <div className="col-span-4">Razão social</div>
          <div className="col-span-3">CNPJ</div>
          <div className="col-span-1">Resp.</div>
          <div className="col-span-2">Cadastro</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        <ul>
          {filtered.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-bg-card transition-colors items-center border-b border-border last:border-0"
            >
              <Link
                href={`/admin/construtoras/${c.id}`}
                className="col-span-7 md:col-span-4 text-sm text-fg truncate hover:text-accent"
              >
                <div className="truncate">{c.razaoSocial}</div>
                {c.nomeFantasia && (
                  <div className="text-fg-muted text-xs truncate">
                    {c.nomeFantasia}
                  </div>
                )}
              </Link>
              <div className="hidden md:block col-span-3 font-mono text-xs text-fg-muted">
                {c.cnpj}
              </div>
              <div className="hidden md:block col-span-1 text-xs text-fg-muted">
                {c.ownerUserId ? "✓" : "—"}
              </div>
              <div className="col-span-4 md:col-span-2">
                <CadastroBadge
                  cadastroCompleto={c.cadastroCompleto}
                  isActive={c.isActive}
                  docsFaltando={c.docsFaltando}
                />
              </div>
              <div className="hidden md:flex col-span-2 justify-end items-center gap-1.5">
                <AdminRowActions
                  viewHref={`/admin/construtoras/${c.id}`}
                  editHref={`/admin/construtoras/${c.id}/editar`}
                >
                  {!c.cadastroCompleto && (
                    <AdminCobrarButton target="construtora" id={c.id} />
                  )}
                </AdminRowActions>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-6 py-12 text-center text-fg-muted">
              Nenhuma construtora com os filtros atuais.
            </li>
          )}
        </ul>
      </div>
    </AdminShell>
  );
}

function CadastroBadge({
  cadastroCompleto,
  isActive,
  docsFaltando,
}: {
  cadastroCompleto: boolean;
  isActive: boolean;
  docsFaltando: string[];
}) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-red-50 text-danger border-danger/40">
        ⛔ bloqueada
      </span>
    );
  }
  if (cadastroCompleto) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-green-50 text-success border-green-200">
        ✓ completo
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-yellow-50 text-warn border-yellow-200"
      title={
        docsFaltando.length > 0
          ? `Falta: ${docsFaltando.join(", ")}`
          : "Pendente"
      }
    >
      ⚠ pendente
    </span>
  );
}
