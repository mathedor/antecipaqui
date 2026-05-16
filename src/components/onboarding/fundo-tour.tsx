"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markTourCompleted } from "@/lib/actions/onboarding-tour";

type Step = {
  emoji: string;
  eyebrow: string;
  titulo: string;
  subtitulo: string;
  descricao: string;
  pontos?: string[];
  visual?: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
};

const STEPS: Step[] = [
  {
    emoji: "👋",
    eyebrow: "bem-vindo ao painel do fundo",
    titulo: "Você é o motor financeiro da Antecipaqui",
    subtitulo: "Aprova operações, recebe parcelas, automatiza ao máximo",
    descricao:
      "Esse painel foi desenhado pra dois objetivos opostos: te dar CONTROLE total sobre o que vai pra dentro do seu balanço, e ao mesmo tempo AUTOMATIZAR tudo o que dá pra automatizar — pra você focar nas decisões que realmente importam. Ao longo dos próximos passos vou te mostrar a mesa de decisão, regras de automação, gestão de risco, e — com atenção especial — a parte de APIs e webhooks pra integrar com o seu core bancário ou ERP.",
    pontos: [
      "🎯 Mesa de Decisão: aprovar/recusar ops em segundos",
      "⚡ Regras automáticas: deixar o sistema aprovar ops 'óbvias' pra você",
      "💰 Recebimentos & cobrança: parcelas, multa, juros, baixa automática",
      "🚨 Risco: concentração + blacklist de construtoras",
      "🔌 APIs + Webhooks: integrar com seu sistema",
    ],
  },
  {
    emoji: "🔄",
    eyebrow: "entendendo o fluxo",
    titulo: "Como uma operação chega até você",
    subtitulo: "Do contrato do corretor ao dinheiro caindo na sua conta",
    descricao:
      "Antes de mergulhar nas telas, é importante entender o caminho que uma op faz. O modelo é simples:",
    pontos: [
      "1️⃣ Corretor/imob fecha venda com construtora e cadastra op na AQ",
      "2️⃣ Admin AQ pré-aprova (valida docs, score do corretor)",
      "3️⃣ Op chega na SUA mesa em /painel/aprovar",
      "4️⃣ Você aprova (ou regra auto-aprova) → fundo libera capital",
      "5️⃣ Cedente assina via ZapSign → AQ paga o corretor",
      "6️⃣ Construtora paga parcelas ao longo dos meses → caem na SUA conta",
      "7️⃣ AQ cobra de você mensalmente (custos + 50% spread) via fatura",
    ],
    visual: (
      <div className="rounded-xl border-2 border-accent/30 bg-accent-soft p-4 font-mono text-xs">
        <div className="text-[10px] text-fg-dim uppercase tracking-wider mb-2">
          fluxo da operação
        </div>
        <div className="flex items-center gap-1 text-[9px] flex-wrap">
          <span className="rounded bg-bg px-2 py-1 border border-border">
            corretor
          </span>
          <span>→</span>
          <span className="rounded bg-bg px-2 py-1 border border-border">
            admin AQ
          </span>
          <span>→</span>
          <span className="rounded bg-accent text-white px-2 py-1 font-bold">
            VOCÊ (fundo)
          </span>
          <span>→</span>
          <span className="rounded bg-bg px-2 py-1 border border-border">
            ZapSign
          </span>
          <span>→</span>
          <span className="rounded bg-success/20 px-2 py-1 border border-success/40">
            pagamento
          </span>
        </div>
      </div>
    ),
  },
  {
    emoji: "🟢",
    eyebrow: "★ central de decisões",
    titulo: "Mesa de Decisão",
    subtitulo: "Aprovar ou recusar ops pendentes em segundos",
    descricao:
      "É a tela que você mais vai usar no dia-a-dia. Lista todas as ops que estão aguardando SUA decisão, com tudo que você precisa pra decidir sem sair da tela: score da construtora (0-100 baseado em histórico), status dos docs validados por IA, decomposição financeira (VP, juros, custos, sua parte) e comparativo de taxa (taxa da op × sua taxa-base).",
    pontos: [
      "Aprovar libera capital — fundo paga AQ → AQ paga corretor",
      "Recusar exige motivo (registra em audit)",
      "Score baixo = construtora com histórico ruim no SEU fundo",
      "Docs 'em revisão' = AI detectou inconsistência (revise antes de aprovar)",
      "Você pode aprovar via API também (veja steps 12-13)",
    ],
    ctaHref: "/painel/aprovar",
    ctaLabel: "Abrir Mesa de Decisão",
  },
  {
    emoji: "📥",
    eyebrow: "ops já em pagamento",
    titulo: "Pendências de decisão (antecipação + renegociação)",
    subtitulo: "Construtora pede pra adiantar ou reestruturar",
    descricao:
      "Diferente da mesa de aprovação (ops novas), essa tela é pra ops JÁ em pagamento onde a construtora solicita uma de duas coisas:\n\n• Antecipação: 'quero quitar antes pra reduzir juros' → você decide se aceita\n• Renegociação: 'preciso estender prazo' ou 'reduzir parcelas' → analisa impacto e decide",
    pontos: [
      "Cada pedido vem com cálculo do impacto no seu retorno",
      "Aceitar antecipação = recebe valor presente recalculado (menor que o futuro)",
      "Aceitar renegociação = altera o cronograma de parcelas",
      "Recusar mantém o contrato original",
    ],
    ctaHref: "/painel/pendencias-decisao",
    ctaLabel: "Abrir Pendências",
  },
  {
    emoji: "⚡",
    eyebrow: "★ feature mais impactante",
    titulo: "Regras de auto-aprovação",
    subtitulo: "Pare de aprovar 1 a 1 — deixe o sistema decidir o 'óbvio'",
    descricao:
      "Aqui é onde você ganha escala. Configure critérios e o sistema aprova SOZINHO toda op que se encaixar — sem você levantar um dedo. Exemplo: 'Construtoras do meu top-10, taxa >= 5%/mês, prazo <= 6 parcelas, comissão <= R$100k → auto-aprovar'. Toda op que bater nesses 4 critérios passa direto. O resto continua chegando na sua mesa pra revisar.\n\nCada regra tem prioridade (avaliadas em ordem ASC) — a primeira que casa, aprova. E tem contador de acionamentos pra você medir o impacto.",
    pontos: [
      "Critérios: taxa mínima, prazo máximo, valor máximo, allowlist de construtoras",
      "✨ NOVO: botão 'Simular nas últimas 90 ops' — testa a regra contra histórico ANTES de ativar (evita regra agressiva demais)",
      "Toggle ativa/desativa sem perder a configuração",
      "Contador conta quantas vezes a regra disparou",
      "Audit registra QUAL regra aprovou QUAL op",
    ],
    ctaHref: "/painel/regras",
    ctaLabel: "Configurar Regras",
  },
  {
    emoji: "📊",
    eyebrow: "visão geral",
    titulo: "Operações & Daily",
    subtitulo: "Sua carteira completa + ação operacional do dia",
    descricao:
      "/painel/operacoes é a visão completa: tudo que você já aprovou (qualquer status). Filtre por construtora, período, status. Clique numa op pra ver o 360 completo com timeline, docs, parcelas e logs.\n\n/painel/daily é o foco operacional: 'quem precisa pagar hoje/esta semana?'. Mostra parcelas a vencer + vencidas com cálculo automático de multa (2%) e juros de mora (taxa mensal / 30 × dias).",
    pontos: [
      "Operações: filtro por status (rascunho → realizada) + busca por número",
      "Daily: filtros por período (hoje/semana/mês/3m/custom)",
      "Daily mostra dias de atraso em destaque vermelho",
      "Botão 'cobrar' dispara WhatsApp/email pra construtora devedora",
    ],
    ctaHref: "/painel/operacoes",
    ctaLabel: "Ver Operações",
  },
  {
    emoji: "💰",
    eyebrow: "gestão financeira",
    titulo: "Recebimentos + Forecast",
    subtitulo: "Pipeline de caixa: o que vai entrar e quando",
    descricao:
      "/painel/recebimentos lista TODAS as parcelas (a receber, atrasadas, recebidas) com KPIs no topo. Use pra reconciliar com seu extrato bancário e ver % de inadimplência.\n\n/painel/forecast é a projeção pros próximos 6 meses, decomposta em três linhas:\n• Bruto: o que a construtora paga\n• Sua parte: custo $$ + 50% do spread (vira receita SUA)\n• Parte AQ: vai pra fatura mensal que a AQ te cobra",
    pontos: [
      "Forecast usa parcelas a_vencer + vencidas (não conta as pagas)",
      "Decomposição te ajuda a separar 'caixa bruto' de 'caixa líquido'",
      "Recebimentos: clica numa parcela pra ver detalhe (boleto, baixa)",
    ],
    ctaHref: "/painel/forecast",
    ctaLabel: "Ver Forecast",
  },
  {
    emoji: "🏦",
    eyebrow: "★ automatize a cobrança",
    titulo: "Cobrança automática — 3 modos",
    subtitulo: "Manual, integração via API, ou arquivo CNAB",
    descricao:
      "A configuração de cobrança é do FUNDO inteiro (não por op). Hoje suportamos três modos — escolha conforme o seu banco:\n\n🟡 MANUAL — sistema só calcula multa+juros, você emite boleto no seu banco e dá baixa manual aqui. Bom pra começar.\n\n🟢 API — você nos passa endpoint+credenciais do seu banco; AQ chama 'emitir boleto' e seu banco devolve linha digitável. Quando o boleto é pago, banco dispara webhook → AQ marca a parcela como paga (zero clique). Suportamos qualquer banco com API REST.\n\n🔵 CNAB — gera arquivo remessa (240/400) pra você subir no internet banking; importa retorno automaticamente pra dar baixa em lote. Bom pra bancos sem API.",
    pontos: [
      "Multa padrão: 2% (configurável por fundo)",
      "Juros de mora padrão: taxa mensal / 30 × dias de atraso",
      "Modo API exige: URL endpoint, tipo de auth (api_key/oauth/basic), credenciais (jsonb criptografado), webhook secret pra validar",
      "Webhook do banco bate em /api/cobranca/webhook/{fundoId} com HMAC validation",
      "Setup da integração é feito pela AQ junto com você (suporte)",
    ],
  },
  {
    emoji: "🚨",
    eyebrow: "gestão proativa de risco",
    titulo: "Risco — concentração + blacklist",
    subtitulo: "Não dependa de poucas construtoras",
    descricao:
      "Tela crítica que ninguém quer usar, mas todo fundo precisa olhar. Mostra três dimensões de risco:\n\n• Concentração: % do seu capital exposto em cada construtora (alerta a 25%, crítico a 40%)\n• Devedoras: quem está atrasando, quantas parcelas, dias médio de atraso\n• Blacklist: construtoras que você bloqueou — quando alguém tenta criar op com elas, sistema avisa o admin/corretor",
    pontos: [
      "Top 15 construtoras por capital exposto (com barra visual)",
      "Concentração por imobiliária e UF também",
      "Toggle de blacklist instantâneo — bloqueia novas ops, não afeta as ativas",
      "Use a blacklist pra forçar diversificação ou cortar histórico ruim",
    ],
    ctaHref: "/painel/risco",
    ctaLabel: "Abrir Risco",
  },
  {
    emoji: "📋",
    eyebrow: "relatórios automáticos",
    titulo: "Recaps + Parceiros + Comerciais",
    subtitulo: "Visibilidade de carteira e desempenho",
    descricao:
      "Três telas leves de relatórios que rodam automaticamente:\n\n• Recaps: resumos diário/semanal/mensal — ops aprovadas, % inadimplência, prazo médio de análise, antecipações. Filtre por preset ou período custom.\n\n• Parceiros: catálogo de construtoras + imobiliárias/corretores que já operaram com você, ordenados por volume.\n\n• Comerciais vinculados: time comercial dedicado ao seu fundo (se houver). Vê desempenho de cada um (pago, a receber, ops aprovadas, imobs ativas, leads abertos) e clica pra abrir o 360.",
    pontos: [
      "Recaps são gerados via cron (não custa nada deixar rodar)",
      "Parceiros te ajuda a identificar concentração antes de virar problema",
      "Comerciais só faz sentido se você fidelizou comerciais — admin configura",
    ],
  },
  {
    emoji: "🔌",
    eyebrow: "★ integrações — parte 1/3",
    titulo: "Por que você quer integrar?",
    subtitulo: "Antes de sair criando API key, entenda o porquê",
    descricao:
      "Você tem 3 caminhos pra trabalhar com a AQ:\n\n1️⃣ MANUAL (default): faz tudo pelo painel web — aprovar ops, ver recebimentos, baixar relatórios\n\n2️⃣ API REST: seu sistema CONSULTA a AQ (e opcionalmente DECIDE) — útil quando você tem ERP/core bancário/CRM e quer manter eles como fonte da verdade\n\n3️⃣ WEBHOOK: AQ NOTIFICA seu sistema quando algo muda (op aprovada, parcela paga, etc) — útil pra dar baixa automática, atualizar dashboards internos, disparar emails\n\nA combinação ideal é API + Webhook. API pra você puxar dados quando quiser; webhook pra ser avisado em tempo real do que acontece. Os próximos 3 steps detalham cada um.",
    pontos: [
      "Painel manual: zero setup, mas operação 100% humana",
      "Só API: você puxa dados (polling) → simples mas lento",
      "Só webhook: você é notificado push → rápido mas se cair perde evento (temos retry)",
      "API + Webhook: combinação robusta",
    ],
  },
  {
    emoji: "🔑",
    eyebrow: "★ integrações — parte 2/3",
    titulo: "API REST — como funciona e setup",
    subtitulo: "Token Bearer, 5 endpoints, escopos read_only ou read_write",
    descricao:
      "AUTENTICAÇÃO: gere uma API key em /painel/api → recebe um token tipo aq_xxxxx (mostrado UMA vez, copie e guarde). Cada request HTTP precisa do header Authorization: Bearer aq_xxxxx.\n\nESCOPOS:\n• read_only: pode consultar (GET) tudo. Bom pra dashboards, sincronização passiva, BI.\n• read_write: pode consultar E decidir ops (POST /decisao). Use só se for fazer aprovação automatizada pelo seu lado.\n\nENDPOINTS:\n• GET /me — dados do fundo + stats\n• GET /operacoes — lista paginada com filtros\n• GET /operacoes/{id} — detalhe + parcelas + custos\n• POST /operacoes/{id}/decisao — aprovar/recusar (read_write)\n• GET /parcelas — lista com filtros por status/vencimento\n\nLIMITES: 10 keys ativas por fundo. Sem rate-limit hard (use com bom senso). Erros sempre em JSON, códigos HTTP padrão (401/403/404/400).",
    pontos: [
      "Base URL: https://www.antecipaqui.digital/api/external/fundo",
      "✨ NOVO: sandbox com cURL copy-paste em /painel/api — copia, troca $TOKEN, cola no terminal e testa",
      "Documentação Swagger UI em /docs/api (botão 'Try it out')",
      "Download OpenAPI JSON pra importar no Postman/Insomnia",
      "Revogar key não apaga audit — só invalida",
    ],
    ctaHref: "/painel/api",
    ctaLabel: "Abrir página de API",
  },
  {
    emoji: "🔔",
    eyebrow: "★ integrações — parte 3/3",
    titulo: "Webhooks — push em tempo real",
    subtitulo: "AQ notifica seu sistema quando algo acontece",
    descricao:
      "CONCEITO: você cadastra uma URL HTTPS no seu sistema. Sempre que rolar um evento que você assinou, AQ faz POST nessa URL com payload JSON + assinatura HMAC-SHA256 no header x-antecipaqui-signature. Você valida a assinatura (com o secret que mostramos uma vez na criação) e processa o evento.\n\nEVENTOS DISPONÍVEIS:\n• op_status_change — qualquer transição de status\n• op_aprovada / op_recusada — atalhos pros status finais\n• fundo_decisao — quando você (ou regra) decide\n• parcela_paga — quando construtora paga\n• antecipacao_decisao / renegociacao_decisao — quando você decide pedidos\n\nGARANTIA DE ENTREGA: se sua URL não responder 2xx, AQ tenta de novo em 1, 5, 25, 125 min (4 tentativas). Depois marca 'desistido'. Tudo fica auditado.",
    pontos: [
      "Header x-antecipaqui-signature: sha256={hmac do body com seu secret}",
      "Header x-antecipaqui-event: tipo do evento (pra você rotear)",
      "✨ NOVO: botão 🧪 'testar webhook' — dispara payload fake AGORA pra validar seu endpoint antes de prod",
      "✨ NOVO: página 📜 'logs' por webhook — vê últimos 50 eventos com status, erro, payload, tentativas",
      "Endpoint precisa responder em <15s (timeout), retornar 2xx pra contar como entregue",
      "Use o secret pra validar — qualquer um pode mandar POST na sua URL pública, só a assinatura prova que é a AQ",
    ],
    ctaHref: "/painel/webhooks",
    ctaLabel: "Configurar Webhooks",
  },
  {
    emoji: "🚀",
    eyebrow: "bora começar",
    titulo: "Tudo pronto!",
    subtitulo: "Volta aqui quando quiser",
    descricao:
      "Esse tour fica disponível pra sempre no menu do seu user (canto superior direito) → 'Onboarding'. Reabra quando precisar relembrar ou quando entrar alguém novo na sua equipe.\n\nSugestão de PRIMEIROS PASSOS:\n1. Olhe a Mesa de Decisão pra entender a UI\n2. Crie 1-2 regras de auto-aprovação CONSERVADORAS (use o botão 'Simular' antes de ativar)\n3. Configure 1 webhook apontando pra um endpoint de teste (use ngrok ou webhook.site) e clique 🧪 testar\n4. Quando estiver confortável, gere uma API key read_only e teste 1 cURL\n5. Quando for integrar de verdade, fale com o suporte pra alinhar caso a caso",
    pontos: [
      "Dúvida técnica? Chat no menu → time AQ",
      "Setup de cobrança automática (API/CNAB)? Pede pro suporte ajudar — é configuração delicada",
      "Sugestão de feature? Mesmo canal — leia o roadmap antes",
    ],
  },
];

