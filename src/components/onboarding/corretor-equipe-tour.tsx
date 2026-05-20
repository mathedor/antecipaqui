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

function buildSteps(imobNome: string): Step[] {
  const nome = imobNome || "sua imobiliária";
  return [
    {
      emoji: "👋",
      eyebrow: "bem-vindo à equipe",
      titulo: `Bem-vindo à equipe ${nome}!`,
      subtitulo: "Você é corretor membro — foco no SEU funil de vendas",
      descricao:
        "Você foi adicionado(a) como corretor(a) da equipe. Esse tour mostra exatamente o que você consegue fazer aqui — sem se perder em telas que não são pra você. A regra é simples: você vê SEUS atendimentos e SUAS comissões. Tudo que envolve a imob como um todo (financeiro consolidado, equipe, configuração) fica com o owner.",
      pontos: [
        "📋 Atendimentos: SEU CRM pessoal",
        "📝 Operações: comissões que viraram dinheiro antecipado",
        "💰 Projeção: o que vai cair na SUA conta",
      ],
    },
    {
      emoji: "🔒",
      eyebrow: "regras de acesso",
      titulo: "O que você vê (e o que não vê)",
      subtitulo: "Permissões do corretor membro",
      descricao:
        "Importante entender o limite do seu acesso antes de começar — assim você não fica procurando algo que não está aí pra você.",
      pontos: [
        "✅ Você vê: seus atendimentos, operações em que é o atendente, suas comissões, sua projeção pessoal",
        "❌ Você NÃO vê: atendimentos de colegas, financeiro consolidado da imob, equipe, configuração da imob",
        "🤝 Quando precisar de algo nesse nível, fala com o owner ou gerente da imob",
        "📞 Suporte AQ continua aberto pra você pelo chat",
      ],
    },
    {
      emoji: "📋",
      eyebrow: "★ seu CRM pessoal",
      titulo: "Atendimentos — só os seus",
      subtitulo: "Cada negociação vira um card no kanban",
      descricao:
        "Crie um atendimento pra cada cliente em prospecção. Mova pelo funil (Contato inicial → Qualificado → Visita → Proposta → Negociação → Fechado/Perdido). Registre TUDO na timeline pra não esquecer e pra o owner ver o histórico se precisar.",
      pontos: [
        "Cada card guarda dados do comprador + imóvel + comissão estimada",
        "Score Serasa sob demanda no botão",
        "Timeline rica: ligação, visita, proposta com valor, WhatsApp...",
        "Quando vira 'fechado' → botão pra encaminhar pra antecipação",
      ],
      visual: (
        <div className="rounded-xl border-2 border-accent/30 bg-accent-soft p-4 font-mono text-xs">
          <div className="text-[10px] text-fg-dim uppercase tracking-wider mb-2">
            seu kanban
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
      eyebrow: "você fica como atendente",
      titulo: "Cadastrar operação",
      subtitulo: "Quando a venda fechou e quer antecipar SUA comissão",
      descricao:
        "Em 2 minutos: escolhe a construtora, informa valor da venda + comissão + parcelas. Sistema calcula valor presente e gera cronograma. Você fica registrado como o atendente da op — assim sua comissão entra na SUA projeção, mesmo a operação sendo da imob.",
      pontos: [
        "Anexe os contratos obrigatórios (nota fiscal é opcional)",
        "Mesa AQ pré-aprova (até 24h)",
        "Fundo aprova final + assina contrato (ZapSign)",
        "Em até 1 dia útil o dinheiro cai na conta da imobiliária",
        "Sua comissão entra na sua projeção como atendente",
      ],
      ctaHref: "/painel/operacoes/nova",
      ctaLabel: "Cadastrar operação",
    },
    {
      emoji: "⚡",
      eyebrow: "atalho do CRM pra operação",
      titulo: "Atendimento → operação em 1 clique",
      subtitulo: "Quando o atendimento fica 'fechado'",
      descricao:
        "Mude o status do atendimento pra 'Fechado' (com valor e comissão preenchidos) → aparece botão grande 'Encaminhar pra antecipação'. Sistema cria operação rascunho com parcelas calculadas, já vinculando você como atendente.",
      pontos: [
        "Você só revisa e finaliza no /painel/operacoes",
        "Mantém histórico: atendimento ↔ operação conectados",
        "Sua comissão sai automática vinculada a você",
      ],
    },
    {
      emoji: "💰",
      eyebrow: "previsibilidade pessoal",
      titulo: "Projeção & Relatório (seus)",
      subtitulo: "Veja o que vai cair pra VOCÊ nos próximos meses",
      descricao:
        "Projeção: gráfico de 6 meses do que VAI cair pra você baseado nas parcelas das operações em que é atendente.\n\nRelatório: seu desempenho pessoal — quantos atendimentos por mês, taxa de conversão, ticket médio, construtoras mais frequentes.",
      pontos: [
        "Use a projeção pra planejar fluxo pessoal",
        "Use o relatório pra mostrar resultado pro owner",
        "Você NÃO vê o consolidado da imob — só o seu",
      ],
      ctaHref: "/painel/forecast-corretor",
      ctaLabel: "Abrir Projeção",
    },
    {
      emoji: "💬",
      eyebrow: "bora começar",
      titulo: "Tudo pronto!",
      subtitulo: "Volta aqui quando quiser",
      descricao:
        "Esse tour fica disponível pra sempre no menu do seu user (canto superior direito) → 'Onboarding'. Pode reabrir a qualquer momento — útil quando lança feature nova.\n\nPrecisa de ajuda? Pelo Chat você fala com o suporte AQ. Pra coisas internas da imob (acesso, equipe, financeiro consolidado), fala com o owner ou gerente.",
      pontos: [
        "Dúvida técnica? Botão de Chat no menu chama o time AQ",
        "Acesso/permissão? Fala com o owner da sua imob",
        "Próxima ação: cadastre seu primeiro atendimento",
      ],
    },
  ];
}

export function CorretorEquipeTour({
  open,
  onClose,
  imobNome,
}: {
  open: boolean;
  onClose: () => void;
  imobNome: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  const steps = buildSteps(imobNome);

  if (!open) return null;

  const total = steps.length;
  const cur = steps[step];
  const isLast = step === total - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / total) * 100;

  const handleClose = () => {
    startTransition(async () => {
      await markTourCompleted("corretor-equipe");
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
