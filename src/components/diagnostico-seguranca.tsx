"use client";

/**
 * PAINEL DE DIAGNÓSTICO — o rosto dos robôs.
 *
 * Um botão dispara todos os checks; o resultado vem agrupado por área com
 * um farol (verde/amarelo/vermelho) e o detalhe + recomendação de cada um.
 * Serve o admin e o fundo — a action de disparo é injetada por prop.
 */
import { useState, useTransition } from "react";
import type {
  DiagnosticoResultado,
  Severidade,
} from "@/lib/seguranca/tipos";

type Props = {
  /** Server action que roda os robôs e devolve o resultado (ou erro). */
  rodar: () => Promise<DiagnosticoResultado | { erro: string }>;
  /** Diagnóstico já rodado no server (primeira pintura). Opcional. */
  inicial?: DiagnosticoResultado | null;
};

const ESTILO: Record<
  Severidade,
  { chip: string; ponto: string; rotulo: string }
> = {
  ok: {
    chip: "bg-green-50 text-green-700 border-green-200",
    ponto: "bg-green-500",
    rotulo: "OK",
  },
  atencao: {
    chip: "bg-yellow-50 text-yellow-800 border-yellow-200",
    ponto: "bg-yellow-500",
    rotulo: "Atenção",
  },
  falha: {
    chip: "bg-red-50 text-red-700 border-red-200",
    ponto: "bg-red-500",
    rotulo: "Falha",
  },
  erro: {
    chip: "bg-gray-100 text-gray-600 border-gray-300",
    ponto: "bg-gray-400",
    rotulo: "Sem leitura",
  },
};

function Farol({ status }: { status: Severidade }) {
  const e = ESTILO[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${e.chip}`}
    >
      <span className={`h-2 w-2 rounded-full ${e.ponto}`} />
      {e.rotulo}
    </span>
  );
}

function veredito(status: Severidade): { titulo: string; sub: string; cor: string } {
  switch (status) {
    case "ok":
      return {
        titulo: "Tudo em ordem",
        sub: "Nenhuma fragilidade encontrada nas áreas verificadas.",
        cor: "text-green-700",
      };
    case "atencao":
      return {
        titulo: "Funciona, mas com pontos de atenção",
        sub: "Nada quebrado, mas há itens que pedem ajuste.",
        cor: "text-yellow-700",
      };
    case "erro":
      return {
        titulo: "Diagnóstico incompleto",
        sub: "Alguns robôs não conseguiram rodar — verifique os itens cinza.",
        cor: "text-gray-700",
      };
    default:
      return {
        titulo: "Requer ação imediata",
        sub: "Há falhas que expõem ou travam o sistema.",
        cor: "text-red-700",
      };
  }
}

export function DiagnosticoSeguranca({ rodar, inicial }: Props) {
  const [res, setRes] = useState<DiagnosticoResultado | null>(inicial ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function disparar() {
    setErro(null);
    start(async () => {
      const r = await rodar();
      if ("erro" in r) {
        setErro(r.erro);
        setRes(null);
      } else {
        setRes(r);
      }
    });
  }

  const v = res ? veredito(res.status) : null;

  return (
    <div className="space-y-6">
      {/* Barra de disparo */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-bg-elev p-5">
        <div>
          <h2 className="text-lg font-semibold">Rodar diagnóstico</h2>
          <p className="text-sm text-fg-muted">
            Dispara todos os robôs de uma vez e mostra área por área o que está
            OK, o que pede atenção e o que quebrou.
          </p>
        </div>
        <button
          onClick={disparar}
          disabled={pending}
          className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {pending ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Rodando robôs…
            </>
          ) : (
            <>▶ Rodar agora</>
          )}
        </button>
      </div>

      {erro && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
          {erro}
        </div>
      )}

      {res && v && (
        <>
          {/* Veredito geral */}
          <div className="rounded-2xl border border-border bg-bg-elev p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Farol status={res.status} />
                <div>
                  <div className={`text-xl font-bold ${v.cor}`}>{v.titulo}</div>
                  <div className="text-sm text-fg-muted">{v.sub}</div>
                </div>
              </div>
              <dl className="flex gap-5 text-center">
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-fg-dim">OK</dt>
                  <dd className="text-2xl font-bold text-green-600">{res.contagem.ok}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-fg-dim">Atenção</dt>
                  <dd className="text-2xl font-bold text-yellow-600">{res.contagem.atencao}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-fg-dim">Falha</dt>
                  <dd className="text-2xl font-bold text-red-600">{res.contagem.falha}</dd>
                </div>
              </dl>
            </div>
            <p className="mt-4 text-xs text-fg-dim">
              Rodado em {new Date(res.geradoEm).toLocaleString("pt-BR")} ·{" "}
              {res.duracaoMs} ms · {res.areas.length} áreas verificadas
            </p>
          </div>

          {/* Áreas */}
          <div className="grid gap-4 md:grid-cols-2">
            {res.areas.map((a) => (
              <div
                key={a.area}
                className="rounded-2xl border border-border bg-bg-elev overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                  <h3 className="font-semibold">{a.area}</h3>
                  <Farol status={a.status} />
                </div>
                <ul className="divide-y divide-border">
                  {a.checks.map((c) => {
                    const e = ESTILO[c.status];
                    return (
                      <li key={c.id} className="px-5 py-3">
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.ponto}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">
                                {c.titulo}
                              </span>
                              {c.metrica && (
                                <span className="shrink-0 font-mono text-xs text-fg-muted">
                                  {c.metrica}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-fg-muted">{c.detalhe}</p>
                            {c.recomendacao && c.status !== "ok" && (
                              <p className="mt-1 text-xs text-fg-dim">
                                → {c.recomendacao}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {!res && !erro && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-fg-muted">
          Clique em <strong>Rodar agora</strong> para os robôs varrerem o
          sistema.
        </div>
      )}
    </div>
  );
}
