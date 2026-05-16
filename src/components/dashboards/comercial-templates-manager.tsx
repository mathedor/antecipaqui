"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
} from "@/lib/actions/comercial-templates";
import {
  TIPO_LABEL,
  type TemplateTipo,
  VARIAVEIS_DISPONIVEIS,
} from "@/lib/comercial-templates-types";
import type { ComercialTemplate } from "@/db/schema";

const TIPOS: TemplateTipo[] = [
  "reativar",
  "empurrar",
  "parabenizar",
  "investigar",
  "followup",
  "livre",
];

export function TemplatesManager({
  initialTemplates,
}: {
  initialTemplates: ComercialTemplate[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ComercialTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);

  const byTipo = TIPOS.reduce(
    (acc, t) => {
      acc[t] = initialTemplates.filter((tpl) => tpl.tipo === t);
      return acc;
    },
    {} as Record<TemplateTipo, ComercialTemplate[]>,
  );

  const refresh = () => router.refresh();

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary !h-11 !px-5"
        >
          + Novo template
        </button>
      </div>

      <div className="space-y-6">
        {TIPOS.map((tipo) => (
          <section
            key={tipo}
            className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6"
          >
            <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
                  tipo
                </div>
                <h2 className="font-bold tracking-tight text-base">
                  {TIPO_LABEL[tipo]}
                </h2>
              </div>
              <span className="text-xs text-fg-muted font-mono">
                {byTipo[tipo].length}{" "}
                {byTipo[tipo].length === 1 ? "template" : "templates"}
              </span>
            </div>
            {byTipo[tipo].length === 0 ? (
              <p className="text-sm text-fg-muted py-3">
                Nenhum template salvo. Vai usar a mensagem padrão da plataforma.
              </p>
            ) : (
              <ul className="space-y-2">
                {byTipo[tipo].map((t) => (
                  <li
                    key={t.id}
                    className={`rounded-lg border p-3 ${
                      t.isDefault
                        ? "border-success/40 bg-green-50"
                        : "border-border bg-bg"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-fg">
                            {t.nome}
                          </span>
                          {t.isDefault && (
                            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-success text-white">
                              ✓ default
                            </span>
                          )}
                          {t.usadoCount > 0 && (
                            <span className="text-[9px] font-mono text-fg-dim">
                              usado {t.usadoCount}x
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(t);
                            setShowForm(true);
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg border border-border bg-bg-card text-fg hover:border-accent hover:text-accent"
                        >
                          editar
                        </button>
                        <DeleteButton id={t.id} onDone={refresh} />
                      </div>
                    </div>
                    <p className="text-sm text-fg-muted whitespace-pre-line">
                      {t.conteudo}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {showForm && (
        <TemplateModal
          template={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onDone={refresh}
        />
      )}
    </>
  );
}

function DeleteButton({
  id,
  onDone,
}: {
  id: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await deleteTemplate(id);
              onDone();
            })
          }
          disabled={pending}
          className="text-xs px-2.5 py-1 rounded-lg bg-danger text-white hover:bg-danger/90 disabled:opacity-50"
        >
          {pending ? "removendo…" : "confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs px-2.5 py-1 rounded-lg border border-border text-fg-muted hover:text-fg"
        >
          cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs px-2.5 py-1 rounded-lg border border-danger/30 text-danger hover:bg-red-50"
    >
      remover
    </button>
  );
}

function TemplateModal({
  template,
  onClose,
  onDone,
}: {
  template: ComercialTemplate | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState(template?.nome ?? "");
  const [tipo, setTipo] = useState<TemplateTipo>(
    (template?.tipo as TemplateTipo) ?? "reativar",
  );
  const [conteudo, setConteudo] = useState(template?.conteudo ?? "");
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);

  const submit = () => {
    setError(null);
    if (!nome.trim()) {
      setError("Nome obrigatório");
      return;
    }
    if (!conteudo.trim()) {
      setError("Conteúdo obrigatório");
      return;
    }
    startTransition(async () => {
      try {
        if (template) {
          await updateTemplate({
            id: template.id,
            nome,
            tipo,
            conteudo,
            isDefault,
          });
        } else {
          await createTemplate({ nome, tipo, conteudo, isDefault });
        }
        onDone();
        onClose();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const insertVar = (key: string) => {
    setConteudo((prev) => `${prev}{${key}}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-bg-elev shadow-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-2 mb-4">
          <h3 className="font-bold text-lg text-fg">
            {template ? "Editar template" : "Novo template"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full border border-border flex items-center justify-center text-fg-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
              nome (interno)
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex: Reativação amigável"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
              tipo de ação
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TemplateTipo)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim">
                conteúdo
              </label>
              <div className="text-[10px] text-fg-dim">
                clique pra inserir:
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {VARIAVEIS_DISPONIVEIS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVar(v.key)}
                  title={v.desc}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-bg-card text-fg-muted hover:border-accent hover:text-accent"
                >
                  {"{"}
                  {v.key}
                  {"}"}
                </button>
              ))}
            </div>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={5}
              placeholder="Oi {nome}, notei que faz {dias_inativa} dias..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm resize-y font-mono"
            />
          </div>

          {tipo !== "livre" && (
            <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              <span>
                Usar como template padrão pra ação{" "}
                <strong>{TIPO_LABEL[tipo]}</strong>
              </span>
            </label>
          )}

          {error && (
            <p className="text-xs text-danger font-semibold">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border text-fg-muted text-sm font-medium hover:text-fg"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
            >
              {pending ? "salvando…" : template ? "salvar" : "criar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
