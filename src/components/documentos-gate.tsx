"use client";

/**
 * DESBLOQUEIO DE DOCUMENTOS — o rosto do step-up por senha.
 *
 * Ao carregar o painel, checa se a sessão já desbloqueou os documentos. Se
 * não, oferece o modal pra confirmar a senha de login. Depois de desbloquear,
 * recarrega pra que contratos, comprovantes e imagens passem a abrir.
 *
 * Discreto de propósito: dá pra adiar ("Agora não") e reabrir pelo cadeado
 * flutuante — não trava o resto do trabalho, só o acesso a arquivo.
 */
import { useEffect, useState } from "react";

export function DocumentosGate() {
  const [estado, setEstado] = useState<"checando" | "ok" | "bloqueado">(
    "checando",
  );
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/documentos/status")
      .then((r) => r.json())
      .then((j: { desbloqueado?: boolean }) => {
        if (!vivo) return;
        if (j.desbloqueado) {
          setEstado("ok");
        } else {
          setEstado("bloqueado");
          setAberto(true); // oferece o desbloqueio uma vez ao entrar
        }
      })
      .catch(() => vivo && setEstado("ok")); // erro de status não trava o painel
    return () => {
      vivo = false;
    };
  }, []);

  async function desbloquear(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/documentos/desbloquear", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (r.ok) {
        // Recarrega pra que os arquivos passem a abrir na sessão desbloqueada.
        window.location.reload();
        return;
      }
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setErro(j.error ?? "Não foi possível desbloquear.");
    } catch {
      setErro("Falha de rede. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (estado !== "bloqueado") return null;

  return (
    <>
      {/* Cadeado flutuante — reabre o modal quando a pessoa adiou. */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-4 py-2 text-sm font-medium shadow-lg hover:border-accent"
          title="Desbloquear acesso a documentos"
        >
          <span aria-hidden>🔒</span> Documentos
        </button>
      )}

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-bg p-6 shadow-xl">
            <div className="mb-1 flex items-center gap-2 text-lg font-semibold">
              <span aria-hidden>🔒</span> Acesso a documentos
            </div>
            <p className="mb-4 text-sm text-fg-muted">
              Pra abrir contratos, comprovantes e anexos, confirme sua senha de
              acesso. Vale por 8 horas nesta sessão.
            </p>
            <form onSubmit={desbloquear} className="space-y-3">
              <input
                type="password"
                autoFocus
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
                className="w-full rounded-xl border border-border-strong bg-bg-soft px-4 h-12 outline-none focus:border-accent"
              />
              {erro && <p className="text-sm text-danger">{erro}</p>}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="h-11 rounded-xl px-4 text-sm text-fg-muted hover:text-fg"
                >
                  Agora não
                </button>
                <button
                  type="submit"
                  disabled={enviando || !senha}
                  className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {enviando ? "Verificando…" : "Desbloquear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
