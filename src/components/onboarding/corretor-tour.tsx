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
  /** Quando true, esse step só aparece pra owner da imobiliária. */
  ownerOnly?: boolean;
};

const ALL_STEPS: Step[] = [
  {
    emoji: "👋",
    eyebrow: "bem-vindo",
    titulo: "Bem-vindo à Antecipaqui!",
    subtitulo: "Você cuida do cliente. A gente cuida do dinheiro.",
    descricao:
      "Você está aqui pra fechar venda e antecipar comissão sem dor. Esse tour mostra o caminho do contato inicial até a comissão na conta — passando pelo CRM, cadastro de operação e acompanhamento.",
    pontos: [
      "📋 Atendimentos (CRM): negociações em andamento",
      "📝 Operações: comissões que viraram dinheiro antecipado",
      "💰 Projeção: o que vai cair na sua conta",
    ],
  },
  {
    emoji: "📋",
    eyebrow: "★ central de vendas",
    titulo: "Atendimentos — seu CRM",
    subtitulo: "Cada negociação vira um card no kanban",
    descricao:
      "Crie um atendimento pra cada cliente em prospecção. Mova pelo funil (Contato inicial → Qualificado → Visita → Proposta → Negociação → Fechado/Perdido). Registre TUDO na timeline pra não esquecer.",
    pontos: [
      "Cada card guarda dados do comprador + imóvel + comissão estimada",
      "Score Serasa sob demanda no botão",
      "Timeline rica: ligação, visita, proposta com valor, WhatsApp...",
      "Quando vira 'fechado' → botão pra encaminhar pra antecipação",
    ],
    visual: (
      <div className="rounded-xl border-2 border-accent/30 bg-accent-soft p-4 font-mono text-xs">
        <div className="text-[10px] text-fg-dim uppercase tracking-wider mb-2">
          kanban
        </div>
        <div className="grid grid-cols-6 gap-1 text-[10px]">
          <div className="rounded bg-bg p-1.5 border border-border">
            Contato
          </div>
          <div className="rounded bg-accent-soft p-1.5 border border-accent/30">
            Qualif.
          </div>
          <div className="rounded bg-purple-50 p-1.5 border border-purple-300">
            Visita
          </div>
          <div className="rounded bg-yellow-50 p-1.5 border border-warn/40">
            Proposta
          </div>
          <div className="rounded bg-yellow-50 p-1.5 border border-warn/40">
            Negoc.
          </div>
          <div className="rounded bg-green-50 p-1.5 border border-success/40 font-bold">
            Fechado
          </div>
        </div>
      </div>
    ),
    ctaHref: "/painel/atendimentos",
    ctaLabel: "Abrir Atendimentos",
  },
  {
    emoji: "🏗️",
    eyebrow: "negociação assistida",
    titulo: "Convidar construtoras pro atendimento",
    subtitulo: "Trazer parceiro pra opinar em momentos críticos",
    descricao:
      "Dentro de cada atendimento, você pode convidar UMA OU MAIS construtoras pra acompanhar. Elas veem a timeline e podem comentar. Quando precisa de aprovação (valor, desconto, condições), clica 'solicitar opinião' e elas recebem email + notificação destacada.",
    pontos: [
      "Tipos de pedido: aprovar valor / condições / liberar desconto / confirmar disponibilidade / opinião geral",
      "Resposta da construtora vem com flag 'recomenda prosseguir? sim/não/condicional'",
      "Quando encaminhar pra antecipação, se houver UMA construtora vinculada, ela vira automaticamente a construtora da operação",
    ],
  },
  {
    emoji: "📥",
    eyebrow: "comissões já te esperando",
    titulo: "Convites recebidos",
    subtitulo: "Quando a CONSTRUTORA cadastra a operação pra você",
    descricao:
      "Algumas construtoras parceiras cadastram a operação direto e te enviam convite. Você só anexa documentos (contrato + nota fiscal) e manda pra análise. É o atalho mais rápido.",
    pontos: [
      "Convite vira operação automaticamente quando você aceita",
      "Notificação no sino quando chegar convite novo",
      "Pode recusar se a comissão não for sua",
    ],
    ctaHref: "/painel/convites",
    ctaLabel: "Ver Convites recebidos",
  },
  {
    emoji: "🔗",
    eyebrow: "evitar digitar dados do comprador",
    titulo: "Link de Dados do comprador",
    subtitulo: "Mande pro cliente preencher CPF + dados",
    descricao:
      "Em vez de pegar foto de CPF/RG no WhatsApp, gera um link único e manda. Cliente preenche num formulário próprio. Quando termina, os dados já entram na operação ou no atendimento.",
    pontos: [
      "Link expira em 7 dias",
      "Você acompanha em tempo real se foi preenchido",
      "Reduz erro de digitação e atraso",
    ],
    ctaHref: "/painel/coleta-comprador",
    ctaLabel: "Gerar Link de Dados",
  },
  {
    emoji: "📝",
    eyebrow: "núcleo da Antecipaqui",
    titulo: "Cadastrar operação",
    subtitulo: "Quando a venda fechou e você quer antecipar",
    descricao:
      "Em 2 minutos: escolhe a construtora, informa o valor da venda + comissão + parcelas. Sistema calcula valor presente (quanto você recebe à vista) e gera o cronograma de parcelas que a construtora vai pagar pro fundo.",
    pontos: [
      "Anexe os contratos obrigatórios (nota fiscal é opcional)",
      "Mesa AQ pré-aprova (até 24h)",
      "Fundo aprova final + assina contrato (ZapSign)",
      "Em até 1 dia útil o dinheiro cai na sua conta",
    ],
    ctaHref: "/painel/operacoes/nova",
    ctaLabel: "Cadastrar primeira op",
  },
  {
    emoji: "⚡",
    eyebrow: "atalho do CRM pra operação",
    titulo: "Atendimento → operação em 1 clique",
    subtitulo: "Quando o atendimento fica 'fechado'",
    descricao:
      "Mude o status do atendimento pra 'Fechado' (com valor e comissão preenchidos) → aparece botão grande 'Encaminhar pra antecipação'. Sistema cria operação rascunho com parcelas calculadas, vinculando a construtora acompanhante (se houver).",
    pontos: [
      "Você só revisa e finaliza no /painel/operacoes",
      "Mantém histórico: atendimento ↔ operação conectados",
      "Comissão do comercial vinculado (se houver) sai automática",
    ],
  },
  {
    emoji: "💰",
    eyebrow: "previsibilidade",
    titulo: "Projeção & Relatório",
    subtitulo: "Veja o que vai cair na sua conta nos próximos meses",
    descricao:
      "Projeção: gráfico de 6 meses do que VAI cair na sua conta baseado nas parcelas das operações ativas.\n\nRelatório: detalhamento por construtora — quem mais paga, ticket médio, taxa de aprovação, custo médio de antecipação.",
    pontos: [
      "Use a projeção pra planejar fluxo de caixa pessoal",
      "Use o relatório pra escolher quais construtoras priorizar",
      "Score: como o mercado te vê (histórico de aprovação)",
    ],
    ctaHref: "/painel/forecast-corretor",
    ctaLabel: "Abrir Projeção",
  },
  {
    emoji: "👥",
    eyebrow: "★ só pra você (owner)",
    titulo: "Equipe — multi-corretor",
    subtitulo: "Convide corretores pra sua imobiliária",
    descricao:
      "Como owner da imobiliária, você pode convidar outros corretores e gerentes. Cada um recebe login próprio com permissões diferentes.",
    pontos: [
      "Corretor: vê SÓ os atendimentos próprios + ops onde é atendente, SEM financeiro consolidado",
      "Gerente: vê tudo, mas não pode editar config da imob nem gerenciar equipe",
      "Financeiro: foco em extrato + comissões, sem CRM",
      "Owner (você): controle total",
    ],
    ctaHref: "/painel/equipe",
    ctaLabel: "Convidar membro",
    ownerOnly: true,
  },
  {
    emoji: "🚀",
    eyebrow: "bora começar",
    titulo: "Tudo pronto!",
    subtitulo: "Volta aqui quando quiser",
    descricao:
      "Esse tour fica disponível pra sempre no menu do seu user (canto superior direito) → 'Onboarding'. Pode reabrir a qualquer momento — útil quando lança feature nova ou quando entra alguém novo na equipe.",
    pontos: [
      "Dúvida específica? Botão de Chat no menu chama o time AQ",
      "Próxima ação: registre seu primeiro atendimento OU cadastre uma operação se já tem fechada",
    ],
  },
];

export function CorretorTour({
  open,
  onClose,
  isImobOwner,
}: {
  open: boolean;
  onClose: () => void;
  isImobOwner: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  // Filtra steps owner-only
  const steps = ALL_STEPS.filter((s) => !s.ownerOnly || isImobOwner);

  if (!open) return null;

  const total = steps.length;
  const cur = steps[step];
  const isLast = step === total - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / total) * 100;

  const handleClose = () => {
    startTransition(async () => {
      await markTourCompleted("corretor");
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
