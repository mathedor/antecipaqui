"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  limparFalhasResolvidas,
  marcarFalhaResolvida,
  revalidarDominioEmail,
  type EmailHealth,
} from "@/lib/actions/email-health";

const STATUS_TOM: Record<string, { rotulo: string; classe: string }> = {
  verified: { rotulo: "Verificado", classe: "bg-success text-white" },
  pending: { rotulo: "Verificando…", classe: "bg-warn text-white" },
  failed: { rotulo: "Falhou", classe: "bg-danger text-white" },
  not_started: { rotulo: "Não cadastrado", classe: "bg-danger text-white" },
  temporary_failure: { rotulo: "Falha temporária", classe: "bg-warn text-white" },
  desconhecido: {
    rotulo: "Desconhecido",
    classe: "bg-bg-card text-fg-muted border border-border",
  },
};

export function AdminEntregabilidade({ health }: { health: EmailHealth }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const tom = STATUS_TOM[health.statusDominio] ?? STATUS_TOM.desconhecido;
  const saudavel = health.statusDominio === "verified" && health.apiKeyConfigurada;

  return (
    <div className="space-y-6">
      {/* ---- Estado do domínio ---- */}
      <section
        className={`rounded-3xl border p-5 md:p-6 ${
          saudavel
            ? "border-success/40 bg-green-50/60"
            : "border-danger/40 bg-red-50/60"
        }`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-fg">
                {saudavel
                  ? "A plataforma está entregando e-mail"
                  : "A plataforma NÃO está entregando e-mail"}
              </h2>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${tom.classe}`}
              >
                {tom.rotulo}
              </span>
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              Remetente:{" "}
              <span className="font-mono text-fg">{health.remetente}</span>
            </p>
            {health.erroConsulta && (
              <p className="mt-2 text-sm font-semibold text-danger">
                {health.erroConsulta}
              </p>
            )}
            {!saudavel && !health.erroConsulta && (
              <p className="mt-2 text-sm text-fg-muted max-w-2xl">
                Enquanto o domínio não estiver verificado, o provedor recusa
                todos os envios. Publique os registros pendentes no DNS e clique
                em revalidar.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={pending || !health.apiKeyConfigurada}
            onClick={() => {
              setMsg(null);
              startTransition(async () => {
                const r = await revalidarDominioEmail();
                setMsg(
                  r.ok
                    ? `Revalidação pedida — status atual: ${r.status}. A verificação é assíncrona, recarregue em ~1 minuto.`
                    : `Erro: ${r.error}`,
                );
                router.refresh();
              });
            }}
            className="btn-primary !h-11 !px-5 shrink-0 disabled:opacity-50"
          >
            {pending ? "revalidando…" : "Revalidar domínio"}
          </button>
        </div>

        {msg && (
          <p className="mt-3 text-sm rounded-xl border border-border bg-bg-elev px-3 py-2">
            {msg}
          </p>
        )}
      </section>

      {/* ---- Registros de DNS ---- */}
      {health.registros.length > 0 && (
        <section className="rounded-3xl border border-border bg-bg-elev p-5 md:p-6">
          <h2 className="text-lg font-bold text-fg mb-1">
            Registros de DNS exigidos
          </h2>
          <p className="text-sm text-fg-muted mb-4">
            Todos precisam estar <strong>verified</strong>. Os que não estiverem
            devem ser publicados no DNS do domínio.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider font-mono text-fg-dim border-b border-border">
                  <th className="pb-2 pr-3">Tipo</th>
                  <th className="pb-2 pr-3">Nome</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {health.registros.map((r, i) => (
                  <tr key={i} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 font-mono text-xs">{r.tipo}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.nome}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                          r.status === "verified"
                            ? "bg-success text-white"
                            : "bg-danger text-white"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-[11px] break-all text-fg-muted max-w-md">
                      {r.valor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---- Falhas registradas ---- */}
      <section className="rounded-3xl border border-border bg-bg-elev p-5 md:p-6">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-lg font-bold text-fg">
              E-mails que não saíram
            </h2>
            <p className="text-sm text-fg-muted">
              {health.falhasAbertas === 0
                ? "Nenhuma falha em aberto."
                : `${health.falhasAbertas} falha(s) em aberto — cada uma é um e-mail que o destinatário não recebeu.`}
            </p>
          </div>
          {health.falhasAbertas > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm("Marcar todas as falhas como resolvidas?")) return;
                startTransition(async () => {
                  await limparFalhasResolvidas();
                  router.refresh();
                });
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-bg-card hover:border-accent hover:text-accent"
            >
              marcar todas como resolvidas
            </button>
          )}
        </div>

        {health.ultimasFalhas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-8 text-center text-fg-muted text-sm">
            Nada por aqui — todo envio recente foi aceito pelo provedor.
          </div>
        ) : (
          <ul className="space-y-2">
            {health.ultimasFalhas.map((f) => (
              <li
                key={f.id}
                className="rounded-2xl border border-border bg-bg-card p-3 md:p-4"
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-fg text-sm">
                      {f.assunto}
                    </div>
                    <div className="text-xs text-fg-muted font-mono">
                      {f.destinatario}
                      {f.contexto && ` · ${f.contexto}`}
                    </div>
                    <div className="mt-1 text-xs text-danger break-words">
                      {f.erro}
                    </div>
                    <div className="mt-1 text-[10px] text-fg-dim font-mono">
                      {new Date(f.createdAt).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await marcarFalhaResolvida(f.id);
                        router.refresh();
                      });
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-border hover:border-accent hover:text-accent shrink-0"
                  >
                    resolver
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
