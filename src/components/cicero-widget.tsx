"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { perguntarCicero } from "@/lib/actions/cicero";
import { getCiceroConselho, type CiceroConselho } from "@/lib/actions/cicero-conselhos";
import { CiceroRosto } from "@/components/cicero-rosto";
import {
  aceitarPropostaCicero,
  CICERO_EVENTO_ABRIR,
  type CiceroChamado,
  type CiceroProposta,
} from "@/lib/cicero-eventos";

type Msg = {
  de: "user" | "cicero";
  texto: string;
  links?: { label: string; href: string }[];
  respostas?: string[];
  /** Proposta acionável — o Cícero oferece resolver algo por você. */
  proposta?: CiceroProposta;
};

const SUGESTOES: Record<string, string[]> = {
  corretor: [
    "Minhas operações",
    "Próximos vencimentos",
    "Calcula 100 mil em 30/60/90 dias",
    "Quero cadastrar uma operação",
  ],
  imobiliaria: [
    "Minhas operações",
    "Próximos vencimentos",
    "Calcula 100 mil em 30/60/90 dias",
    "Quero cadastrar uma operação",
  ],
  construtora: [
    "O que tenho pra pagar?",
    "Próximos vencimentos",
    "Dados de pagamento das parcelas",
  ],
  fundo: [
    "Faturamento de hoje",
    "Como está a inadimplência?",
    "Disparar cobrança dos vencidos",
    "Minhas operações",
  ],
  admin: [
    "Resumo da plataforma",
    "Faturamento de hoje",
    "Qual fundo está demorando mais pra operar?",
    "Como está a inadimplência?",
  ],
  comercial: [
    "Quanto tenho a receber?",
    "Quanto ganhei esse mês?",
    "Minhas operações",
    "Próximos vencimentos",
  ],
};

