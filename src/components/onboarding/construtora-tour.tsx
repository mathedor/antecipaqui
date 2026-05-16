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
    emoji: "🏗️",
    eyebrow: "bem-vindo, parceira",
    titulo: "Atraia corretores top sem mexer no seu caixa",
    subtitulo: "Você paga o que já ia pagar, no prazo que já combinou — só que pra gente",
    descricao:
      "A Antecipaqui não muda nada do que você combinou com o corretor — você continua pagando exatamente o mesmo valor, nas mesmas datas. A diferença é que QUEM RECEBE no meio agora somos nós: pagamos o corretor à vista, e você nos paga em parcelas como sempre fez. Resultado: você passa a oferecer 'comissão antecipada' como diferencial competitivo SEM tirar um real a mais do bolso, e os corretores top correm pra trabalhar com você.",
    pontos: [
      "💸 Zero custo direto — o deságio (~6% a.m.) é do corretor, não seu",
      "🎯 Atrai corretores que antes só vendiam pra concorrência",
      "📈 Aumenta volume de vendas (corretor sem stress vende mais)",
      "🛡️ Você opina ANTES de assumir a comissão — sem surpresa",
      "💰 Cashback por pagar em dia — dinheiro extra sem esforço",
    ],
  },
  {
    emoji: "🔄",
    eyebrow: "como funciona em 30s",
    titulo: "O ciclo completo de uma operação",
    subtitulo: "Do contrato do corretor ao pagamento da última parcela",
    descricao:
      "Antes de te mostrar as telas, entenda o fluxo — assim cada feature faz sentido:",
    pontos: [
      "1️⃣ Corretor fecha venda com seu cliente, cadastra a comissão pra antecipar",
      "2️⃣ AQ valida documentos e calcula valor presente (o que paga ao corretor à vista)",
      "3️⃣ Op chega no SEU painel pra você confirmar 'sim, essa comissão é devida'",
      "4️⃣ Fundo investidor aprova → assinatura digital via ZapSign (você assina)",
      "5️⃣ Fundo paga o corretor à vista (com deságio)",
      "6️⃣ Você paga ao fundo nas datas originais que tinha combinado com o corretor",
    ],
    visual: (
      <div className="rounded-xl border-2 border-accent/30 bg-accent-soft p-4 font-mono text-xs">
        <div className="text-[10px] text-fg-dim uppercase tracking-wider mb-2">
          fluxo
        </div>
        <div className="flex items-center gap-1 text-[9px] flex-wrap">
          <span className="rounded bg-bg px-2 py-1 border border-border">
            corretor
          </span>
          <span>→</span>
          <span className="rounded bg-bg px-2 py-1 border border-border">
            AQ valida
          </span>
          <span>→</span>
          <span className="rounded bg-accent text-white px-2 py-1 font-bold">
            VOCÊ confirma
          </span>
          <span>→</span>
          <span className="rounded bg-bg px-2 py-1 border border-border">
            fundo
          </span>
          <span>→</span>
          <span className="rounded bg-success/20 px-2 py-1 border border-success/40">
            assinatura
          </span>
        </div>
      </div>
    ),
  },
  {
    emoji: "📊",
    eyebrow: "transparência total",
    titulo: "Operações — o painel da sua carteira",
    subtitulo: "Sabe exatamente quanto, pra quem e quando",
    descricao:
      "Toda operação vinculada à sua construtora aparece aqui: status atual, valor, corretor, comissão. Filtra por empreendimento ou período. Clica numa op pra abrir o 360 completo (timeline, docs, parcelas, assinaturas).\n\nBenefício direto: ZERO surpresa. Você sabe exatamente quanto tem em jogo, em que etapa está cada negócio, e quando os pagamentos vão sair. Substitui planilha + WhatsApp.",
    pontos: [
      "Status visual: rascunho → aguardando_aprovacao → pre_aprovada → assinatura → realizada",
      "Filtros por empreendimento (qual prédio gerou mais comissão?)",
      "Histórico completo nunca se apaga (auditoria pronta)",
    ],
    ctaHref: "/painel/operacoes",
    ctaLabel: "Abrir Operações",
  },
  {
    emoji: "🤝",
    eyebrow: "★ diferencial Antecipaqui",
    titulo: "Atendimentos parceiros — sua voz nas negociações",
    subtitulo: "Corretor te convida pra opinar ANTES de fechar",
    descricao:
      "Esse é o recurso que nenhuma outra plataforma tem. Antes de fechar com o cliente, o corretor pode te convidar pra acompanhar a negociação. Você vê a timeline em tempo real (proposta, contraproposta, dúvidas), e quando ele precisar de OK seu pra algo crítico (liberar desconto, confirmar disponibilidade, validar condição) ele 'solicita opinião' — você responde com flag 'recomenda? sim/não/condicional'.\n\nBenefício direto: você deixa de ser uma máquina pagadora e vira PARCEIRA ESTRATÉGICA. Corretor te procura mais, evita problemas que iriam te atrapalhar, e você fideliza o time comercial dele.",
    pontos: [
      "🎯 Captura problemas cedo (contrato esquisito, comissão suspeita)",
      "💼 Relacionamento mais forte com corretor (você ajudou, ele lembra)",
      "🚫 Menos processo judicial — você 'abençoa' a venda antes",
      "⭐ Diferencial competitivo: corretor escolhe trabalhar com você porque tem suporte",
    ],
    ctaHref: "/painel/atendimentos-parceiros",
    ctaLabel: "Abrir Atendimentos parceiros",
  },
  {
    emoji: "✅",
    eyebrow: "controle antes do compromisso",
    titulo: "Confirmação na pré-aprovação",
    subtitulo: "Quando op chega em 'pré-aprovada', é SUA vez de dar OK",
    descricao:
      "Toda operação passa por um ponto onde VOCÊ precisa confirmar antes de virar contrato. Você recebe notificação, abre a op e tem 3 caminhos: confirmar (a comissão é devida → segue pra assinatura), pedir documento (corretor não anexou contrato de venda → vira pendência), ou abrir chat com suporte AQ (alguma dúvida que precisa de humano).\n\nBenefício direto: você NUNCA é cobrada por uma comissão que não devia. Esse passo é seu firewall — sem você, ninguém assina nada.",
    pontos: [
      "Notificação no sino quando uma op chega em pre_aprovada",
      "Comentário fica registrado na timeline (audit)",
      "Pedido de doc vira pendência rastreável",
      "Depois do seu OK, vai pra análise final + assinatura (ZapSign)",
    ],
  },
  {
    emoji: "💸",
    eyebrow: "fluxo de pagamento",
    titulo: "Duplicatas — suas parcelas pra pagar",
    subtitulo: "Mesmo cronograma que tinha com o corretor — só destinatário muda",
    descricao:
      "Aqui ficam as parcelas que você precisa pagar ao fundo investidor. NADA mudou: os valores e datas são EXATAMENTE os que você havia combinado com o corretor. Só que agora você paga pra Antecipaqui (que pagou ele à vista) em vez de pagar direto pro corretor.\n\nBenefício direto: previsibilidade total. Você vê tudo num só lugar, pode pagar individualmente ou em lote, antecipar quando o caixa sobrar (e economizar juros), ou conversar com a gente se precisar de prazo.",
    pontos: [
      "Status visual: a vencer | vencida | paga",
      "Pagamento em lote (várias parcelas de uma vez)",
      "Antecipar parcela = desconto pré-calculado mostrado na hora",
      "Filtros por mês, status, empreendimento",
    ],
    ctaHref: "/painel/duplicatas",
    ctaLabel: "Ver Duplicatas",
  },
  {
    emoji: "💰",
    eyebrow: "★ dinheiro de volta",
    titulo: "Cashback — recompensa por pagar em dia",
    subtitulo: "Você ganha % das comissões antecipadas, sem fazer nada extra",
    descricao:
      "Toda operação aprovada gera cashback automático (% sobre o valor da comissão). Acumula no seu saldo, você saca quando quiser pra sua conta bancária. Quem paga em dia ganha mais — atrasos podem reduzir ou suspender o programa.\n\nBenefício direto: virou liquidez extra. Não tira do seu bolso, não custa nada — é literalmente um 'cofrinho' que enche cada operação. Empresas que processam volume grande tiram cashback significativo no mês.",
    pontos: [
      "🟢 Pague em dia → cashback flui",
      "🔴 Atraso recorrente → cashback congelado até regularizar",
      "Saque livre (sem mínimo na maioria dos casos)",
      "Histórico mostra quais ops geraram cashback",
    ],
    ctaHref: "/painel/cashback",
    ctaLabel: "Ver Cashback",
  },
  {
    emoji: "📈",
    eyebrow: "como o mercado te vê",
    titulo: "Score — sua nota de crédito transparente",
    subtitulo: "Fundos olham pra esse número antes de aprovar suas ops",
    descricao:
      "Score 0–100, calculado de forma totalmente transparente (fórmula visível pra você). Baseado no seu histórico de pagamentos: começa em 100, cada parcela vencida desconta pontos, atrasos graves descontam mais.\n\nBenefício direto: você sabe EXATAMENTE como melhorar (não é 'achismo'). Score alto = fundos aprovam ops maiores, mais rápido, com taxas melhores. Score baixo = aprovações lentas e ops menores. É o seu currículo financeiro vivo.",
    pontos: [
      "Score 80-100 (banda Boa): vai aprovar quase tudo, rápido",
      "Score 50-79 (Neutra): aprova com critério, valores médios",
      "Score < 50 (Baixa): aprovações restritas — foque em pagar pendências",
      "Recálculo automático após cada pagamento/atraso",
    ],
    ctaHref: "/painel/score",
    ctaLabel: "Ver meu Score",
  },
  {
    emoji: "🚨",
    eyebrow: "diversificação inteligente",
    titulo: "Risco — não dependa de um fundo só",
    subtitulo: "Veja sua exposição por fundo investidor",
    descricao:
      "Mostra quanto % do seu volume vem de cada fundo. Se um fundo concentra >60% das suas ops, sinaliza risco: se ele decidir reduzir limite ou pausar aprovações, você sente na hora.\n\nBenefício direto: visão estratégica. Você proativamente diversifica (puxa ops de outros fundos) antes de ficar dependente — e ganha poder de negociação. Fundo sabe que você tem alternativas → te trata melhor.",
    pontos: [
      "Gráfico mostra distribuição por fundo (%)",
      "Alerta visual quando algum fundo passa de 60%",
      "Histórico de concentração ao longo do tempo",
    ],
    ctaHref: "/painel/risco",
    ctaLabel: "Ver Risco",
  },
  {
    emoji: "📅",
    eyebrow: "planejamento de caixa",
    titulo: "Forecast — quanto você vai pagar nos próximos 12 meses",
    subtitulo: "Identifica picos antes de virar problema",
    descricao:
      "Projeção mês a mês de tudo que você tem a pagar (a partir das parcelas das ops ativas). Identifica os meses 'pesados' (ex: dezembro com muitos vencimentos) e te ajuda a planejar entrada de receita pra cobrir.\n\nBenefício direto: você antecipa apertos. Se mar/2027 vai ser pesado, você prioriza entrar com novas vendas em jan/fev pra ter caixa. Se quiser adiar uma parcela, conversa com a AQ com antecedência — não na véspera.",
    pontos: [
      "Visão mês a mês (12 meses)",
      "Total agregado em destaque",
      "Decomposição por construtora se você tem várias",
    ],
    ctaHref: "/painel/forecast",
    ctaLabel: "Ver Forecast",
  },
  {
    emoji: "📋",
    eyebrow: "contabilidade e auditoria",
    titulo: "Extrato — relatório pronto pra exportar",
    subtitulo: "CSV ou PDF, com filtro por período",
    descricao:
      "Lista todas as parcelas (pagas, a vencer, vencidas) num formato pronto pra contabilidade. Filtra por intervalo de datas, exporta em CSV (pra Excel) ou PDF (pra arquivo).\n\nBenefício direto: você não precisa pedir 'me manda o relatório' — você gera quando quiser. Sua contadora ama. Auditoria fica simples. E você tem uma cópia independente do sistema (não fica refém de nós).",
    pontos: [
      "Exportação imediata (sem esperar approval)",
      "Períodos custom (mês, trimestre, ano)",
      "Inclui números de contrato e empreendimento (rastreabilidade)",
    ],
    ctaHref: "/painel/extrato",
    ctaLabel: "Abrir Extrato",
  },
  {
    emoji: "🏢",
    eyebrow: "organização por projeto",
    titulo: "Empreendimentos — agrupe por obra",
    subtitulo: "Saiba qual prédio 'puxa' mais antecipações",
    descricao:
      "Cadastre seus empreendimentos (torres, condomínios, loteamentos). Cada operação pode ser vinculada a um → vira filtro nos relatórios. Você descobre que o Residencial Vista Alegre gerou R$2M em comissões antecipadas no ano e o Loteamento Praia só R$200k.\n\nBenefício direto: gestão por projeto. Você decide qual obra está dando retorno, qual precisa de mais marketing, qual exige mais financiamento de comissão. Time interno foca melhor.",
    pontos: [
      "Cadastro simples (nome, cidade, UF)",
      "Filtro em todos os relatórios (operações, extrato, forecast)",
      "Comparação entre projetos com poucos cliques",
    ],
    ctaHref: "/painel/empreendimentos",
    ctaLabel: "Cadastrar Empreendimento",
  },
  {
    emoji: "👥",
    eyebrow: "★ só pra owner",
    titulo: "Equipe — separe poderes com roles internas",
    subtitulo: "Financeiro, comercial, jurídico — cada um vê o que precisa",
    descricao:
      "Convide colegas internos por email. Cada um recebe login próprio com role específica:\n\n• Financeiro: duplicatas, extrato, forecast, cashback, score, risco — NÃO vê operações nem mexe em contratos\n• Comercial: operações, empreendimentos, score, risco — NÃO vê extrato detalhado\n• Jurídico: documentos, pendências — foco em compliance\n• Outro: só chat (acesso bem básico)\n• Owner (você): tudo\n\nBenefício direto: segurança real (senhas não compartilhadas), separação de poderes (financeiro não vira comercial), rastreamento (audit sabe quem fez o quê). Sai do 'todo mundo usa o mesmo login'.",
    pontos: [
      "Convite por email → colega recebe link de primeiro acesso",
      "Pode trocar role a qualquer momento",
      "Remover acesso é 1 clique (entrou ex-funcionário pra equipe? remove)",
    ],
    ctaHref: "/painel/equipe",
    ctaLabel: "Gerenciar Equipe",
  },
  {
    emoji: "📂",
    eyebrow: "documentação centralizada",
    titulo: "Documentos + Pendências — tudo num lugar só",
    subtitulo: "Atender pedido de doc é mais rápido que mandar zap",
    descricao:
      "DOCUMENTOS: arquivos da sua empresa (contrato social, CNPJ, comprovantes). Upload uma vez, ficam disponíveis pra todas as ops futuras.\n\nPENDÊNCIAS: lista de pedidos específicos do admin ou fundo (ex: 'contrato de venda da op #2026-0123'). Clica em 'atender', vai pra op, sobe o doc — pendência fecha sozinha.\n\nBenefício direto: nunca mais aquela situação de 'cadê o CNPJ?' por WhatsApp. Tudo arquivado, datado, organizado. Ops não atrasam por falta de doc.",
    pontos: [
      "Upload uma vez → reutiliza em todas as ops",
      "Notificação quando admin/fundo abre pendência nova",
      "Histórico de quem pediu, quando, e quando foi atendido",
    ],
    ctaHref: "/painel/documentos",
    ctaLabel: "Abrir Documentos",
  },
  {
    emoji: "🚀",
    eyebrow: "bora começar",
    titulo: "Tudo pronto!",
    subtitulo: "Volta aqui quando quiser",
    descricao:
      "Esse tour fica disponível pra sempre no menu do seu user (canto superior direito) → 'Onboarding'. Reabra quando precisar, ou quando entrar alguém novo na equipe.\n\nSUGESTÃO DE PRIMEIROS PASSOS:\n1. Veja seu Score — entenda como o mercado te avalia\n2. Cadastre 2-3 empreendimentos pra organizar relatórios desde já\n3. Convide pelo menos o financeiro pra equipe — separe acessos\n4. Configure alerta de notificações no celular pro sino\n5. Se já tem ops em andamento, abra Atendimentos parceiros e veja se algum corretor te chamou pra opinar",
    pontos: [
      "Dúvida? Chat no menu → time AQ responde rápido",
      "Sugestão de feature? Mesmo canal — adoramos input de construtora",
      "Onboarding da equipe? Cada role vê só o que precisa — peça pro time abrir o tour deles",
    ],
  },
];

export function ConstrutoraTour({
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
      await markTourCompleted("construtora");
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
