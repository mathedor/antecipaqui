"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFilial,
  setFilialAtiva,
  setPossuiFiliais,
  updateUnidade,
  type FilialInput,
  type GrupoImob,
  type UnidadeDetalhe,
} from "@/lib/actions/imobiliaria-filiais";
import { maskCEP, maskCNPJ, maskPhone, UF_LIST } from "@/lib/cnpj";

/* ============================================================
   RAIZ
   ============================================================ */

export function FiliaisManager({ grupo }: { grupo: GrupoImob }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erroFlag, setErroFlag] = useState<string | null>(null);
  const [editando, setEditando] = useState<UnidadeDetalhe | null>(null);
  const [criando, setCriando] = useState(false);

  const matriz = grupo.unidades.find((u) => u.isMatriz);
  const filiais = grupo.unidades.filter((u) => !u.isMatriz);
  const ativas = filiais.filter((f) => f.isActive).length;

  return (
    <>
      {/* ---- Pergunta central do cadastro ---- */}
      <section className="rounded-3xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-fg">
              Esta empresa possui filiais?
            </h2>
            <p className="mt-1 text-sm text-fg-muted max-w-2xl">
              Marque sim para cadastrar as unidades que operam sob este mesmo
              cadastro. Cada filial tem CNPJ próprio, mas todas ficam sob o
              guarda-chuva da matriz e você continua administrando tudo aqui.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ToggleSimNao
              value={grupo.possuiFiliais}
              disabled={!grupo.canManage || pending}
              onChange={(v) => {
                setErroFlag(null);
                startTransition(async () => {
                  const r = await setPossuiFiliais(v);
                  if (!r.ok) setErroFlag(r.error);
                  router.refresh();
                });
              }}
            />
          </div>
        </div>
        {erroFlag && (
          <p className="mt-3 text-xs font-semibold text-danger">{erroFlag}</p>
        )}
      </section>

      {/* ---- Matriz ---- */}
      {matriz && (
        <>
          <div className="eyebrow mb-2">matriz do grupo</div>
          <UnidadeCard
            u={matriz}
            canManage={grupo.canManage}
            onEdit={() => setEditando(matriz)}
          />
        </>
      )}

      {/* ---- Filiais ---- */}
      {grupo.possuiFiliais && (
        <section className="mt-8">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
            <div>
              <div className="eyebrow mb-1">filiais</div>
              <p className="text-sm text-fg-muted">
                {filiais.length === 0
                  ? "Nenhuma filial cadastrada ainda."
                  : `${filiais.length} cadastrada(s) · ${ativas} ativa(s)`}
              </p>
            </div>
            {grupo.canManage && (
              <button
                type="button"
                onClick={() => setCriando(true)}
                className="btn-primary !h-11 !px-5"
              >
                + Cadastrar filial
              </button>
            )}
          </div>

          {filiais.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-fg-muted">
              Cadastre a primeira filial para que ela apareça no seletor de
              unidade ao criar uma operação.
            </div>
          ) : (
            <ul className="space-y-3">
              {filiais.map((f) => (
                <li key={f.id}>
                  <UnidadeCard
                    u={f}
                    canManage={grupo.canManage}
                    onEdit={() => setEditando(f)}
                    onToggleAtiva={() => {
                      startTransition(async () => {
                        await setFilialAtiva(f.id, !f.isActive);
                        router.refresh();
                      });
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {criando && (
        <UnidadeModal
          titulo="Cadastrar filial"
          onClose={() => setCriando(false)}
          onSave={async (input) => createFilial(input)}
        />
      )}
      {editando && (
        <UnidadeModal
          titulo={editando.isMatriz ? "Editar matriz" : "Editar filial"}
          unidade={editando}
          onClose={() => setEditando(null)}
          onSave={async (input) => updateUnidade(editando.id, input)}
        />
      )}
    </>
  );
}

/* ============================================================
   CARD DE UNIDADE
   ============================================================ */

function UnidadeCard({
  u,
  canManage,
  onEdit,
  onToggleAtiva,
}: {
  u: UnidadeDetalhe;
  canManage: boolean;
  onEdit: () => void;
  onToggleAtiva?: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border bg-bg-elev p-4 md:p-5 ${
        u.isActive ? "border-border" : "border-border opacity-60"
      }`}
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-fg">
              {u.apelido?.trim() || u.nomeFantasia?.trim() || u.razaoSocial}
            </h3>
            <Tag tone={u.isMatriz ? "accent" : "blue"}>
              {u.isMatriz ? "Matriz" : "Filial"}
            </Tag>
            {!u.isActive && <Tag tone="muted">Desativada</Tag>}
            {u.operaEmNomeDaMatriz && (
              <Tag tone="purple">Opera pelo CNPJ da matriz</Tag>
            )}
          </div>
          <div className="mt-1 text-xs text-fg-muted">{u.razaoSocial}</div>
          <div className="mt-1 text-xs text-fg-muted font-mono">
            {maskCNPJ(u.cnpj)}
            {(u.cidade || u.uf) &&
              ` · ${[u.cidade, u.uf].filter(Boolean).join("/")}`}
            {u.telefone && ` · ${maskPhone(u.telefone)}`}
          </div>
          <div className="mt-2 flex gap-3 text-[11px] font-mono text-fg-dim">
            <span>{u.totalOperacoes} operação(ões)</span>
            <span>{u.totalMembros} membro(s)</span>
          </div>
        </div>

        {canManage && (
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="text-xs px-2.5 py-1 rounded-lg border border-border bg-bg-card hover:border-accent hover:text-accent"
            >
              editar
            </button>
            {onToggleAtiva && (
              <button
                type="button"
                onClick={() => {
                  if (
                    u.isActive &&
                    !confirm(
                      `Desativar ${u.razaoSocial}? Ela some do seletor de nova operação, mas o histórico continua visível.`,
                    )
                  )
                    return;
                  onToggleAtiva();
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border ${
                  u.isActive
                    ? "border-danger/30 text-danger hover:bg-red-50"
                    : "border-success/30 text-success hover:bg-green-50"
                }`}
              >
                {u.isActive ? "desativar" : "reativar"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   MODAL DE CADASTRO / EDIÇÃO
   ============================================================ */

type SaveFn = (
  input: FilialInput,
) => Promise<{ ok: true; id?: string } | { ok: false; error: string }>;

function UnidadeModal({
  titulo,
  unidade,
  onClose,
  onSave,
}: {
  titulo: string;
  unidade?: UnidadeDetalhe;
  onClose: () => void;
  onSave: SaveFn;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isMatriz = unidade?.isMatriz ?? false;

  const [f, setF] = useState<FilialInput>({
    razaoSocial: unidade?.razaoSocial ?? "",
    nomeFantasia: unidade?.nomeFantasia ?? "",
    apelido: unidade?.apelido ?? "",
    cnpj: unidade ? maskCNPJ(unidade.cnpj) : "",
    creciResponsavel: unidade?.creciResponsavel ?? "",
    telefone: unidade?.telefone ?? "",
    cep: unidade?.cep ?? "",
    endereco: unidade?.endereco ?? "",
    cidade: unidade?.cidade ?? "",
    uf: unidade?.uf ?? "",
    operaEmNomeDaMatriz: unidade?.operaEmNomeDaMatriz ?? false,
    bancoNome: unidade?.bancoNome ?? "",
    bancoCodigo: unidade?.bancoCodigo ?? "",
    bancoAgencia: unidade?.bancoAgencia ?? "",
    bancoConta: unidade?.bancoConta ?? "",
  });

  const set = <K extends keyof FilialInput>(k: K, v: FilialInput[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  // Busca endereço pelo CEP (mesma API usada no onboarding).
  const [buscandoCep, setBuscandoCep] = useState(false);
  async function buscarCepAgora(cepRaw: string) {
    const cep = cepRaw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        localidade?: string;
        uf?: string;
      };
      if (!j.erro) {
        setF((prev) => ({
          ...prev,
          endereco: prev.endereco || j.logradouro || "",
          cidade: j.localidade || prev.cidade,
          uf: j.uf || prev.uf,
        }));
      }
    } catch {
      /* best-effort */
    } finally {
      setBuscandoCep(false);
    }
  }

  const precisaBanco = !f.operaEmNomeDaMatriz;

  return (
    <Modal onClose={onClose}>
      <h3 className="text-xl font-bold mb-1">{titulo}</h3>
      <p className="text-xs text-fg-muted mb-4">
        Os dados abaixo saem no contrato de cessão das operações originadas por
        esta unidade.
      </p>

      <div className="space-y-3">
        <Field label="Apelido interno (ex: Filial Curitiba)">
          <Input
            value={f.apelido ?? ""}
            onChange={(v) => set("apelido", v)}
            placeholder={isMatriz ? "Matriz" : "Filial …"}
          />
        </Field>
        <Field label="Razão social *">
          <Input
            value={f.razaoSocial}
            onChange={(v) => set("razaoSocial", v)}
          />
        </Field>
        <Field label="Nome fantasia">
          <Input
            value={f.nomeFantasia ?? ""}
            onChange={(v) => set("nomeFantasia", v)}
          />
        </Field>
        <Field label="CNPJ *">
          <Input
            value={f.cnpj}
            onChange={(v) => set("cnpj", maskCNPJ(v))}
            placeholder="00.000.000/0000-00"
            mono
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="CEP">
            <Input
              value={f.cep ?? ""}
              onChange={(v) => {
                const masked = maskCEP(v);
                set("cep", masked);
                void buscarCepAgora(masked);
              }}
              placeholder="00000-000"
              mono
            />
            {buscandoCep && (
              <p className="text-[10px] text-fg-dim mt-1">buscando…</p>
            )}
          </Field>
          <Field label="Telefone">
            <Input
              value={f.telefone ?? ""}
              onChange={(v) => set("telefone", maskPhone(v))}
              placeholder="(00) 0000-0000"
              mono
            />
          </Field>
        </div>

        <Field label="Endereço">
          <Input
            value={f.endereco ?? ""}
            onChange={(v) => set("endereco", v)}
          />
        </Field>

        <div className="grid grid-cols-[1fr_88px] gap-3">
          <Field label="Cidade">
            <Input value={f.cidade ?? ""} onChange={(v) => set("cidade", v)} />
          </Field>
          <Field label="UF">
            <select
              value={f.uf ?? ""}
              onChange={(e) => set("uf", e.target.value)}
              className="w-full h-10 px-2 rounded-lg border border-border bg-bg text-sm"
            >
              <option value="">—</option>
              {UF_LIST.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="CRECI do responsável">
          <Input
            value={f.creciResponsavel ?? ""}
            onChange={(v) => set("creciResponsavel", v)}
          />
        </Field>

        {/* ---- Modo de operação (só filial) ---- */}
        {!isMatriz && (
          <div className="rounded-xl border border-border bg-bg-card p-3">
            <span className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-2">
              Como esta filial opera
            </span>
            <div className="space-y-2">
              <RadioLinha
                checked={!f.operaEmNomeDaMatriz}
                onSelect={() => set("operaEmNomeDaMatriz", false)}
                titulo="Com o CNPJ próprio"
                desc="O contrato de cessão sai no CNPJ e na conta bancária desta filial."
              />
              <RadioLinha
                checked={f.operaEmNomeDaMatriz}
                onSelect={() => set("operaEmNomeDaMatriz", true)}
                titulo="Em nome da matriz"
                desc="O contrato sai no CNPJ e na conta da matriz; a filial fica registrada como unidade originadora."
              />
            </div>
          </div>
        )}

        {/* ---- Dados bancários ---- */}
        {precisaBanco && (
          <div className="rounded-xl border border-border bg-bg-card p-3 space-y-3">
            <span className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block">
              Conta que recebe a antecipação
            </span>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <Field label="Banco *">
                <Input
                  value={f.bancoNome ?? ""}
                  onChange={(v) => set("bancoNome", v)}
                />
              </Field>
              <Field label="Código">
                <Input
                  value={f.bancoCodigo ?? ""}
                  onChange={(v) => set("bancoCodigo", v)}
                  mono
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Agência *">
                <Input
                  value={f.bancoAgencia ?? ""}
                  onChange={(v) => set("bancoAgencia", v)}
                  mono
                />
              </Field>
              <Field label="Conta *">
                <Input
                  value={f.bancoConta ?? ""}
                  onChange={(v) => set("bancoConta", v)}
                  mono
                />
              </Field>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-danger font-semibold">{error}</p>}

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
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await onSave(f);
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                onClose();
                router.refresh();
              });
            }}
            className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
          >
            {pending ? "salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   PRIMITIVOS
   ============================================================ */

function ToggleSimNao({
  value,
  disabled,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="inline-flex p-1 bg-bg-card border border-border rounded-xl">
      {[
        { v: false, label: "Não" },
        { v: true, label: "Sim" },
      ].map((o) => (
        <button
          key={String(o.v)}
          type="button"
          disabled={disabled}
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={`px-5 h-9 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
            value === o.v
              ? "bg-accent text-white shadow-sm"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RadioLinha({
  checked,
  onSelect,
  titulo,
  desc,
}: {
  checked: boolean;
  onSelect: () => void;
  titulo: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
        checked
          ? "border-accent bg-accent-soft"
          : "border-border bg-bg hover:border-border-strong"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 size-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
            checked ? "border-accent" : "border-border-strong"
          }`}
        >
          {checked && <span className="size-2 rounded-full bg-accent" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-fg">{titulo}</span>
          <span className="block text-[11px] text-fg-muted">{desc}</span>
        </span>
      </div>
    </button>
  );
}

function Tag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "accent" | "blue" | "purple" | "muted";
}) {
  const cls = {
    accent: "bg-accent text-white",
    blue: "bg-blue-600 text-white",
    purple: "bg-purple-600 text-white",
    muted: "bg-bg-card text-fg-muted border border-border",
  }[tone];
  return (
    <span
      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${cls}`}
    >
      {children}
    </span>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm ${
        mono ? "font-mono" : ""
      }`}
    />
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
      <div className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-bg-elev shadow-2xl p-5 md:p-6">
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
