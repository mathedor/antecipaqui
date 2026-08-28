"use client";

/**
 * FICHA DE CONEXÃO — a tela que o time técnico do fundo abre pra plugar.
 *
 * Reúne num bloco só o que antes estava espalhado (ou não aparecia em lugar
 * nenhum): o ID do fundo, os endereços de entrada, o cabeçalho da assinatura
 * e as chaves. Tudo copiável, e a ficha inteira sai em texto num clique.
 */

import { useState } from "react";
import { useFeedback } from "@/components/feedback-provider";
import {
  gerarChaveConexaoAction,
  revelarChavesConexaoAction,
  type ChavesReveladas,
} from "@/lib/actions/fundo-conexao";
import type { ChaveConexaoId, FichaConexao } from "@/lib/fundo-conexao";

const OCULTO = "••••••••••••••••••••••••••••";

function Icone({
  d,
  size = 14,
}: {
  d: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

const D_COPIAR =
  "M9 9h10v10H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1";
const D_OK = "M20 6 9 17l-5-5";
const D_OLHO =
  "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z";
const D_OLHO_OFF =
  "M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.2A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.2 6.7A17 17 0 0 0 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.8-.8";
const D_CHAVE = "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z";
const D_RAIO = "M13 2 4 14h6l-1 8 9-12h-6l1-8Z";
const D_SETA = "M5 12h14M13 6l6 6-6 6";

function BotaoCopiar({
  valor,
  rotulo = "copiar",
  onCopiado,
}: {
  valor: string;
  rotulo?: string;
  onCopiado?: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(valor);
        setCopiado(true);
        onCopiado?.();
        setTimeout(() => setCopiado(false), 1600);
      }}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] font-medium transition-colors ${
        copiado
          ? "border-success/40 bg-success-soft text-success"
          : "border-border bg-bg-elev text-fg-muted hover:border-accent hover:text-accent"
      }`}
      aria-label={`${rotulo} — ${copiado ? "copiado" : "copiar"}`}
    >
      <Icone d={copiado ? D_OK : D_COPIAR} />
      {copiado ? "copiado" : rotulo}
    </button>
  );
}

/** Campo em destaque: rótulo pequeno, valor em mono e botão de copiar. */
function CampoDado({
  rotulo,
  valor,
  legenda,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  legenda?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 ${
        destaque
          ? "border-accent/40 bg-accent-soft"
          : "border-border bg-bg"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-fg-dim font-mono mb-1.5">
        {rotulo}
      </div>
      <div className="flex items-start gap-2">
        <code
          className={`font-mono break-all flex-1 leading-snug ${
            destaque ? "text-[13px] text-fg font-semibold" : "text-xs text-fg"
          }`}
        >
          {valor}
        </code>
        <BotaoCopiar valor={valor} rotulo="" />
      </div>
      {legenda && (
        <p className="mt-1.5 text-[11px] text-fg-muted leading-snug">
          {legenda}
        </p>
      )}
    </div>
  );
}

export function FichaConexaoFundo({
  ficha,
  podeTrocarChave = false,
  titulo = "Dados de conexão",
  subtitulo,
}: {
  ficha: FichaConexao;
  /** Trocar chave existente derruba a conexão até o outro lado atualizar. */
  podeTrocarChave?: boolean;
  titulo?: string;
  subtitulo?: string;
}) {
  const { confirm, alertError, alertSuccess, toastSuccess } = useFeedback();
  const [chaves, setChaves] = useState<ChavesReveladas | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState<ChaveConexaoId | null>(null);
  const [soNecessarios, setSoNecessarios] = useState(true);

  const endpointsVisiveis = soNecessarios
    ? ficha.endpoints.filter((e) => e.ativo)
    : ficha.endpoints;
  const chavesVisiveis = soNecessarios
    ? ficha.chaves.filter((c) => c.necessaria || c.configurada)
    : ficha.chaves;
  const ocultos =
    ficha.endpoints.length -
    ficha.endpoints.filter((e) => e.ativo).length;

  async function revelar(): Promise<ChavesReveladas | null> {
    if (chaves) return chaves;
    setCarregando(true);
    try {
      const r = await revelarChavesConexaoAction(ficha.fundoId);
      setChaves(r);
      return r;
    } catch (e) {
      await alertError((e as Error).message);
      return null;
    } finally {
      setCarregando(false);
    }
  }

  async function gerar(chave: ChaveConexaoId, jaExiste: boolean) {
    if (jaExiste) {
      const ok = await confirm({
        title: "Trocar a chave?",
        message:
          "A chave atual para de valer na hora. Tudo que o sistema do fundo mandar com a chave velha será recusado até eles atualizarem do lado deles.",
        confirmLabel: "Trocar mesmo assim",
        variant: "danger",
      });
      if (!ok) return;
    }
    setGerando(chave);
    try {
      const r = await gerarChaveConexaoAction(chave, ficha.fundoId, jaExiste);
      if (!r.ok) {
        await alertError(r.error);
        return;
      }
      setChaves((prev) => ({ ...(prev ?? {}), [chave]: r.valor }));
      await alertSuccess(
        "Chave gerada. Copie e mande pro time técnico do fundo.",
        "Pronto",
      );
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setGerando(null);
    }
  }

  async function copiarFicha() {
    const c = await revelar();
    const linhas: string[] = [
      `FICHA DE CONEXÃO — ${ficha.fundoNome}`,
      "",
      `ID do fundo: ${ficha.fundoId}`,
      `Ambiente: ${ficha.integracaoAmbiente === "producao" ? "produção" : "teste (sandbox)"}`,
      `Base do Antecipaqui: ${ficha.baseUrl}`,
      "",
      "ENDEREÇOS QUE O SISTEMA DO FUNDO CHAMA",
    ];
    for (const e of ficha.endpoints.filter((x) => x.ativo)) {
      linhas.push(
        `- ${e.nome}: ${e.metodo} ${e.url}`,
        `  assinatura: HMAC-SHA256 do corpo, ${e.formato}, no header ${e.header}${
          e.prefixo ? ` (prefixo "${e.prefixo}")` : ""
        }`,
      );
    }
    linhas.push("", "CHAVES");
    for (const k of ficha.chaves.filter((x) => x.necessaria || x.configurada)) {
      linhas.push(`- ${k.nome}: ${c?.[k.id] ?? "(ainda não configurada)"}`);
    }
    linhas.push(
      "",
      "WEBHOOKS DE SAÍDA (Antecipaqui -> fundo)",
      `Assinamos o corpo em HMAC-SHA256 e mandamos no header ${ficha.headerSaida}.`,
      "",
      "API REST",
      `${ficha.apiBaseUrl} — header Authorization: Bearer aq_...`,
    );
    await navigator.clipboard.writeText(linhas.join("\n"));
    toastSuccess("Ficha copiada — é só colar no e-mail.", "Pronto");
  }

  return (
    <section className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-border bg-bg-card">
        <div className="min-w-0">
          <div className="eyebrow mb-1">integração</div>
          <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
          <p className="text-xs text-fg-muted mt-1 max-w-xl leading-relaxed">
            {subtitulo ??
              "Tudo que o time técnico do outro lado precisa pra plugar no Antecipaqui. O ID do fundo é o que identifica vocês em cada endereço."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copiarFicha}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-dark transition-colors"
          >
            <Icone d={D_COPIAR} />
            Copiar ficha completa
          </button>
        </div>
      </header>

      <div className="p-5 space-y-6">
        <div className="grid md:grid-cols-2 gap-3">
          <CampoDado
            rotulo="ID do fundo"
            valor={ficha.fundoId}
            destaque
            legenda="Vai no fim de toda URL de webhook. É este número que o sistema do fundo precisa guardar."
          />
          <CampoDado
            rotulo="Base do Antecipaqui"
            valor={ficha.baseUrl}
            legenda="Endereço público da plataforma — some com as rotas abaixo."
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-bg p-3.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-fg-dim font-mono mb-1.5">
              Ambiente
            </div>
            <span
              className={`chip ${
                ficha.integracaoAmbiente === "producao"
                  ? "chip-success"
                  : "chip-accent"
              }`}
            >
              {ficha.integracaoAmbiente === "producao"
                ? "produção"
                : "teste (sandbox)"}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-bg p-3.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-fg-dim font-mono mb-1.5">
              Integração
            </div>
            <span className="chip">
              {ficha.integracaoTipo === "nenhuma"
                ? "opera pelo painel"
                : ficha.integracaoTipo.toUpperCase()}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-bg p-3.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-fg-dim font-mono mb-1.5">
              Assinatura de saída
            </div>
            <code className="font-mono text-[11px] text-fg break-all">
              {ficha.headerSaida}
            </code>
          </div>
        </div>

        {/* ── Chaves ── */}
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Icone d={D_CHAVE} size={16} />
              Chaves de conexão
            </h3>
            <button
              type="button"
              onClick={() => (chaves ? setChaves(null) : revelar())}
              disabled={carregando}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-bg text-xs font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-50 transition-colors"
            >
              <Icone d={chaves ? D_OLHO_OFF : D_OLHO} />
              {carregando
                ? "abrindo…"
                : chaves
                  ? "ocultar chaves"
                  : "revelar chaves"}
            </button>
          </div>
          <p className="text-xs text-fg-muted mb-3 max-w-2xl leading-relaxed">
            A chave é o segredo compartilhado: o mesmo texto dos dois lados. O
            sistema do fundo assina o corpo do webhook em HMAC-SHA256 com ela e
            manda o resultado no cabeçalho indicado. Sem bater, a entrega é
            recusada com 401.
          </p>
          <ul className="space-y-2">
            {chavesVisiveis.map((k) => {
              const valor = chaves?.[k.id] ?? null;
              return (
                <li
                  key={k.id}
                  className="rounded-xl border border-border bg-bg p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm">{k.nome}</div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`chip ${k.configurada ? "chip-success" : ""}`}
                      >
                        {k.configurada ? "configurada" : "não configurada"}
                      </span>
                      {(!k.configurada || podeTrocarChave) && (
                        <button
                          type="button"
                          onClick={() => gerar(k.id, k.configurada)}
                          disabled={gerando === k.id}
                          className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-50 ${
                            k.configurada
                              ? "border-border text-fg-muted hover:border-danger hover:text-danger"
                              : "border-accent/50 bg-accent-soft text-accent hover:bg-accent hover:text-white"
                          }`}
                        >
                          <Icone d={D_RAIO} />
                          {gerando === k.id
                            ? "gerando…"
                            : k.configurada
                              ? "trocar chave"
                              : "gerar chave"}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-fg-muted mb-2 leading-snug">
                    {k.desc}
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elev px-3 py-2">
                    <code className="font-mono text-[11px] flex-1 break-all text-fg">
                      {k.configurada || valor
                        ? (valor ?? OCULTO)
                        : "— gere a chave pra ativar este canal —"}
                    </code>
                    {valor && <BotaoCopiar valor={valor} rotulo="" />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Endereços de entrada ── */}
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h3 className="text-sm font-bold">
              Endereços que o sistema do fundo chama
            </h3>
            {ocultos > 0 && (
              <button
                type="button"
                onClick={() => setSoNecessarios((v) => !v)}
                className="text-[11px] text-fg-muted hover:text-accent underline underline-offset-2"
              >
                {soNecessarios
                  ? `mostrar os ${ocultos} desligados`
                  : "mostrar só os ativos"}
              </button>
            )}
          </div>
          {endpointsVisiveis.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-strong bg-bg p-6 text-center text-xs text-fg-muted">
              Nenhum canal de entrada ligado — este fundo opera inteiro pelo
              painel.
            </div>
          ) : (
            <ul className="space-y-2">
              {endpointsVisiveis.map((e) => (
                <li
                  key={e.id}
                  className={`rounded-xl border p-3.5 ${
                    e.ativo
                      ? "border-border bg-bg"
                      : "border-dashed border-border bg-bg-card opacity-70"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {e.peca && (
                      <span className="chip chip-accent">peça {e.peca}</span>
                    )}
                    <span className="font-semibold text-sm">{e.nome}</span>
                    {!e.ativo && (
                      <span className="chip" title={e.motivo}>
                        desligado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-fg-muted mb-2 leading-snug">
                    {e.ativo ? e.desc : e.motivo}
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elev px-3 py-2">
                    <span className="font-mono text-[10px] font-bold text-accent">
                      {e.metodo}
                    </span>
                    <code className="font-mono text-[11px] flex-1 break-all text-fg">
                      {e.url}
                    </code>
                    <BotaoCopiar valor={e.url} rotulo="" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-muted font-mono">
                    <span>
                      header:{" "}
                      <code className="text-fg">{e.header}</code>
                    </span>
                    <span>
                      formato: <code className="text-fg">{e.formato}</code>
                      {e.prefixo && (
                        <>
                          {" · prefixo "}
                          <code className="text-fg">{e.prefixo}</code>
                        </>
                      )}
                    </span>
                    <span>
                      assina com:{" "}
                      <code className="text-fg">
                        {ficha.chaves.find((k) => k.id === e.chave)?.nome ??
                          e.chave}
                      </code>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Leitura via API ── */}
        <div className="rounded-xl border border-accent/30 bg-accent-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold">Leitura e escrita pela API</h3>
            <a
              href="/docs/api"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              abrir a documentação
              <Icone d={D_SETA} />
            </a>
          </div>
          <p className="text-[11px] text-fg-muted mb-2 leading-snug">
            Pra consultar operações e parcelas ou decidir aprovação de dentro do
            sistema do fundo. A key é gerada no painel e vai no header{" "}
            <code className="font-mono">Authorization: Bearer aq_…</code>.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elev px-3 py-2">
            <code className="font-mono text-[11px] flex-1 break-all text-fg">
              {ficha.apiBaseUrl}
            </code>
            <BotaoCopiar valor={ficha.apiBaseUrl} rotulo="" />
          </div>
        </div>
      </div>
    </section>
  );
}
