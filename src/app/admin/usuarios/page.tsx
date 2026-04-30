import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminRowActions } from "@/components/admin-row-actions";
import { AdminCobrarButton } from "@/components/admin-cobrar-button";
import { listAllUsers } from "@/lib/actions/admin";

export const metadata = {
  title: "Admin · Usuários",
};

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Admin",
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

      <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border bg-bg-card">
          <div className="col-span-3">Nome</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-2">Cadastro</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        <ul>
          {filtered.map((u) => {
            const isAdminRow = u.role === "admin";
            return (
              <li
                key={u.id}
                className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-bg-card transition-colors items-center border-b border-border last:border-0"
              >
                <Link
                  href={`/admin/usuarios/${u.id}`}
                  className="col-span-6 md:col-span-3 text-sm text-fg truncate hover:text-accent"
                >
                  {u.nome ?? "(sem nome)"}
                </Link>
                <div className="hidden md:block col-span-3 font-mono text-xs text-fg-muted truncate">
                  {u.email}
                </div>
                <div className="col-span-3 md:col-span-2 text-sm text-fg-muted truncate">
                  {ROLE_LABEL[u.role] ?? u.role}
                </div>
                <div className="col-span-3 md:col-span-2">
                  <CadastroBadge
                    cadastroCompleto={u.cadastroCompleto}
                    isActive={u.isActive}
                    role={u.role}
                    docsFaltando={u.docsFaltando}
                  />
                </div>
                <div className="hidden md:flex col-span-2 justify-end items-center gap-1.5">
                  <AdminRowActions
                    viewHref={`/admin/usuarios/${u.id}`}
                    editHref={`/admin/usuarios/${u.id}/editar`}
                  >
                    {!u.cadastroCompleto && !isAdminRow && (
                      <AdminCobrarButton target="user" id={u.id} />
                    )}
                  </AdminRowActions>
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-6 py-12 text-center text-fg-muted">
              Nenhum usuário com os filtros atuais.
            </li>
          )}
        </ul>
      </div>
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

function CadastroBadge({
  cadastroCompleto,
  isActive,
  role,
  docsFaltando,
}: {
  cadastroCompleto: boolean;
  isActive: boolean;
  role: string;
  docsFaltando: string[];
}) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-red-50 text-danger border-danger/40">
        ⛔ bloqueado
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-bg-card text-fg-dim border-border">
        admin
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