export function FundoTour({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const total = STEPS.length;
  const cur = STEPS[step];
  const isLast = step === total - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / total) * 100;

  const handleClose = () => {
    startTransition(async () => {
      await markTourCompleted("fundo");
      onClose();
      router.refresh();
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-border bg-bg shadow-2xl">
        <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-border px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim shrink-0">
              {step + 1} de {total}
            </div>
            <div className="flex-1 h-1.5 bg-bg-card rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="text-xs text-fg-muted hover:text-fg font-mono shrink-0"
          >
            pular tour
          </button>
        </div>

        <div className="p-6 md:p-10">
          <div className="text-5xl mb-3">{cur.emoji}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-2">
            {cur.eyebrow}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
            {cur.titulo}
          </h2>
          <p className="text-base text-fg-muted mb-5">{cur.subtitulo}</p>
          <p className="text-sm text-fg leading-relaxed whitespace-pre-line mb-5">
            {cur.descricao}
          </p>

          {cur.visual && <div className="mb-5">{cur.visual}</div>}

          {cur.pontos && cur.pontos.length > 0 && (
            <ul className="space-y-2 mb-5">
              {cur.pontos.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-fg"
                >
                  <span className="shrink-0 size-5 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[10px] font-bold mt-0.5">
                    ✓
                  </span>
                  <span className="whitespace-pre-line">{p}</span>
                </li>
              ))}
            </ul>
          )}

          {cur.ctaHref && cur.ctaLabel && (
            <a
              href={cur.ctaHref}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent-soft border-2 border-accent text-accent text-sm font-bold hover:bg-accent hover:text-white transition-colors"
            >
              {cur.ctaLabel} ↗
            </a>
          )}
        </div>

        <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-border px-5 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="h-10 px-4 rounded-lg border border-border text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
          >
            ← anterior
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={handleClose}
              disabled={pending}
              className="h-10 px-5 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent-dark disabled:opacity-50"
            >
              {pending ? "salvando…" : "🚀 Bora começar!"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
              className="h-10 px-5 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent-dark"
            >
              próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
