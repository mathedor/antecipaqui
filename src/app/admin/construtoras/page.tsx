import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminConstrutorasTable } from "@/components/admin-construtoras-table";
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

type Search = { searchParams: Promise<{ status?: string; q?: string }> };

export default async function AdminConstrutorasPage({
  searchParams,
}: Search) {
  const admin = await requireAdmin();
  const { status: statusFiltro = "", q = "" } = await searchParams;
  const list = await listAllConstrutoras();

  const qLower = q.trim().toLowerCase();
  const filtered = list.filter((c) => {
    if (statusFiltro === "completo" && !c.cadastroCompleto) return false;
    if (statusFiltro === "pendente" && c.cadastroCompleto) return false;
    if (statusFiltro === "sem_dono" && c.ownerUserId) return false;
    if (statusFiltro === "bloqueado" && c.isActive) return false;
    if (qLower) {
      const hay = `${c.razaoSocial} ${c.nomeFantasia ?? ""} ${c.cnpj}`.toLowerCase();
      if (!hay.includes(qLower)) return false;
    }
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

      <form
        method="get"
        className="rounded-2xl border border-border bg-bg-elev p-4 mb-3"
      >
        <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
          Buscar (razão social, nome fantasia, CNPJ)
        </label>
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Ex: Costa Verde ou 12.345..."
            className="form-input flex-1"
          />
          {statusFiltro && (
            <input type="hidden" name="status" value={statusFiltro} />
          )}
          <button type="submit" className="btn-primary !h-12 !px-5">
            Buscar
          </button>
        </div>
      </form>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-16 shrink-0">
          Status
        </span>
        {STATUS_FILTERS.map((f) => {
          const qs = new URLSearchParams();
          if (f.value) qs.set("status", f.value);
          if (q) qs.set("q", q);
          const query = qs.toString();
          return (
            <Link
              key={f.value || "all"}
              href={`/admin/construtoras${query ? `?${query}` : ""}`}
              className={`chip transition-colors hover:border-accent ${
                statusFiltro === f.value ? "chip-accent" : ""
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="text-xs text-fg-muted mb-3 font-mono">
        {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
      </div>

      <AdminConstrutorasTable rows={filtered} />
    </AdminShell>
  );
}
