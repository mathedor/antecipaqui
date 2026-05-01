import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminUsuariosTable } from "@/components/admin-usuarios-table";
import { listAllUsers } from "@/lib/actions/admin";

export const metadata = {
  title: "Admin · Usuários",
};

const ROLE_FILTERS = [
  { value: "", label: "Todos" },
  { value: "imob", label: "Imobiliária / Corretor" },
  { value: "construtora", label: "Construtora" },
  { value: "admin", label: "Admin" },
];

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "completo", label: "Cadastro completo" },
  { value: "pendente", label: "Pendente de docs" },
  { value: "bloqueado", label: "Bloqueados" },
];

type Search = {
  searchParams: Promise<{ tipo?: string; status?: string }>;
};

export default async function AdminUsuariosPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const tipoFiltro = params.tipo ?? "";
  const statusFiltro = params.status ?? "";

  const all = await listAllUsers();

  const filtered = all.filter((u) => {
    // Filtro de tipo
    if (tipoFiltro === "imob") {
      if (u.role !== "corretor" && u.role !== "imobiliaria") return false;
    } else if (tipoFiltro === "construtora") {
      if (u.role !== "construtora") return false;
    } else if (tipoFiltro === "admin") {
      if (u.role !== "admin") return false;
    }
    // Filtro de status
    if (statusFiltro === "completo" && !u.cadastroCompleto) return false;
    if (statusFiltro === "pendente" && u.cadastroCompleto) return false;
    if (statusFiltro === "bloqueado" && u.isActive) return false;
    return true;
  });

  const corretoresImob = all.filter(
    (u) => u.role === "corretor" || u.role === "imobiliaria",
  );
  const construtoraUsers = all.filter((u) => u.role === "construtora");
  const adminUsers = all.filter((u) => u.role === "admin");

  return (
    <AdminShell active="/admin/usuarios" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">usuários</div>
        <h1 className="text-display-md">
          Imobiliárias /{" "}
          <span className="text-gradient-blue">Corretores</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          {corretoresImob.length} imobiliárias/corretores ·{" "}
          {construtoraUsers.length} construtoras · {adminUsers.length} admin
          {adminUsers.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Filtros */}
      <div className="space-y-3 mb-6">
        <FilterRow
          label="Tipo"
          options={ROLE_FILTERS}
          current={tipoFiltro}
          paramName="tipo"
          otherParam={statusFiltro ? { name: "status", value: statusFiltro } : null}
        />
        <FilterRow
          label="Status"
          options={STATUS_FILTERS}
          current={statusFiltro}
          paramName="status"
          otherParam={tipoFiltro ? { name: "tipo", value: tipoFiltro } : null}
        />
      </div>

      <div className="text-xs text-fg-muted mb-3 font-mono">
        {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
      </div>

      <AdminUsuariosTable rows={filtered} />
    </AdminShell>
  );
}

function FilterRow({
  label,
  options,
  current,
  paramName,
  otherParam,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  current: string;
  paramName: string;
  otherParam: { name: string; value: string } | null;
}) {
  function buildHref(value: string) {
    const qs = new URLSearchParams();
    if (value) qs.set(paramName, value);
    if (otherParam) qs.set(otherParam.name, otherParam.value);
    const query = qs.toString();
    return `/admin/usuarios${query ? `?${query}` : ""}`;
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-12 shrink-0">
        {label}
      </span>
      {options.map((o) => {
        const active = current === o.value;
        return (
          <Link
            key={o.value || "all"}
            href={buildHref(o.value)}
            className={`chip transition-colors hover:border-accent ${
              active ? "chip-accent" : ""
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