export function CiceroWidget({ nome, role }: { nome: string; role: string }) {
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [conselho, setConselho] = useState<CiceroConselho | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Conselho proativo: carrega ao abrir a primeira vez, com dados reais.
  useEffect(() => {
    if (!aberto || conselho) return;
    let vivo = true;
    getCiceroConselho()
      .then((c) => {
        if (vivo) setConselho(c);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [aberto, conselho]);

  // Qualquer tela pode chamar o Cícero pra oferecer ajuda (ex: cadastro
  // travado por documento). Ele abre sozinho já falando.
  useEffect(() => {
    function aoChamar(e: Event) {
      const { texto, proposta, respostas } = (e as CustomEvent<CiceroChamado>)
        .detail;
      setAberto(true);
      setMsgs((m) => [...m, { de: "cicero", texto, proposta, respostas }]);
    }
    window.addEventListener(CICERO_EVENTO_ABRIR, aoChamar);
    return () => window.removeEventListener(CICERO_EVENTO_ABRIR, aoChamar);
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, pending]);

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  function enviar(pergunta: string) {
    const p = pergunta.trim();
    if (!p || pending) return;
    setTexto("");
    setMsgs((m) => [...m, { de: "user", texto: p }]);
    startTransition(async () => {
      try {
        const r = await perguntarCicero(conversaId, p);
        if (r.conversaId) setConversaId(r.conversaId);
        setMsgs((m) => [
          ...m,
          { de: "cicero", texto: r.texto, links: r.links, respostas: r.respostas },
        ]);
      } catch {
        setMsgs((m) => [
          ...m,
          { de: "cicero", texto: "Conexão falhou — tenta de novo em instantes. 👔" },
        ]);
      }
    });
  }

  const sugestoes = SUGESTOES[role] ?? SUGESTOES.corretor;

  return (
    <>
      {/* botão flutuante */}
      <button
        onClick={() => setAberto((a) => !a)}
        className={`fixed z-[60] bottom-20 right-4 md:bottom-24 md:right-6 size-12 md:size-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 border print:hidden ${
          aberto
            ? "bg-bg-elev border-border rotate-90 text-fg"
            : "bg-bg-dark border-bg-dark text-white hover:scale-105"
        }`}
        title="Cícero — atendente Antecipaqui"
        aria-label="Abrir o Cícero, atendente da Antecipaqui"
      >
        {aberto ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <>
            <CiceroRosto size={34} tom="escuro" className="md:hidden" />
            <CiceroRosto size={40} tom="escuro" className="hidden md:block" />
          </>
        )}
      </button>

      {/* painel */}
      {aberto && (
        <div className="fixed z-[59] right-4 bottom-36 md:right-6 md:bottom-[168px] w-[min(92vw,400px)] h-[min(64dvh,560px)] bg-bg-elev border border-border rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-black/20 print:hidden">
          {/* header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-dark shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 shrink-0">
              <CiceroRosto size={36} tom="escuro" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-[14px] text-white">Cícero</div>
              <div className="text-[10.5px] text-white/70 flex items-center gap-1">
                <span className="text-green-400">●</span> atendente Antecipaqui — às ordens
              </div>
            </div>
          </div>

          {/* mensagens */}
          <div className="flex-1 overflow-y-auto px-3.5 py-4 flex flex-col gap-3">
            {msgs.length === 0 && (
              <div className="flex flex-col gap-3">
                <div className="bg-bg-card border border-border rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] text-fg max-w-[88%]">
                  Opa, {nome.split(" ")[0]}! Sou o Cícero, o atendente de peso da
                  Antecipaqui. Pergunta das suas operações, vencimentos ou me pede um
                  cálculo — eu resolvo com dados reais.
                </div>

                {/* Conselho proativo — o Cícero puxa o assunto */}
                {conselho && (
                  <div className="rounded-2xl border border-accent/35 bg-accent-soft px-3.5 py-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-accent mb-1.5">
                      Cícero sugere
                    </div>
                    {conselho.destaque && (
                      <div className="mb-1.5">
                        <div className="text-[19px] font-bold leading-none text-fg">
                          {conselho.destaque}
                        </div>
                        {conselho.legendaDestaque && (
                          <div className="text-[10.5px] text-fg-muted mt-0.5">
                            {conselho.legendaDestaque}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[12.5px] leading-relaxed text-fg">
                      {conselho.texto}
                    </p>
                    {conselho.cta && (
                      <Link
                        href={conselho.cta.href}
                        onClick={() => setAberto(false)}
                        className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors"
                      >
                        {conselho.cta.label} →
                      </Link>
                    )}
                    {conselho.perguntas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {conselho.perguntas.map((q) => (
                          <button
                            key={q}
                            onClick={() => enviar(q)}
                            className="text-[11px] px-2.5 py-1 rounded-full border border-accent/40 bg-bg-elev text-accent hover:bg-accent/10 transition-colors text-left"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-fg-muted">Ou pergunta direto:</div>
                <div className="flex flex-wrap gap-1.5">
                  {sugestoes.map((s) => (
                    <button
                      key={s}
                      onClick={() => enviar(s)}
                      className="text-[11.5px] px-2.5 py-1.5 rounded-full border border-accent/40 text-accent hover:bg-accent-soft transition-colors text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col gap-1.5 ${m.de === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`px-3.5 py-2.5 text-[13px] max-w-[88%] whitespace-pre-wrap leading-relaxed ${
                    m.de === "user"
                      ? "bg-accent text-white font-medium rounded-2xl rounded-br-md"
                      : "bg-bg-card border border-border text-fg rounded-2xl rounded-tl-md"
                  }`}
                >
                  {m.texto.replace(/\*\*/g, "")}
                </div>
                {m.proposta && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        aceitarPropostaCicero(m.proposta!.tipo);
                        setMsgs((ms) => [
                          ...ms,
                          { de: "user", texto: m.proposta!.aceitar },
                          {
                            de: "cicero",
                            texto:
                              "Fechado, tô finalizando o cadastro e deixando o envio pendente. Já já te falo o número da operação.",
                          },
                        ]);
                      }}
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors"
                    >
                      {m.proposta.aceitar}
                    </button>
                    {m.proposta.recusar && (
                      <button
                        onClick={() => setAberto(false)}
                        className="text-[12px] px-3 py-1.5 rounded-full border border-border text-fg-muted hover:text-fg transition-colors"
                      >
                        {m.proposta.recusar}
                      </button>
                    )}
                  </div>
                )}
                {m.links && m.links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.links.map((l) => (
                      <Link
                        key={l.href + l.label}
                        href={l.href}
                        onClick={() => setAberto(false)}
                        className="text-[11.5px] px-2.5 py-1.5 rounded-full bg-accent-soft border border-accent/40 text-accent hover:bg-accent/15 transition-colors"
                      >
                        {l.label} →
                      </Link>
                    ))}
                  </div>
                )}
                {m.de === "cicero" &&
                  i === msgs.length - 1 &&
                  !pending &&
                  m.respostas &&
                  m.respostas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-w-[95%]">
                      {m.respostas.map((r) => (
                        <button
                          key={r}
                          onClick={() => enviar(r)}
                          className="text-[11.5px] px-2.5 py-1.5 rounded-full border border-accent/40 text-accent hover:bg-accent-soft transition-colors text-left"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

            {pending && (
              <div className="bg-bg-card border border-border rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] text-fg-muted self-start">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce [animation-delay:120ms]">●</span>
                  <span className="animate-bounce [animation-delay:240ms]">●</span>
                </span>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {/* input */}
          <form
            className="flex gap-2 p-3 border-t border-border bg-bg-elev shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
          >
            <input
              ref={inputRef}
              className="flex-1 h-10 px-3 rounded-xl border border-border bg-bg text-[13.5px] text-fg outline-none focus:border-accent"
              placeholder="Pergunta pro Cícero…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={600}
            />
            <button
              className="h-10 px-3.5 rounded-xl bg-accent text-white disabled:opacity-50 shrink-0"
              disabled={pending || !texto.trim()}
              aria-label="Enviar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
