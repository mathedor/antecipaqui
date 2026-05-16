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
  /** Bullets de funcionalidades pra reforçar. */
  pontos?: string[];
  /** Mock visual ASCII-style ou ilustração simples. */
  visual?: React.ReactNode;
  /** Link pra abrir em nova aba. */
  ctaHref?: string;
  ctaLabel?: string;
};

const STEPS: Step[] = [
  {
    emoji: "👋",
    eyebrow: "bem-vindo",
    titulo: "Bem-vindo à Antecipaqui!",
    subtitulo: "5 minutos pra você dominar a plataforma",
    descricao:
      "Você é comercial — sua missão é trazer imobiliárias e corretores pra dentro da Antecipaqui e cuidar pra eles operarem. Vamos passar pelas ferramentas mais importantes pra você fazer isso bem.",
    pontos: [
      "Encontrar leads (prospecção)",
      "Gerenciar relacionamento (CRM)",
      "Acompanhar comissão (financeiro)",
      "Provar resultados (relatórios)",
    ],
  },
  {
    emoji: "🎯",
    eyebrow: "topo do dashboard",
    titulo: "Foco do Dia",
    subtitulo: "5 ações priorizadas que aparecem todo dia",
    descricao:
      "O sistema olha sua carteira e sugere o que fazer agora: imobs dormidas há +60d, ops travadas, primeiras operações pra parabenizar, follow-ups marcados, recusas pra investigar.",
    pontos: [
      "Cada ação tem botão WhatsApp com mensagem PRONTA",
      "Botão 'registrar contato' que vai pro CRM",
      "Templates personalizáveis (passo 9)",
    ],
    ctaHref: "/painel",
    ctaLabel: "Ver meu Foco do Dia",
  },
  {
    emoji: "📊",
    eyebrow: "barra de progresso",
    titulo: "Meta automática",
    subtitulo: "120% do mês anterior, sem cadastro",
    descricao:
      "Não precisa configurar meta. Sistema calcula 120% do que você fechou no mês passado. Barra mostra onde você está + projeção linear ('se mantiver o ritmo, vai bater X%').",
    pontos: [
      "Marca vertical mostra o 'ritmo necessário'",
      "Badge 🔥 quando bate a meta",
      "Streak histórico em Conquistas",
    ],
  },
  {
    emoji: "🌡️",
    eyebrow: "saúde dos clientes",
    titulo: "Carteira viva",
    subtitulo: "Quem precisa de você AGORA",
    descricao:
      "Cada imob é classificada por temperatura: 🟢 quente (operou 30d) · 🟡 morna (60d) · 🟠 fria (90d) · 🔴 dormida (+90d) · ⚪ nova (cadastrada mas zero ops). Ordenado por urgência.",
    pontos: [
      "Botão WhatsApp em cada linha com msg sugerida pelo estado",
      "Última interação registrada aparece",
      "% conversão de novos pra ativos no funil",
    ],
  },
  {
    emoji: "🗺️",
    eyebrow: "★ destaque",
    titulo: "Mapa de Prospects",
    subtitulo: "Como achar imobiliárias/construtoras pra prospectar",
    descricao:
      "O coração da sua aquisição. Mapa interativo onde você adiciona pins de potenciais clientes — ou busca automaticamente via Google Places.",
    pontos: [
      "Digite endereço (Av Paulista, SP) → autocomplete",
      "OU clique '📍 minha localização' (em campo)",
      "Filtra por categoria (imobiliária OU construtora) + raio (1-20km)",
      "Quem já é cliente AQ aparece em VERMELHO — pula essas",
      "Pin verde = prospectar! Click → WhatsApp com link da apresentação",
      "Botão grande 'adicionar ao Pipeline' move pro funil",
    ],
    visual: (
      <div className="rounded-xl border-2 border-accent/30 bg-accent-soft p-4 font-mono text-xs space-y-2">
        <div className="text-[10px] text-fg-dim uppercase tracking-wider">
          mapa
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="size-3 rounded-full bg-blue-500" /> novo
          <span className="size-3 rounded-full bg-amber-500 ml-3" /> contactado
          <span className="size-3 rounded-full bg-green-500 ml-3" /> virou lead
          <span className="size-3 rounded-full bg-red-500 ml-3" /> já cliente
        </div>
        <div className="text-fg pt-2 border-t border-accent/20">
          📍 Imobiliária Vila Madalena Ltda<br />
          ⭐ 4.5 · 📞 (11) 98765-4321<br />
          [💬 WhatsApp] [✉ Email] [→ Adicionar ao Pipeline]
        </div>
      </div>
    ),
    ctaHref: "/painel/prospects",
    ctaLabel: "Abrir o mapa real",
  },
  {
    emoji: "📋",
    eyebrow: "kanban de vendas",
    titulo: "Pipeline de leads",
    subtitulo: "Do prospect ao fechamento",
    descricao:
      "Cada lead virgem entra no funil: Prospect → Contato → Reunião → Proposta → Fechado / Perdido. Quando vira fechado, vincula à imobiliária cadastrada.",
    pontos: [
      "Drag-and-click pra mover entre colunas",
      "Valor estimado por lead pro forecast",
      "Motivo de perda obrigatório (aprende com erros)",
      "Origem rastreável: mapa, indicação, evento",
    ],
    ctaHref: "/painel/prospeccao",
    ctaLabel: "Abrir o Pipeline",
  },
  {
    emoji: "⚡",
    eyebrow: "trazer cliente na hora",
    titulo: "Cadastro Express",
    subtitulo: "Sem esperar a imob fazer cadastro sozinha",
    descricao:
      "Em vez de mandar link e torcer, você cadastra a imobiliária + corretor na hora. Sistema cria login no Clerk, gera senha temporária e MONTA o WhatsApp pronto com email + senha + link.",
    pontos: [
      "Você copia o WhatsApp e cola — 30 segundos",
      "Imob já entra automaticamente na SUA carteira",
      "Idempotente: se email existe, só vincula sem criar conta nova",
      "Bloqueia CNPJ duplicado",
    ],
    ctaHref: "/painel/cadastrar-imob",
    ctaLabel: "Abrir Cadastro Express",
  },
  {
    emoji: "🔗",
    eyebrow: "alavanca passiva",
    titulo: "Link de convite com tracking",
    subtitulo: "Comercial bom 'planta' link",
    descricao:
      "Gere um link único (ex: 'evento RioImobi 2026') e compartilhe. Quem se cadastra via esse link entra AUTOMATICAMENTE na sua carteira. Contador de cliques e conversões.",
    pontos: [
      "Pode ter vários links (1 por canal/evento)",
      "Cookie de origem dura 60 dias",
      "Conversão automática, sem você avisar admin",
      "Mostra taxa de conversão por link",
    ],
    ctaHref: "/painel/convidar",
    ctaLabel: "Gerar meu primeiro link",
  },
  {
    emoji: "💬",
    eyebrow: "sua voz, mais rápida",
    titulo: "Templates de WhatsApp",
    subtitulo: "Salve mensagens próprias por tipo de ação",
    descricao:
      "As mensagens padrão do Foco do Dia funcionam — mas você fala melhor. Salve templates por tipo (reativar, empurrar, parabenizar...) e marque como 'default'. O Foco do Dia passa a usar a SUA mensagem.",
    pontos: [
      "Variáveis: {nome}, {empresa}, {dias_inativa}, {numero_op}, {valor_op}",
      "Contador de uso por template",
      "Múltiplos templates por tipo (testa qual converte mais)",
    ],
    ctaHref: "/painel/templates",
    ctaLabel: "Configurar templates",
  },
  {
    emoji: "💰",
    eyebrow: "financeiro",
    titulo: "Comissões + Holerite + Relatórios",
    subtitulo: "Acompanhe o que vai cair na conta",
    descricao:
      "3 ferramentas pra você ter previsibilidade:\n• Comissões: lista de tudo a receber + pago\n• Holerite mensal: recibo print-friendly por mês\n• Relatórios: 5 gráficos (meta histórica, projeção 12m, performance, cohort, atividade CRM)",
    pontos: [
      "Comissão paga é 10% do lucro líquido da operação realizada",
      "Pago só quando o fundo recebeu",
      "Projeção visualiza o que VAI receber nos próximos 12 meses",
    ],
    ctaHref: "/painel/relatorios",
    ctaLabel: "Ver Relatórios",
  },
  {
    emoji: "🚀",
    eyebrow: "bora começar",
    titulo: "Tudo pronto!",
    subtitulo: "Volta aqui quando quiser",
    descricao:
      "Esse tour fica disponível pra sempre no menu do seu user (canto superior direito) → 'Onboarding'. Pode reabrir a qualquer momento.",
    pontos: [
      "Dúvida? Botão de Chat no menu chama o time AQ",
      "Conquistas no dashboard te mostram marcos atingidos",
      "Streak de meta é REAL — começa hoje!",
    ],
  },
];

export function ComercialTour({
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
      await markTourCompleted("comercial");
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
        {/* Progress bar */}
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

        {/* Conteúdo */}
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

        {/* Footer */}
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
