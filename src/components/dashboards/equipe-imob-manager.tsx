"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addMembroImob,
  type AddMembroResult,
  type MembroLista,
  removeMembro,
  updateMembroRole,
} from "@/lib/actions/imobiliaria-membros";
import {
  INTERNAL_ROLE_LABEL,
  type ImobInternalRole,
} from "@/lib/imobiliaria-perms";

const ROLES_CONVIDA: ImobInternalRole[] = [
  "gerente",
  "corretor",
  "financeiro",
];

const ROLE_DESC: Record<ImobInternalRole, string> = {
  owner: "Dono — tudo, inclusive equipe",
  gerente: "Vê tudo, gerencia operações, sem editar config",
  corretor: "CRM + atendimentos próprios + operações onde é atendente",
  financeiro: "Extrato consolidado + comissões, sem CRM",
};

const ROLE_COLOR: Record<ImobInternalRole, string> = {
  owner: "bg-accent text-white",
  gerente: "bg-purple-600 text-white",
  corretor: "bg-blue-600 text-white",
  financeiro: "bg-green-600 text-white",
};

export function EquipeImobManager({
  membros,
  canManage,
}: {
  membros: MembroLista[];
  canManage: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      {canManage && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary !h-11 !px-5"
          >
            + Convidar membro
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {membros.map((m) => (
          <MembroRow key={m.userId} m={m} canManage={canManage} />
        ))}
      </ul>

      {membros.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-fg-muted">
          Sem membros cadastrados ainda.
        </div>
      )}

      {showForm && (
        <ConvidarModal onClose={() => setShowForm(false)} />
      )}
    </>
  );
}

function MembroRow({
  m,
  canManage,
}: {
  m: MembroLista;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingRole, setEditingRole] = useState(false);

  return (
    <li className="rounded-2xl border border-border bg-bg-elev p-4 md:p-5">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="size-12 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center text-lg font-bold">
          {(m.nome ?? m.email)[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-fg">{m.nome ?? "(sem nome)"}</h3>
            <span
              className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${ROLE_COLOR[m.roleInterna]}`}
            >
              {INTERNAL_ROLE_LABEL[m.roleInterna]}
            </span>
          </div>
          <div className="text-xs text-fg-muted font-mono">
            {m.email}
            {m.telefone && ` · ${m.telefone}`}
          </div>
          {m.addedAt && (
            <div className="text-[10px] text-fg-dim font-mono mt-1">
              adicionado em{" "}
              {new Date(m.addedAt).toLocaleDateString("pt-BR")}
            </div>
          )}
        </div>
        {canManage && !m.isOwner && m.id && (
          <div className="flex gap-1.5 shrink-0">
            {editingRole ? (
              <>
                <select
                  defaultValue={m.roleInterna}
                  onChange={(e) => {
                    const v = e.target.value as ImobInternalRole;
                    startTransition(async () => {
                      await updateMembroRole({
                        membroId: m.id!,
                        roleInterna: v,
                      });
                      router.refresh();
                      setEditingRole(false);
                    });
                  }}
                  disabled={pending}
                  className="h-8 px-2 rounded-lg border border-border bg-bg text-xs"
                >
                  {ROLES_CONVIDA.map((r) => (
                    <option key={r} value={r}>
                      {INTERNAL_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setEditingRole(false)}
                  className="text-xs px-2 py-1 rounded border border-border text-fg-muted hover:text-fg"
                >
                  cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditingRole(true)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-border bg-bg-card hover:border-accent hover:text-accent"
                >
                  trocar role
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm(`Remover ${m.nome ?? m.email} do time?`))
                      return;
                    startTransition(async () => {
                      await removeMembro(m.id!);
                      router.refresh();
                    });
                  }}
                  disabled={pending}
                  className="text-xs px-2.5 py-1 rounded-lg border border-danger/30 text-danger hover:bg-red-50"
                >
                  remover
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function ConvidarModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AddMembroResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [role, setRole] = useState<ImobInternalRole>("corretor");

  if (result?.ok) {
    return (
      <Modal onClose={onClose}>
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-success">
            ✓ Membro adicionado
          </h3>
          {result.reaproveitouUser ? (
            <p className="text-sm text-fg-muted">
              O email já tinha conta no Antecipaqui. Vinculei à sua imob com
              role <strong>{INTERNAL_ROLE_LABEL[role]}</strong>.
            </p>
          ) : (
            <div className="rounded-xl border border-accent/30 bg-accent-soft p-3 space-y-2">
              <p className="text-sm">
                Conta criada. Mande essas credenciais por WhatsApp pro membro
                acessar:
              </p>
              <div className="font-mono text-xs space-y-1">
                <div>
                  <strong>email:</strong> {email}
                </div>
                <div>
                  <strong>senha:</strong> {result.senhaTemp}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            {result.whatsappLink && (
              <a
                href={result.whatsappLink}
                target="_blank"
                rel="noopener"
                className="flex-1 inline-flex items-center justify-center gap-1 h-10 rounded-lg bg-success text-white text-sm font-semibold hover:bg-success/90"
              >
                💬 Abrir WhatsApp pronto
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                router.refresh();
              }}
              className="inline-flex items-center justify-center px-4 h-10 rounded-lg border border-border text-fg-muted hover:text-fg"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-xl font-bold mb-4">Convidar membro</h3>
      <div className="space-y-3">
        <Field label="Nome completo *">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm"
          />
        </Field>
        <Field label="Email * (vira o login)">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm"
          />
        </Field>
        <Field label="Telefone (WhatsApp)">
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm"
          />
        </Field>
        <Field label="Role interna *">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ImobInternalRole)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm"
          >
            {ROLES_CONVIDA.map((r) => (
              <option key={r} value={r}>
                {INTERNAL_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-fg-muted mt-1">{ROLE_DESC[role]}</p>
        </Field>
        {error && (
          <p className="text-xs text-danger font-semibold">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-border text-fg-muted hover:text-fg text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              if (!nome.trim() || !email.trim()) {
                setError("Nome e email obrigatórios");
                return;
              }
              startTransition(async () => {
                const r = await addMembroImob({
                  nome,
                  email,
                  telefone,
                  roleInterna: role,
                });
                if (!r.ok) setError(r.error ?? "Erro");
                else setResult(r);
              });
            }}
            disabled={pending}
            className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
          >
            {pending ? "convidando…" : "Convidar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-bg-elev shadow-2xl p-5 md:p-6">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
