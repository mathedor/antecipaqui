"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type ImpersonatableUser,
  startImpersonation,
} from "@/lib/actions/admin-impersonate";

const ROLE_LABEL: Record<string, string> = {
  corretor: "Corretor",
  imobiliaria: "Imobiliária",
  construtora: "Construtora",
  fundo: "Fundo",
  comercial: "Comercial",
};

const ROLE_COLOR: Record<string, string> = {
  corretor: "bg-blue-100 text-blue-700",
  imobiliaria: "bg-indigo-100 text-indigo-700",
  construtora: "bg-orange-100 text-orange-700",
  fundo: "bg-purple-100 text-purple-700",
  comercial: "bg-green-100 text-green-700",
};

export function ImpersonationPicker({
  users,
  recentes,
  currentSearch,
  currentRole,
}: {
  users: ImpersonatableUser[];
  recentes: ImpersonatableUser[];
  currentSearch: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [role, setRole] = useState(currentRole);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (role !== "_all_") params.set("role", role);
    router.push(`/admin/visao?${params.toString()}`);
  };

  // Quem tem ticket aberto: priorizar visualmente
  const comTickets = users.filter((u) => u.ticketsAbertos > 0);
  const semTickets = users.filter((u) => u.ticketsAbertos === 0);

  return (
    <>
      {/* Recentes */}
      {recentes.length > 0 && (
        <section className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-3">
            recentes · seus últimos acessos
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recentes.map((u) => (
              <UserCard key={u.id} u={u} compact />
            ))}
          </ul>
        </section>
      )}

      {/* Filtro */}
      <form
        onSubmit={submit}
        className="rounded-2xl border border-border bg-bg-elev p-4 md:p-5 mb-5 flex flex-wrap gap-2"
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email…"
          className="flex-1 min-w-[200px] h-10 px-3 rounded-lg border border-border bg-bg text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-bg text-sm"
        >
          <option value="_all_">Todos os roles</option>
          {Object.entries(ROLE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark"
        >
          Buscar
        </button>
      </form>

      {/* Tickets ativos */}
      {comTickets.length > 0 && (
        <section className="rounded-2xl border border-warn/40 bg-yellow-50 p-5 md:p-6 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-warn mb-3">
            🎫 com ticket aberto · prioridade pra suporte
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {comTickets.map((u) => (
              <UserCard key={u.id} u={u} />
            ))}
          </ul>
        </section>
      )}

      {/* Lista geral */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
            usuários · {users.length}
          </div>
          {users.length >= 100 && (
            <span className="text-[10px] text-fg-muted">
              mostrando primeiros 100 — refine a busca
            </span>
          )}
        </div>
        {semTickets.length === 0 && comTickets.length === 0 ? (
          <p className="text-sm text-fg-muted text-center py-8">
            Nenhum usuário encontrado com esse filtro.
          </p>
        ) : semTickets.length === 0 ? null : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {semTickets.map((u) => (
              <UserCard key={u.id} u={u} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function UserCard({
  u,
  compact,
}: {
  u: ImpersonatableUser;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const go = () => {
    setError(null);
    startTransition(async () => {
      const r = await startImpersonation({ targetUserId: u.id });
      if (!r.ok) setError(r.error ?? "Erro");
      else router.push(r.redirectTo ?? "/painel");
    });
  };

  return (
    <li
      className={`rounded-xl border p-3 ${
        u.ticketsAbertos > 0
          ? "border-warn/40 bg-yellow-50"
          : "border-border bg-bg"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="size-10 shrink-0 rounded-full bg-bg-elev border border-border text-fg-muted flex items-center justify-center text-sm font-bold">
          {(u.nome ?? u.email)[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-wrap mb-0.5">
            <span className="font-semibold text-sm text-fg truncate">
              {u.nome ?? u.email.split("@")[0]}
            </span>
            <span
              className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                ROLE_COLOR[u.role] ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {ROLE_LABEL[u.role] ?? u.role}
            </span>
          </div>
          <div className="text-[10px] text-fg-muted font-mono truncate">
            {u.email}
          </div>
          {u.contextLabel && !compact && (
            <div className="text-[10px] text-fg-dim truncate mt-0.5">
              {u.contextLabel}
            </div>
          )}
          {u.ticketsAbertos > 0 && !compact && (
            <div className="text-[10px] text-warn font-mono font-bold mt-0.5">
              🎫 {u.ticketsAbertos} ticket{u.ticketsAbertos > 1 ? "s" : ""}{" "}
              aberto{u.ticketsAbertos > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
      {error && (
        <p className="text-[10px] text-danger font-semibold mt-2">{error}</p>
      )}
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="mt-3 w-full h-8 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent-dark disabled:opacity-50"
      >
        {pending ? "abrindo…" : "👁 Ver como"}
      </button>
    </li>
  );
}
