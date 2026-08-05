"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gerarTokenColetaComprador } from "@/lib/actions/corretor-velocidade";
import { useFeedback } from "@/components/feedback-provider";
import { agoraMs } from "@/lib/agora";

type TokenRow = {
  id: string;
  token: string;
  preenchidoEm: Date | string | null;
  expiresAt: Date | string;
  createdAt: Date | string;
  dadosColetados: Record<string, unknown> | null;
};

function fmtDT(d: Date | string | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ColetaCompradorManager({ tokens }: { tokens: TokenRow[] }) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  // Foto do relógio na montagem — ver comentário em @/lib/agora.
  const [agora] = useState(() => agoraMs());
  const [newLink, setNewLink] = useState<{
    url: string;
    expiresAt: Date | string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);

  async function gerar() {
    setGenerating(true);
    try {
      const r = await gerarTokenColetaComprador();
      setNewLink({ url: r.url, expiresAt: r.expiresAt });
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function copiar(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      await alertSuccess("Link copiado.", "Pronto");
    } catch {
      /* ignora */
    }
  }

  function whatsapp(url: string) {
    const txt = `Oi! Pra eu emitir os boletos da sua compra, preciso dos seus dados. Preencha rapidinho aqui (válido por 24h): ${url}`;
    return `https://wa.me/?text=${encodeURIComponent(txt)}`;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-accent/40 bg-accent-soft p-6">
        <h2 className="font-bold mb-3">Gerar novo link</h2>
        <p className="text-sm text-fg-muted mb-4">
          Um link único, válido por 24h. Mande pro comprador via WhatsApp ou
          QR Code. Quando ele preencher, os dados aparecem aqui pra você usar
          na operação.
        </p>
        <button
          type="button"
          disabled={generating}
          onClick={gerar}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
        >
          {generating ? "Gerando..." : "🔗 Gerar link"}
        </button>

        {newLink && (
          <div className="mt-4 p-4 rounded-xl bg-bg border border-border">
            <div className="text-xs text-fg-muted mb-2">
              Link válido até {fmtDT(newLink.expiresAt)}:
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <code className="font-mono text-xs bg-bg-card px-3 py-2 rounded-lg flex-1 min-w-0 truncate">
                {newLink.url}
              </code>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => copiar(newLink.url)}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:border-accent hover:text-accent"
              >
                📋 Copiar
              </button>
              <a
                href={whatsapp(newLink.url)}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:border-accent hover:text-accent"
              >
                📲 WhatsApp
              </a>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(newLink.url)}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:border-accent hover:text-accent"
              >
                🔳 QR Code
              </a>
            </div>
          </div>
        )}
      </section>

      <section>
        <h3 className="font-bold mb-3">Links recentes</h3>
        {tokens.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-sm text-fg-muted">
            Nenhum link gerado ainda.
          </div>
        ) : (
          <ul className="space-y-2">
            {tokens.map((t) => {
              const expirou = new Date(t.expiresAt).getTime() < agora;
              const url =
                typeof window !== "undefined"
                  ? `${window.location.origin}/coleta-comprador/${t.token}`
                  : `/coleta-comprador/${t.token}`;
              const dados = t.dadosColetados;
              return (
                <li
                  key={t.id}
                  className={`px-4 py-3 rounded-xl border ${
                    t.preenchidoEm
                      ? "border-success/40 bg-green-50"
                      : expirou
                        ? "border-border bg-bg-card opacity-60"
                        : "border-border bg-bg-elev"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="text-xs text-fg-muted font-mono mb-1">
                        Criado em {fmtDT(t.createdAt)} · expira em{" "}
                        {fmtDT(t.expiresAt)}
                      </div>
                      {t.preenchidoEm && dados ? (
                        <div>
                          <div className="font-bold text-sm text-success">
                            ✓ Preenchido em {fmtDT(t.preenchidoEm)}
                          </div>
                          <div className="text-xs mt-1">
                            {(dados.nome as string) ?? "—"} ·{" "}
                            <span className="font-mono">
                              {(dados.documento as string) ?? "—"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-fg-muted">
                          {expirou ? "Expirado" : "Aguardando preenchimento"}
                        </div>
                      )}
                    </div>
                    {!expirou && !t.preenchidoEm && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => copiar(url)}
                          className="text-xs text-accent hover:underline"
                        >
                          copiar
                        </button>
                        <a
                          href={whatsapp(url)}
                          target="_blank"
                          rel="noopener"
                          className="text-xs text-accent hover:underline"
                        >
                          whatsapp
                        </a>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
