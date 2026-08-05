import type { ReactNode } from "react";
import type { TourId } from "@/lib/actions/onboarding-tour";

export type PageHelpEntry = {
  titulo: string;
  resumo: string;
  oQueFaz?: string[];
  comoUsar?: string[];
  calculos?: string[];
  dicas?: string[];
  visual?: ReactNode;
  /** Quando passado, mostra botão pra reabrir o tour completo daquele role. */
  tourId?: TourId;
};

/* =============================================================
   Visuais reutilizáveis (mockups inline ASCII em React)
   ============================================================= */

function KanbanMini() {
  return (
    <div>
      <div className="text-[10px] text-fg-dim uppercase tracking-wider mb-2">
        kanban
      </div>
      <div className="grid grid-cols-6 gap-1 text-[9px]">
        <div className="rounded bg-bg p-1.5 border border-border text-center">
          Contato
        </div>
        <div className="rounded bg-accent-soft p-1.5 border border-accent/30 text-center">
          Qualif.
        </div>
        <div className="rounded bg-purple-50 p-1.5 border border-purple-300 text-center">
          Visita
        </div>
        <div className="rounded bg-yellow-50 p-1.5 border border-warn/40 text-center">
          Propos.
        </div>
        <div className="rounded bg-yellow-50 p-1.5 border border-warn/40 text-center">
          Negoc.
        </div>
        <div className="rounded bg-green-50 p-1.5 border border-success/40 text-center font-bold">
          Fechado
        </div>
      </div>
    </div>
  );
}

function OperacaoStatusFlow() {
  return (
    <div>
      <div className="text-[10px] text-fg-dim uppercase tracking-wider mb-2">
        fluxo de status
      </div>
      <div className="flex items-center gap-1 text-[9px] flex-wrap">
        <span className="rounded bg-bg px-1.5 py-1 border border-border">
          rascunho
        </span>
        <span>→</span>
        <span className="rounded bg-bg px-1.5 py-1 border border-border">
          aguard.
        </span>
        <span>→</span>
        <span className="rounded bg-blue-50 px-1.5 py-1 border border-accent/40">
          pré-aprov.
        </span>
        <span>→</span>
        <span className="rounded bg-yellow-50 px-1.5 py-1 border border-warn/40">
          assinatura
        </span>
        <span>→</span>
        <span className="rounded bg-green-50 px-1.5 py-1 border border-success/40 font-bold">
          realizada
        </span>
      </div>
    </div>
  );
}

/* =============================================================
   Catálogo de helps por chave de página
   ============================================================= */

// Lista mestre das chaves — fonte de verdade pra typesafety.
const PAGE_HELP_KEYS = [
  // corretor / imobiliária
  "painel-atendimentos",
  "painel-operacoes-corretor",
  "painel-operacoes-nova",
  "painel-coleta-comprador",
  "painel-forecast-corretor",
  "painel-relatorio-corretor",
  "painel-convites",
  "painel-equipe-imob",
  "painel-perfil",
  "painel-suporte",
  // construtora
  "painel-operacoes-construtora",
  "painel-atendimentos-parceiros",
  "painel-duplicatas",
  "painel-extrato-construtora",
  "painel-risco-construtora",
  "painel-score-construtora",
  "painel-cashback",
  "painel-documentos",
  "painel-equipe-construtora",
  "painel-empreendimentos",
  "painel-pendencias-construtora",
  "painel-forecast-construtora",
  // fundo
  "painel-aprovar",
  "painel-pendencias-decisao",
  "painel-operacoes-fundo",
  "painel-daily",
  "painel-recebimentos",
  "painel-faturas-fundo",
  "painel-recaps",
  "painel-forecast-fundo",
  "painel-risco-fundo",
  "painel-parceiros",
  "painel-comerciais-fundo",
  "painel-regras",
  "painel-api",
  "painel-webhooks",
  // comercial
  "painel-prospects",
  "painel-prospeccao",
  "painel-cadastrar-imob",
  "painel-convidar",
  "painel-daily-comercial",
  "painel-operacoes-comercial",
  "painel-comissoes",
  "painel-comissoes-holerite",
  "painel-relatorios-comercial",
  "painel-templates",
  // admin
  "admin-dashboard",
  "admin-decidir",
  "admin-pendencias",
  "admin-operacoes",
  "admin-fundos",
  "admin-fundos-novo",
  "admin-fundo-detalhe",
  "admin-cadastrar-comercial",
  "admin-comerciais",
  "admin-construtoras",
  "admin-cadastrar-construtora",
  "admin-usuarios",
  "admin-cadastrar-imobiliaria",
  "admin-usuarios-admins",
  "admin-visao",
  "admin-tickets",
  "admin-mural",
  "admin-relatorios",
  "admin-relatorios-logs",
  "admin-configuracoes",
  "admin-custos",
  "admin-risco-global",
  "admin-credito",
  "admin-convites",
  "admin-webhooks",
  "admin-backups",
  "admin-faturas",
  "admin-interno-invoice",
] as const;

export type PageHelpKey = (typeof PAGE_HELP_KEYS)[number];

export const PAGE_HELPS: Record<PageHelpKey, PageHelpEntry> = {
  /* ============= CORRETOR / IMOBILIÁRIA ============= */
  "painel-atendimentos": {
    titulo: "Atendimentos (CRM)",
    resumo:
      "Seu kanban pessoal de negociações. Cada cliente em prospecção vira um card que você move pelo funil até fechar a venda.",
    visual: <KanbanMini />,
    oQueFaz: [
      "Lista TODOS os atendimentos onde você é o atendente (corretor membro vê só os seus; owner/gerente vê os do time)",
      "Cards com dados do comprador, imóvel, comissão estimada, score Serasa sob demanda",
      "Timeline rica: ligações, visitas, propostas, mensagens — registre TUDO",
      "Quando vira 'fechado' aparece botão pra encaminhar pra antecipação (vira operação automaticamente)",
    ],
    comoUsar: [
      "Clique '+ Novo atendimento' pra cadastrar prospect novo",
      "Arraste o card entre colunas pra mudar status (ou clique pra abrir e ajustar)",
      "Dentro do card, use 'adicionar nota' pra registrar interações",
      "No status 'Fechado', preencha valor + comissão e use 'Encaminhar pra antecipação'",
    ],
    dicas: [
      "Convide construtoras pra acompanhar (botão 'convidar construtora' no detalhe) — elas opinam em momentos críticos",
      "Score Serasa só consulta quando você clica (não é automático — custo controlado)",
      "Score do CRM (próprio) sobe quando você move pra estágios avançados e desce quando perde",
    ],
    tourId: "corretor",
  },
  "painel-operacoes-corretor": {
    titulo: "Operações",
    resumo:
      "Lista de comissões que viraram operação de antecipação. Aqui você acompanha do envio à mesa AQ até a chegada do dinheiro na sua conta.",
    visual: <OperacaoStatusFlow />,
    oQueFaz: [
      "Lista ops onde você é o atendente — qualquer status (rascunho → realizada)",
      "Filtros por status, construtora, período",
      "Clique numa op pra ver o 360 completo: docs, parcelas, contrato, timeline",
      "Status 'realizada' = dinheiro caiu na conta",
    ],
    comoUsar: [
      "Use '+ Nova operação' pra cadastro direto (ou venha do CRM via 'Encaminhar')",
      "Acompanhe o sino de notificações: avisa quando mesa pré-aprova, fundo aprova, contrato pronto, etc",
      "Quando status = 'enviada para assinatura', verifique seu email — chegou link da ZapSign",
    ],
    dicas: [
      "Pra cadastrar op nova é mais rápido vir do CRM (preenche tudo automaticamente)",
      "Filtre por 'docs incompletos' pra agir nas que estão paradas por sua culpa",
      "Score AQ sobe quando aprovado, desce quando recusado — atinge fundos melhores",
    ],
    tourId: "corretor",
  },
  "painel-operacoes-nova": {
    titulo: "Nova operação",
    resumo:
      "Cadastro manual de uma comissão pra antecipar. Em 2 minutos: construtora, valores, parcelas — sistema calcula valor presente e gera cronograma.",
    oQueFaz: [
      "Formulário em etapas: comprador → imóvel → comissão → docs → revisão",
      "Calcula automaticamente valor presente (VP) baseado na taxa do fundo e quantidade de parcelas",
      "Permite anexar contrato e nota fiscal (obrigatórios pra prosseguir)",
      "Salva como rascunho — você pode fechar e voltar depois",
    ],
    comoUsar: [
      "Escolha a construtora (lista populada com as cadastradas)",
      "Informe valor da venda e valor da comissão",
      "Defina nº de parcelas e datas de vencimento (sistema sugere mensais)",
      "Anexe contrato (PDF) + nota fiscal (PDF ou imagem)",
      "Revise e clique 'Enviar pra análise'",
    ],
    calculos: [
      "VP = Σ (parcela / (1 + taxa_mensal)^n)",
      "Deságio = comissão total − VP",
      "Custos AQ + fundo descontam do que cai pra você",
    ],
    dicas: [
      "Se a construtora tem 'fundo fidelizado' configurado, taxa e fundo já vêm preenchidos",
      "Use Link de Dados (no menu) pra pedir CPF/RG do comprador SEM precisar trocar zaps",
    ],
    tourId: "corretor",
  },
  "painel-coleta-comprador": {
    titulo: "Link de Dados do comprador",
    resumo:
      "Gera link único pra cliente preencher CPF, RG, comprovante de renda e demais dados — sem você precisar pedir foto por WhatsApp.",
    oQueFaz: [
      "Gera URL única (válida por 7 dias) pra mandar pro comprador",
      "Cliente preenche num formulário próprio (mobile-friendly)",
      "Dados entram automaticamente na op ou atendimento que você criou",
      "Status em tempo real: pendente / parcial / concluído",
    ],
    comoUsar: [
      "Clique '+ Gerar link'",
      "Escolha vincular a um atendimento existente OU criar avulso",
      "Copie o link e mande pro cliente (WhatsApp/email)",
      "Acompanhe na lista — quando ficar 'concluído', dados já estão na op",
    ],
    dicas: [
      "Link expira em 7 dias por segurança — gere de novo se cliente demorar",
      "Cliente pode pausar e voltar — dados parciais ficam salvos",
      "Use SEMPRE — reduz erro de digitação e atrito enorme",
    ],
    tourId: "corretor",
  },
  "painel-forecast-corretor": {
    titulo: "Projeção (Forecast)",
    resumo:
      "Gráfico de 6 meses do que VAI cair na sua conta — calculado a partir das parcelas das operações ativas.",
    oQueFaz: [
      "Lista mês a mês os recebíveis dos próximos 6 meses",
      "Apenas considera ops em status 'realizada' (já aprovadas + pagas pelo fundo pra você)",
      "Decompõe por construtora e por mês",
    ],
    calculos: [
      "Projeção mensal = soma dos VPs descontados rateados nos meses de vencimento das parcelas",
    ],
    dicas: [
      "Use pra planejar fluxo pessoal — sabe quando vai apertar e quando vai sobrar",
      "Se a projeção está vazia, é porque não tem op realizada ainda — cadastre",
    ],
    tourId: "corretor",
  },
  "painel-relatorio-corretor": {
    titulo: "Relatório",
    resumo:
      "Análise do seu desempenho: ops por mês, ticket médio, taxa de aprovação, construtoras mais frequentes.",
    oQueFaz: [
      "KPIs gerais: total operado, qtd ops aprovadas, taxa de aprovação, ticket médio",
      "Distribuição por construtora — quem mais paga / quem você mais opera",
      "Histórico mensal pra ver tendência",
    ],
    dicas: [
      "Use pra mostrar resultado pro owner da imob (se você é membro)",
      "Identifique qual construtora dá menos atrito — priorize-a",
    ],
    tourId: "corretor",
  },
  "painel-convites": {
    titulo: "Convites recebidos",
    resumo:
      "Operações onde uma construtora cadastrou a comissão direto e te enviou convite — você só revisa, anexa docs e manda pra análise. Atalho mais rápido.",
    oQueFaz: [
      "Lista convites pendentes da construtora (aguardando você aceitar)",
      "Convite vira operação automaticamente ao aceitar",
      "Pode recusar se comissão não for sua ou tiver erro",
    ],
    comoUsar: [
      "Clique no convite pra ver detalhes",
      "Confirme dados (valor, parcelas, comprador)",
      "Anexe contrato + nota fiscal",
      "Aceite → vira op em status 'rascunho' pra você finalizar",
    ],
    dicas: [
      "Sino de notificações avisa quando chegar convite novo",
      "Se a construtora errou algo, recuse com motivo — ela cadastra de novo certinho",
    ],
    tourId: "corretor",
  },
  "painel-equipe-imob": {
    titulo: "Equipe (multi-corretor)",
    resumo:
      "Só pro owner da imobiliária. Convide outros corretores e gerentes pra trabalhar dentro da sua imob, cada um com permissões diferentes.",
    oQueFaz: [
      "Lista membros ativos com role interna (corretor / gerente / financeiro / outro)",
      "Convite por email — colega recebe link de primeiro acesso",
      "Pode remover membro a qualquer momento (mantém histórico)",
    ],
    comoUsar: [
      "Clique 'convidar membro'",
      "Preencha nome, email, telefone e role",
      "Sistema cria conta + envia WhatsApp/email com link",
      "Membro loga e cai direto no painel com permissões certas",
    ],
    dicas: [
      "Corretor (membro) só vê os atendimentos próprios e ops onde é atendente",
      "Gerente vê tudo mas não pode editar config nem gerenciar equipe",
      "Financeiro foca em extrato + comissões, sem CRM",
    ],
    tourId: "corretor",
  },
  "painel-perfil": {
    titulo: "Meus dados",
    resumo:
      "Edite seus dados cadastrais (nome, telefone, email), dados bancários (pra receber antecipações) e altere senha.",
    oQueFaz: [
      "Dados pessoais (nome, telefone, email)",
      "Dados bancários (banco, agência, conta, PIX)",
      "Documentação (CPF, CRECI, comprovantes)",
      "Mudança de senha",
    ],
    dicas: [
      "Manter dados bancários atualizados é CRÍTICO — é pra onde o dinheiro cai",
      "Telefone com DDD — alguns SMS dependem disso",
    ],
  },
  "painel-suporte": {
    titulo: "Chats (suporte)",
    resumo:
      "Conversa com time Antecipaqui e com outros parceiros (construtora, fundo) sobre tickets específicos.",
    oQueFaz: [
      "Lista todos os chats em andamento, agrupados por categoria",
      "Suporte: você ↔ admin AQ",
      "Operações/negociações: você ↔ fundo (sobre uma op específica)",
      "Confirmação: você ↔ construtora",
    ],
    comoUsar: [
      "Clique '+ Novo chat' pra abrir ticket novo",
      "Escolha categoria + assunto + descrição",
      "Aguarde resposta (notificação no sino)",
    ],
    dicas: [
      "Pra dúvidas gerais use 'suporte'",
      "Pra dúvida sobre op específica use 'operações' — admin já vê de qual op é",
    ],
  },

  /* ============= CONSTRUTORA ============= */
  "painel-operacoes-construtora": {
    titulo: "Operações",
    resumo:
      "Lista TODAS operações que envolvem sua construtora, ativas ou encerradas. Sua visibilidade total da carteira.",
    visual: <OperacaoStatusFlow />,
    oQueFaz: [
      "Lista ops vinculadas (qualquer status) com filtro por empreendimento, período, busca",
      "Click numa op abre o 360 com timeline, docs, parcelas, contrato, assinaturas",
      "Status 'pre_aprovada' = sua confirmação é necessária",
      "Sem custo direto pra você — comissão é do corretor",
    ],
    dicas: [
      "Filtre por empreendimento pra ver quanto cada obra gerou",
      "Notificação chega quando uma op precisa de confirmação sua",
    ],
    tourId: "construtora",
  },
  "painel-atendimentos-parceiros": {
    titulo: "Atendimentos parceiros",
    resumo:
      "★ Diferencial Antecipaqui. Corretores te convidam pra acompanhar/opinar nas negociações ANTES da venda fechar. Você vira parceira estratégica.",
    oQueFaz: [
      "Lista atendimentos onde algum corretor te convidou pra acompanhar",
      "Timeline da negociação em tempo real (proposta, contraproposta, dúvidas)",
      "Pedidos de opinião marcados em destaque (aguardando sua resposta)",
      "Resposta vai com flag 'recomenda prosseguir? sim/não/condicional'",
    ],
    comoUsar: [
      "Abra o atendimento que tem flag 'aguardando sua opinião'",
      "Leia o histórico e o pedido específico do corretor",
      "Responda com seu parecer + recomendação (sim/não/condicional)",
      "Adicione comentário ou link de WhatsApp pra falar direto com corretor",
    ],
    dicas: [
      "Use pra capturar problemas cedo (contrato esquisito, comissão suspeita)",
      "Quanto mais você participa, mais corretores te procuram pra trabalhar com você",
      "Resposta rápida = relacionamento mais forte",
    ],
    tourId: "construtora",
  },
  "painel-duplicatas": {
    titulo: "Duplicatas",
    resumo:
      "Cronograma de parcelas que você precisa pagar ao fundo investidor — mesmos valores e datas que tinha combinado com o corretor, só destinatário muda.",
    oQueFaz: [
      "Lista todas as parcelas (a vencer, vencidas, pagas) por op",
      "Cálculo automático de encargos pra atrasadas (multa + juros mora)",
      "Pagamento em lote (várias parcelas de uma vez)",
      "Antecipar parcela: sistema calcula desconto e mostra na hora",
    ],
    calculos: [
      "Encargo atraso = valor × (multa_pct + juros_mensal/30 × dias_atraso)",
      "Antecipação = valor − (valor × taxa_op × (meses_antecipados))",
    ],
    dicas: [
      "Pagar em dia preserva score (= aprovações mais rápidas)",
      "Antecipar quando sobrar caixa = economia de juros",
    ],
    tourId: "construtora",
  },
  "painel-extrato-construtora": {
    titulo: "Extrato financeiro",
    resumo:
      "Relatório completo de todas parcelas (pagas, a vencer, vencidas) com exportação pra contabilidade e auditoria.",
    oQueFaz: [
      "Filtro por intervalo de datas",
      "Exporta CSV (pra Excel/planilha)",
      "Exporta PDF (pra arquivo formal/auditoria)",
      "Inclui número de contrato e empreendimento de cada parcela",
    ],
    comoUsar: [
      "Selecione período (mês, trimestre, ano custom)",
      "Clique 'Exportar CSV' ou 'Exportar PDF'",
      "Arquivo baixa imediatamente",
    ],
    dicas: [
      "Sua contadora vai amar o CSV mensal",
      "Em compliance/auditoria use PDF (formato estável)",
    ],
    tourId: "construtora",
  },
  "painel-risco-construtora": {
    titulo: "Risco",
    resumo:
      "Análise de concentração de fundos — mostra quanto % do seu volume vem de cada fundo investidor, alerta quando algum passa de 60%.",
    oQueFaz: [
      "Gráfico de distribuição por fundo",
      "Lista com volume operado e % do total",
      "Alerta visual quando concentração crítica (>60% em 1 fundo)",
    ],
    dicas: [
      "Se 1 fundo tem >60%, comece a oferecer ops pra outros — diversifique",
      "Concentração alta = você fica refém das decisões daquele fundo",
    ],
    tourId: "construtora",
  },
  "painel-score-construtora": {
    titulo: "Score",
    resumo:
      "Sua nota de crédito no sistema (0-100), calculada de forma transparente. Fundos veem isso ao decidir suas operações.",
    oQueFaz: [
      "Score atual + banda (Baixa / Neutra / Boa)",
      "Fórmula visível e dicas pra melhorar",
      "Histórico de score ao longo do tempo",
    ],
    calculos: [
      "Score = 100 − min(50, vencidas × 2) − min(40, vencidas_graves × 8)",
      "Vencidas: qualquer parcela vencida não paga",
      "Vencidas graves: vencidas há mais de N dias (configurável)",
    ],
    dicas: [
      "Score 80-100 (Boa): aprovações rápidas e ops maiores",
      "Score 50-79 (Neutra): aprovações com critério",
      "Score <50 (Baixa): aprovações restritas — quite vencidas pra subir",
    ],
    tourId: "construtora",
  },
  "painel-cashback": {
    titulo: "Cashback",
    resumo:
      "Programa de recompensa: cada operação aprovada gera % de cashback. Acumula no saldo, você saca pra conta bancária.",
    oQueFaz: [
      "Saldo disponível, sacado, total acumulado",
      "Histórico de operações que geraram cashback",
      "Solicitar saque pra conta bancária cadastrada",
    ],
    dicas: [
      "Pagar em dia mantém cashback fluindo",
      "Atrasos graves podem congelar cashback até regularizar",
      "Sem mínimo de saque na maioria dos casos",
    ],
    tourId: "construtora",
  },
  "painel-documentos": {
    titulo: "Documentos",
    resumo:
      "Repositório centralizado dos documentos da sua empresa (CNPJ, contrato social, comprovantes). Upload uma vez, reutiliza em todas as ops.",
    oQueFaz: [
      "Upload de doc por tipo (contrato social, CNPJ, comprovante endereço, etc)",
      "Renovação quando vencer (sinaliza visualmente)",
      "Histórico de quem pediu, quando, e quando foi atendido",
    ],
    dicas: [
      "Mantenha docs sempre atualizados — agiliza novas ops",
      "Doc da empresa ≠ doc de op específica (esse último vai em pendências)",
    ],
    tourId: "construtora",
  },
  "painel-equipe-construtora": {
    titulo: "Equipe (multi-membro)",
    resumo:
      "Convide colegas internos com roles específicas (financeiro / comercial / jurídico / outro). Separação de poderes e auditoria por usuário.",
    oQueFaz: [
      "Lista membros + role interna",
      "Convite por email (vira user separado)",
      "Pode trocar role ou remover acesso",
    ],
    dicas: [
      "Financeiro: duplicatas, extrato, cashback, score — sem CRM",
      "Comercial: operações, empreendimentos, score — sem extrato",
      "Jurídico: documentos, pendências — foco em compliance",
    ],
    tourId: "construtora",
  },
  "painel-empreendimentos": {
    titulo: "Empreendimentos",
    resumo:
      "Cadastre suas obras (torres, condomínios, loteamentos). Cada operação pode ser vinculada a um → filtro em todos os relatórios.",
    oQueFaz: [
      "Lista empreendimentos cadastrados",
      "Form de novo empreendimento (nome, cidade, UF)",
      "Filtro em ops/extrato/forecast por empreendimento",
    ],
    dicas: [
      "Cadastre antes de começar as ops — fica mais fácil organizar depois",
      "Vai descobrir qual obra mais 'puxa' antecipação",
    ],
    tourId: "construtora",
  },
  "painel-pendencias-construtora": {
    titulo: "Pendências",
    resumo:
      "Lista pedidos de documentos abertos pelo admin/fundo, específicos pra uma op. Clica em 'atender' e vai direto pra op pra subir o doc.",
    oQueFaz: [
      "Pedidos abertos (admin/fundo precisa de doc específico)",
      "Cada pendência aponta pra op correspondente",
      "Quando você sobe o doc, pendência fecha sozinha",
    ],
    dicas: [
      "Pendência aberta atrasa op — atenda rápido",
      "Notificação no sino quando abrirem pendência nova",
    ],
    tourId: "construtora",
  },
  "painel-forecast-construtora": {
    titulo: "Forecast",
    resumo:
      "Projeção de tudo que você vai PAGAR nos próximos 12 meses. Identifica meses pesados pra planejar caixa.",
    oQueFaz: [
      "Visão mês a mês (12 meses)",
      "Total agregado em destaque",
      "Identifica meses críticos (picos de vencimento)",
    ],
    dicas: [
      "Se mês X vai ser pesado, prioriza entrar com vendas em meses anteriores",
      "Quer adiar parcela? Fale com a AQ ANTES de vencer — não na véspera",
    ],
    tourId: "construtora",
  },

  /* ============= FUNDO ============= */
  "painel-aprovar": {
    titulo: "Mesa de Decisão",
    resumo:
      "Fila consolidada de operações aguardando SUA decisão. Tudo que você precisa pra decidir está inline: score, docs, financeiro.",
    oQueFaz: [
      "Lista ops em fundoAprovacao='pendente'",
      "Score da construtora (0-100 baseado em histórico no SEU fundo)",
      "Docs validados por IA (OK/em revisão/sem validação)",
      "Decomposição financeira: comissão, VP, juros, custos, sua parte",
      "Comparativo de taxa: taxa da op × sua taxa-base",
    ],
    comoUsar: [
      "Aprove ops onde score alto + docs OK + financeiro bom",
      "Recuse com motivo quando algo não bate (motivo vira audit)",
      "Considere criar regra automática pras ops 'óbvias' (veja /painel/regras)",
    ],
    dicas: [
      "Score baixo + docs em revisão = abra antes de decidir",
      "Aprovação libera capital — fundo paga AQ → AQ paga corretor",
    ],
    tourId: "fundo",
  },
  "painel-pendencias-decisao": {
    titulo: "Pendências de decisão",
    resumo:
      "Antecipações e renegociações solicitadas pelas construtoras de ops JÁ em pagamento — diferente da mesa de aprovação (ops novas).",
    oQueFaz: [
      "Antecipações: construtora quer quitar antes pra reduzir juros",
      "Renegociações: construtora quer estender prazo ou reduzir parcelas",
      "Cada pedido vem com cálculo do impacto no seu retorno",
    ],
    dicas: [
      "Aceitar antecipação = recebe valor presente recalculado (menor que o futuro)",
      "Aceitar renegociação = altera cronograma de parcelas",
      "Recusar mantém contrato original",
    ],
    tourId: "fundo",
  },
  "painel-operacoes-fundo": {
    titulo: "Operações",
    resumo:
      "Sua carteira completa: tudo que você já aprovou, em qualquer status. Visibilidade total.",
    oQueFaz: [
      "Filtros por construtora, período, status",
      "Click numa op abre 360 com timeline, docs, parcelas, logs",
      "Status finais: realizada (em pagamento) / recusada / cancelada",
    ],
    dicas: [
      "Filtre por construtora pra avaliar relacionamento individual",
      "Filtre por status 'recusada' pra revisar critérios das regras",
    ],
    tourId: "fundo",
  },
  "painel-daily": {
    titulo: "Daily",
    resumo:
      "Foco operacional do dia: quem precisa pagar HOJE, esta semana, este mês. Com cálculo automático de multa e juros pras vencidas.",
    oQueFaz: [
      "Parcelas a vencer + vencidas",
      "Filtros: hoje / semana / mês / 3 meses / custom",
      "Cálculo automático de encargos",
      "Botões de ação: cobrar (WhatsApp/email), gerar boleto",
    ],
    calculos: [
      "Encargo = valor × (multa_pct + juros_mensal/30 × dias_atraso)",
      "Multa padrão: 2% (configurável por fundo)",
      "Juros mora padrão: taxa_mensal/30 × dias",
    ],
    dicas: [
      "Abra todo dia de manhã — é o seu radar de cobrança",
      "Vencidas há +5 dias merecem ligação, não só email",
    ],
    tourId: "fundo",
  },
  "painel-recebimentos": {
    titulo: "Recebimentos",
    resumo:
      "Pipeline completo de parcelas (a receber, atrasadas, recebidas) com KPIs. Use pra reconciliar com extrato bancário.",
    oQueFaz: [
      "Lista TODAS as parcelas (qualquer status)",
      "KPIs: a receber não atrasadas / atrasadas / já recebido",
      "Clique numa parcela pra ver detalhe (boleto, baixa)",
    ],
    dicas: [
      "Use pra reconciliação bancária mensal",
      "% inadimplência = atrasadas / (a receber + atrasadas + recebidas)",
    ],
    tourId: "fundo",
  },
  "painel-faturas-fundo": {
    titulo: "Faturas",
    resumo:
      "Cobranças que a Antecipaqui te envia mensalmente: custos operacionais + 50% do spread das ops aprovadas.",
    oQueFaz: [
      "Lista faturas por mês ref",
      "Status: pendente / parcial / paga / vencida",
      "Decomposição: custos + spread",
    ],
    calculos: [
      "Fatura = Σ (custos_op + 50% × spread_op) das ops realizadas no mês",
    ],
    dicas: [
      "Fundo NÃO paga pela plataforma — combina diretamente com admin AQ",
      "Use o histórico pra prever fatura do próximo mês",
    ],
    tourId: "fundo",
  },
  "painel-recaps": {
    titulo: "Recaps",
    resumo:
      "Resumos automáticos periódicos (diário/semanal/mensal): ops aprovadas, inadimplência, prazo médio de análise, antecipações.",
    oQueFaz: [
      "Recaps já gerados (automaticamente via cron)",
      "Filtro por período (preset ou custom)",
      "Conteúdo: KPIs do período",
    ],
    dicas: [
      "Use pra olhar a semana passada toda segunda",
      "Use pra fechar o mês todo dia 1º",
    ],
    tourId: "fundo",
  },
  "painel-forecast-fundo": {
    titulo: "Forecast",
    resumo:
      "Projeção de fluxo de caixa pros próximos 6 meses, decomposta em bruto / sua parte / parte AQ.",
    oQueFaz: [
      "Mês a mês com 3 linhas: bruto, sua parte, parte AQ",
      "KPIs: recebido mês atual, totais 6m",
    ],
    calculos: [
      "Bruto = soma das parcelas a_vencer + vencidas",
      "Sua parte = custo $$ + 50% spread (sua receita)",
      "Parte AQ = custos AQ + 50% spread (vai pra fatura)",
    ],
    dicas: [
      "Use pra planejamento de tesouraria",
      "Forecast usa só não-pagas — não conta o que já recebeu",
    ],
    tourId: "fundo",
  },
  "painel-risco-fundo": {
    titulo: "Risco",
    resumo:
      "Análise de concentração de capital + devedoras + blacklist. Gestão proativa pra não ficar refém de poucas construtoras.",
    oQueFaz: [
      "Concentração por construtora (top 15) — alerta a 25%, crítico a 40%",
      "Devedoras: quem está atrasando, qtd parcelas, dias médio atraso",
      "Blacklist: construtoras bloqueadas (não podem criar op com você)",
    ],
    comoUsar: [
      "Veja concentração — se construtora X passa de 25%, considere desacelerar",
      "Marque devedoras de longa data como blacklist",
      "Blacklist é instantâneo — bloqueia novas ops, não afeta as ativas",
    ],
    tourId: "fundo",
  },
  "painel-parceiros": {
    titulo: "Parceiros",
    resumo:
      "Catálogo de construtoras + imobiliárias/corretores que já operaram com você, ordenados por volume.",
    oQueFaz: [
      "Lista construtoras com qtd ops + valor operado total",
      "Lista imobiliárias/corretores",
      "Identifica concentração e top performers",
    ],
    dicas: [
      "Use pra identificar parceiros estratégicos (top 20%)",
      "Cruze com Risco pra ver se está concentrado demais",
    ],
    tourId: "fundo",
  },
  "painel-comerciais-fundo": {
    titulo: "Comerciais vinculados",
    resumo:
      "Time comercial dedicado ao seu fundo (se houver). Veja desempenho de cada um.",
    oQueFaz: [
      "Lista comerciais exclusivos do seu fundo",
      "KPIs por comercial: pago histórico, a receber, ops aprovadas, imobs ativas, leads",
      "Click abre 360 do comercial",
    ],
    dicas: [
      "Só faz sentido se você tem comerciais fidelizados (admin configura)",
      "Use pra alinhar metas + identificar top performers",
    ],
    tourId: "fundo",
  },
  "painel-regras": {
    titulo: "Regras de auto-aprovação",
    resumo:
      "★ Feature mais impactante. Configure critérios e o sistema aprova ops sozinho — pare de aprovar 1 a 1 as 'óbvias'.",
    oQueFaz: [
      "CRUD de regras com critérios (taxa mín, prazo máx, valor máx, construtoras allowlist)",
      "Toggle ativa/desativa por regra",
      "Prioridade (avaliadas em ordem ASC — primeira que casa, aprova)",
      "Contador de acionamentos por regra",
      "✨ Simulação dry-run: testa contra últimas 90 ops ANTES de salvar",
    ],
    comoUsar: [
      "Clique '+ Nova regra'",
      "Preencha critérios (deixe em branco o que for 'qualquer')",
      "🧪 Clique 'Simular nas últimas 90 ops' — vê se está calibrada",
      "Se OK, clique 'Criar regra'",
      "Monitore contador — se uma regra dispara muito, talvez esteja permissiva demais",
    ],
    dicas: [
      "Comece conservador (critérios apertados) e afrouxe gradualmente",
      "Use 'allowlist' de construtoras pra liberar só seu top",
      "Simulação >70% = permissiva demais; <10% = restritiva demais",
    ],
    tourId: "fundo",
  },
  "painel-api": {
    titulo: "API REST de integração",
    resumo:
      "Gere API keys e integre com seu sistema (CRM/ERP/core bancário). Sandbox com curl copy-paste embaixo.",
    oQueFaz: [
      "Gerar nova API key (token mostrado UMA vez — copie e guarde)",
      "Escopo: read_only (consulta) ou read_write (decide ops também)",
      "Listar keys ativas/revogadas + último uso",
      "Documentação Swagger UI em /docs/api",
      "✨ Sandbox: curl pronto pra cada endpoint, botão copiar",
    ],
    comoUsar: [
      "Clique 'Gerar API key', dê nome e escopo",
      "Copie o token (aq_...) — não conseguimos mostrar de novo",
      "No bloco sandbox, copie curl do endpoint que quer testar",
      "Substitua $TOKEN pela sua key e cole no terminal",
    ],
    dicas: [
      "10 keys ativas é o limite por fundo",
      "Use read_only se for só dashboard/sincronização",
      "read_write só se for fazer aprovação automatizada pelo seu lado",
      "Revogar key não apaga audit",
    ],
    tourId: "fundo",
  },
  "painel-webhooks": {
    titulo: "Webhooks",
    resumo:
      "Configure URLs no seu sistema pra receber notificações push em tempo real quando algo acontece (op aprovada, parcela paga, etc).",
    oQueFaz: [
      "Criar webhook: nome, URL HTTPS, eventos a receber",
      "7 eventos: op_status_change, op_aprovada/recusada, fundo_decisao, parcela_paga, antecipacao/renegociacao_decisao",
      "HMAC-SHA256 no header x-antecipaqui-signature (validação)",
      "Retry exponencial 1/5/25/125 min se sua URL não responder 2xx",
      "✨ Botão 🧪 'testar' — dispara payload fake AGORA",
      "✨ Link 📜 'logs' — últimos 50 eventos com status, erro, payload",
    ],
    comoUsar: [
      "Cadastre URL HTTPS do seu endpoint",
      "Selecione eventos que quer receber",
      "Copie o secret (HMAC) — só aparece UMA vez",
      "Clique 🧪 testar pra validar que seu endpoint responde",
      "Se OK, eventos reais começam a chegar conforme ocorrem",
    ],
    calculos: [
      "signature = HMAC_SHA256(body, secret) — header x-antecipaqui-signature: sha256={hex}",
    ],
    dicas: [
      "Endpoint precisa responder 2xx em <15s (timeout)",
      "VALIDE a assinatura — qualquer um pode bater no seu endpoint público",
      "Use webhook.site ou ngrok pra testar em dev antes de prod",
    ],
    tourId: "fundo",
  },

  /* ============= COMERCIAL ============= */
  "painel-prospects": {
    titulo: "Mapa de prospects",
    resumo:
      "Mapa interativo (Google Places) com imobiliárias/construtoras na sua região. Clique no pin pra ver dados + adicionar à prospecção.",
    oQueFaz: [
      "Mapa centralizado na sua localização",
      "Busca por endereço (auto-complete)",
      "Pins de imobs/construtoras já cadastradas (cor verde) + leads não cadastrados (cor cinza)",
      "Click no pin: dados (nome, telefone, email se houver), botões 'add ao kanban' e 'parceria'",
    ],
    comoUsar: [
      "Busque por bairro/cidade",
      "Adicione novos pins via 'buscar lugar'",
      "Clique no pin pra ver dados",
      "Adicione ao kanban de prospecção pra trabalhar o lead",
    ],
    dicas: [
      "Foque em raios menores (5km) — concentre esforço",
      "Cor verde = já cliente; cor cinza = oportunidade",
    ],
    tourId: "comercial",
  },
  "painel-prospeccao": {
    titulo: "Pipeline de leads",
    resumo:
      "Seu kanban de prospecção. Cada lead vira card e move pelo funil até virar cliente cadastrado.",
    visual: <KanbanMini />,
    oQueFaz: [
      "Kanban com estágios: novo → contato → visita → proposta → fechado/perdido",
      "Cards com dados do lead + notas + próximos passos",
      "Quando vira 'fechado', use 'Cadastro express' pra criar a imob/construtora oficialmente",
    ],
    dicas: [
      "Mova SEMPRE que tiver interação — kanban desatualizado = lead esquecido",
      "Use 'próximo passo' pra não perder timing",
    ],
    tourId: "comercial",
  },
  "painel-cadastrar-imob": {
    titulo: "Cadastro express",
    resumo:
      "Formulário rápido pra cadastrar imobiliária OU construtora que você prospectou. Cria a conta + manda convite.",
    oQueFaz: [
      "Tipo: Imobiliária ou Construtora",
      "Dados mínimos: razão, CNPJ, email, telefone",
      "Sistema cria user + envia convite por email",
      "Conta vinculada a VOCÊ como comercial responsável",
    ],
    dicas: [
      "Vínculo importa: você ganha comissão das ops dessa conta",
      "Avise o cliente que vai chegar convite — taxa de aceite sobe",
    ],
    tourId: "comercial",
  },
  "painel-convidar": {
    titulo: "Link de convite",
    resumo:
      "Gera link único de cadastro pra você mandar pra prospect — ele se cadastra sozinho e fica vinculado a você.",
    oQueFaz: [
      "Link único com seu ID embutido",
      "Quando alguém se cadastra pelo link, fica como SEU lead",
      "Tracking de cliques",
    ],
    dicas: [
      "Use no WhatsApp pra prospect 'frio' — menos atrito que pedir dados",
      "Bom pra eventos/feiras (QR code do link)",
    ],
    tourId: "comercial",
  },
  "painel-daily-comercial": {
    titulo: "Daily",
    resumo:
      "Foco do seu dia: leads pra contatar, visitas agendadas, ops pra acompanhar.",
    oQueFaz: [
      "Próximos passos do dia (do kanban de prospecção)",
      "Ops que avançaram (mudança de status)",
      "Tickets/chats pendentes",
    ],
    dicas: [
      "Abra todo dia ao chegar",
      "Use 'concluir' pra limpar tarefas — KPI sobe",
    ],
    tourId: "comercial",
  },
  "painel-operacoes-comercial": {
    titulo: "Operações",
    resumo:
      "Ops onde você é o comercial vinculado (suas imobs/construtoras). Acompanhamento + comissão.",
    oQueFaz: [
      "Lista ops das contas vinculadas a você",
      "Status + valores + comissão estimada (sua)",
      "Filtros por status, período, conta",
    ],
    tourId: "comercial",
  },
  "painel-comissoes": {
    titulo: "Comissões",
    resumo:
      "Acumulado das suas comissões: pago, a receber, total por mês.",
    oQueFaz: [
      "KPIs: pago histórico, a receber, em aberto",
      "Detalhamento por op (de qual op veio cada comissão)",
      "Por período",
    ],
    calculos: [
      "Comissão = valor_op × % comissão comercial (configurado por fundo/admin)",
    ],
    tourId: "comercial",
  },
  "painel-comissoes-holerite": {
    titulo: "Holerite mensal",
    resumo:
      "Recibo formal das comissões do mês — exportável em PDF pra sua contabilidade.",
    oQueFaz: [
      "Lista comissões pagas no mês com decomposição",
      "Total bruto + descontos (se aplicável) + líquido",
      "Botão exportar PDF",
    ],
    tourId: "comercial",
  },
  "painel-relatorios-comercial": {
    titulo: "Relatórios",
    resumo:
      "Análise do seu desempenho: leads convertidos, ops aprovadas, comissão por mês, taxa de conversão.",
    oQueFaz: [
      "Funil de conversão (lead → cliente → op)",
      "Comissão por mês",
      "Top contas",
    ],
    tourId: "comercial",
  },
  "painel-templates": {
    titulo: "Templates WhatsApp",
    resumo:
      "Mensagens prontas pra mandar pra prospects/clientes — economiza tempo e mantém tom consistente.",
    oQueFaz: [
      "Lista templates por categoria (primeiro contato, follow-up, confirmação)",
      "Variáveis: {{nome}}, {{empresa}}, etc",
      "Botão copiar (com variáveis preenchidas se aplicável)",
    ],
    dicas: [
      "Personalize o template com 1-2 frases específicas — não mande padrão genérico",
    ],
    tourId: "comercial",
  },

  /* ============= ADMIN ============= */
  "admin-dashboard": {
    titulo: "Dashboard admin",
    resumo:
      "Sua cabine de comando: KPIs gerais, Action Center (pendências urgentes), Pipeline Funnel, Sourcing Board.",
    oQueFaz: [
      "KPIs no topo: VP comprado, antecipado, a vencer, vencidas, realizadas",
      "Action Center — pendências por severidade (HOJE)",
      "Pipeline Funnel — distribuição de ops por status",
      "Sourcing Board — direcionamento pra fundos",
      "Gráficos de movimento mensal (lucratividade, ops, comissão)",
    ],
    dicas: [
      "Use Action Center como TO-DO da manhã",
      "Pipeline travado em 'docs incompletos' = problema de comunicação",
    ],
    tourId: "admin",
  },
  "admin-decidir": {
    titulo: "Mesa de Decisão",
    resumo:
      "Fila consolidada de ops em estados intermediários, com análise inline — aprove/rejeite 10-15 ops em 30 min.",
    oQueFaz: [
      "Lista ops por filtro: Aguardando análise / Docs incompletos / Fundo pendente / Fundo recusou",
      "Cada card: número, status, construtora, imob, corretor, fundo",
      "Score de risco, validação IA de docs, decomposição financeira",
      "Ações inline: Pré-aprovar (modal de ajuste), Docs incompletos (motivo), Recusar (motivo)",
    ],
    dicas: [
      "Pré-aprovação abre modal calculadora — ajuste taxa por op",
      "Recusa exige motivo (audit)",
      "Use a regra automática do fundo quando padrão for 'óbvio'",
    ],
    tourId: "admin",
  },
  "admin-pendencias": {
    titulo: "Pendências (antecipação/renegociação)",
    resumo:
      "Pedidos das construtoras de ops já em pagamento: antecipar ou reestruturar prazo.",
    oQueFaz: [
      "Abas: Antecipações (aumentar comissão) / Renegociações (reestruturar)",
      "Aprovação aplica mudança automaticamente",
      "Cada pedido vem com motivação textual da construtora",
    ],
    dicas: [
      "Após sua decisão admin, normalmente fundo também precisa decidir",
      "Atenção pra antecipações grandes — impactam tesouraria",
    ],
    tourId: "admin",
  },
  "admin-operacoes": {
    titulo: "Operações (lista)",
    resumo:
      "Lista completa de todas as operações do sistema, com filtros poderosos.",
    oQueFaz: [
      "Filtros: status, data, valor, fundo, busca por número/construtora/imob/corretor",
      "Tabela com número, status, construtora, imob, corretor, fundo, comissão, VP, datas",
      "Click na linha abre o 360 da op",
    ],
    dicas: [
      "Use busca por número da op pra abrir direto",
      "Filtro por valor pra identificar operações vultosas",
    ],
    tourId: "admin",
  },
  "admin-fundos": {
    titulo: "Fundos investidores",
    resumo:
      "Gestão dos fundos parceiros — listar, cadastrar, editar, ver detalhe + cobrança + CNAB.",
    oQueFaz: [
      "Lista todos os fundos com KPIs (volume, ops, status)",
      "Botão '+ Novo fundo' abre wizard de 6 passos",
      "Click no fundo abre detalhe completo (taxa, cobrança, banco, ops)",
    ],
    comoUsar: [
      "Pra novo fundo use o wizard (CNPJ → taxa → assinatura → banco)",
      "Pra editar config, abra o detalhe e use seções editáveis",
      "Pra CNAB use a sub-tela /admin/fundos/[id]/cnab",
    ],
    tourId: "admin",
  },
  "admin-fundos-novo": {
    titulo: "Cadastrar Fundo (wizard)",
    resumo:
      "Wizard de 6 passos pra cadastrar fundo do zero — CNPJ auto-fetch, taxa, custos, assinatura, banco.",
    comoUsar: [
      "Passo 1: CNPJ (auto-busca na Receita Federal)",
      "Passo 2: confirma dados da empresa",
      "Passo 3: contato responsável + email de assinatura",
      "Passo 4: taxa mensal base + custo financeiro % + impostos %",
      "Passo 5: sistema de assinatura (ZapSign ou custom)",
      "Passo 6: dados bancários (recebimento + boletos)",
    ],
    dicas: [
      "Email de assinatura recebe TODO contrato — confirme antes",
      "Taxa base é só default — pode ajustar por op",
      "Modo avançado (/avancado) tem todos os campos num form só",
    ],
    tourId: "admin",
  },
  "admin-fundo-detalhe": {
    titulo: "Detalhe do Fundo",
    resumo:
      "Tudo do fundo num só lugar: dados, taxa, custos, assinatura, cobrança, banco, ops associadas, convite de login.",
    oQueFaz: [
      "Edita qualquer config do fundo inline",
      "Cobrança: escolhe modo (manual/API/CNAB)",
      "Gera convite de login pra fundo (manda pro email assinatura)",
      "Lista operações associadas",
    ],
    dicas: [
      "Modo API exige cooperação do banco do fundo (URL+auth+webhook)",
      "Modo CNAB tem sub-tela própria pra remessa/retorno",
    ],
    tourId: "admin",
  },
  "admin-cadastrar-comercial": {
    titulo: "Cadastrar Comercial",
    resumo:
      "Cadastra novo comercial PF/PJ — opcionalmente vincula a fundo (exclusivo) ou deixa generalista.",
    oQueFaz: [
      "Form: tipo (PF/PJ), nome, documento, email, telefone",
      "Campo 'fundo' (opcional): se preenchido, comercial é EXCLUSIVO daquele fundo",
      "Envia convite por email automaticamente",
    ],
    dicas: [
      "Exclusivo: comercial só atende ops do fundo X (foco)",
      "Generalista (vazio): atende qualquer fundo (flexibilidade)",
    ],
    tourId: "admin",
  },
  "admin-comerciais": {
    titulo: "Comerciais",
    resumo:
      "Lista do time comercial com vínculo a fundo (se exclusivo) e KPIs de desempenho.",
    oQueFaz: [
      "Lista PF/PJ + coluna 'fundo' (vazio = generalista)",
      "Volume operado, comissão acumulada",
      "Click abre 360 com desempenho",
    ],
    tourId: "admin",
  },
  "admin-construtoras": {
    titulo: "Construtoras",
    resumo:
      "Gestão de construtoras: cadastrar, aprovar onboarding, bloquear, ver detalhe + score + ops + fundo fidelizado.",
    oQueFaz: [
      "Filtros: status (completo/pendente docs/sem dono/bloqueada), busca",
      "Ações por linha: editar, ver detalhe, bloquear/desbloquear, aprovar onboarding",
    ],
    dicas: [
      "Bloquear mantém histórico mas impede novas ops",
      "Aprovar onboarding libera a plataforma pra construtora",
    ],
    tourId: "admin",
  },
  "admin-cadastrar-construtora": {
    titulo: "Cadastrar Construtora",
    resumo:
      "Cadastro manual de construtora + fundo fidelizado opcional (direciona TODAS as futuras ops dela pro fundo escolhido).",
    oQueFaz: [
      "Dados: razão, CNPJ, endereço, email responsável",
      "Fundo fidelizado (opcional)",
      "Upload de documentação inicial",
    ],
    dicas: [
      "Fundo fidelizado = parceria estratégica — use com cuidado",
      "Após criada, construtora recebe convite e cai no onboarding",
    ],
    tourId: "admin",
  },
  "admin-usuarios": {
    titulo: "Imobiliárias / Corretores",
    resumo:
      "Gestão de usuários (imobs + corretores + construtoras + admins). Aprovar onboarding, editar, bloquear.",
    oQueFaz: [
      "Filtros: tipo (imob/corretor/construtora/admin), status, busca",
      "Stats no topo (qtds por tipo)",
      "Ações: editar nome/telefone/role, aprovar onboarding, bloquear",
    ],
    dicas: [
      "Aprovação envia email automático",
      "Construtoras aparecem aqui — filtro 'tipo'",
    ],
    tourId: "admin",
  },
  "admin-cadastrar-imobiliaria": {
    titulo: "Cadastrar Imobiliária",
    resumo:
      "Onboarding manual de imobiliária — usado quando lead vem por canal off (telefone, evento).",
    oQueFaz: [
      "Dados empresa + CRECI",
      "Contato responsável (cria user role 'imobiliaria' ou 'corretor')",
      "Dados bancários (pra cláusula 3ª do contrato de cessão)",
      "Documentação inicial",
    ],
    dicas: [
      "CRECI obrigatório por lei",
      "Dados bancários são CRÍTICOS — onde antecipações caem",
    ],
    tourId: "admin",
  },
  "admin-usuarios-admins": {
    titulo: "Administradores",
    resumo:
      "★ SÓ super-admin. Gerencia outros admins do sistema — convidar, mudar perfil, remover.",
    oQueFaz: [
      "Lista admins com perfil (super/financeiro/operacoes/suporte)",
      "Editar perfil de um admin",
      "Convidar novo admin",
    ],
    dicas: [
      "CUIDADO: mudança aqui afeta acesso ao sistema todo",
      "NUNCA remova o último SUPER",
      "Use perfis pra delegar responsabilidades sem dar tudo",
    ],
    tourId: "admin",
  },
  "admin-visao": {
    titulo: "Visualizar Como (impersonation)",
    resumo:
      "Entra como outro usuário (sem saber senha) pra debugar tickets, validar permissões, etc. Cookie httpOnly 4h + audit completo.",
    oQueFaz: [
      "Lista users por email/role/busca",
      "Botão 'entrar como' seta cookie + redireciona pro painel do user",
      "Banner amarelo sempre visível durante sessão",
      "Email/SMS suprimidos durante sessão (cliente não recebe notificações)",
    ],
    dicas: [
      "NÃO pode impersonar outro admin (proteção)",
      "Mudanças durante impersonation são REAIS — cuidado",
      "Sessão expira em 4h automaticamente",
      "Histórico em /admin/visao/historico",
    ],
    tourId: "admin",
  },
  "admin-tickets": {
    titulo: "Tickets de Suporte",
    resumo:
      "Gestão de chats/tickets. Categorias: suporte, operações, negociações, confirmação, documentos.",
    oQueFaz: [
      "Filtros: status, categoria, busca, arquivados, não lidos",
      "Detalhe com chat, dropdown de status, botão 'nudge' (notifica participantes)",
    ],
    dicas: [
      "'Nudge' é rate-limited — não abuse",
      "Arquivar tira do filtro padrão mas mantém histórico",
      "Notas internas no detalhe: só admins veem",
    ],
    tourId: "admin",
  },
  "admin-mural": {
    titulo: "Mural de Recados",
    resumo:
      "Broadcast de mensagens — banner no dashboard de imobs/construtoras/fundos/all. Use pra avisos importantes.",
    oQueFaz: [
      "Form: título, body, audience (admin/imob/construtora/all), expira em",
      "Lista de recados ativos/inativos",
      "Ações: editar, desativar, deletar",
    ],
    dicas: [
      "Use expiração pra avisos temporários (evita esquecer no ar)",
      "Texto curto — banner é estreito",
    ],
    tourId: "admin",
  },
  "admin-relatorios": {
    titulo: "Relatórios (hub)",
    resumo:
      "Hub com 12+ relatórios agrupados: Visão Geral, Rankings, Operacional.",
    oQueFaz: [
      "Visão geral: Daily, Índices, Recaps, Saúde, API Docs",
      "Rankings: Construtoras, Imobiliárias, Fundos, Comerciais",
      "Operacional: Borderôs, Inadimplentes, Logs",
    ],
    dicas: [
      "Daily = abrir todo dia (cobrança)",
      "Borderôs = fechamento mensal (CSV/PDF)",
      "Logs = investigação (quem fez o quê)",
    ],
    tourId: "admin",
  },
  "admin-relatorios-logs": {
    titulo: "Logs de Auditoria",
    resumo:
      "Toda ação no sistema registrada (login, view, create, update, delete, approve, change_status, impersonation). Use pra investigar.",
    oQueFaz: [
      "Filtros: ação, tipo alvo, user ID, data range",
      "Tabela com ação, alvo, user, timestamp, metadata",
      "Código de cor por ação (delete=red, create=blue, approve=green)",
    ],
    dicas: [
      "Use quando algo 'sumiu' ou foi alterado",
      "Metadata tem contexto extra (use 'expandir' pra ver)",
    ],
    tourId: "admin",
  },
  "admin-configuracoes": {
    titulo: "Configurações",
    resumo:
      "Parâmetros globais do sistema — taxa sugerida, spread mínimo, CDI, score de inadimplência.",
    oQueFaz: [
      "Taxa de juros sugerida (default novas ops + calculadora)",
      "Spread mínimo (bloqueia aprovações abaixo)",
      "CDI mensal (benchmark)",
      "Score de inadimplência (pesos pra construtoras/imobs/corretores)",
    ],
    dicas: [
      "Mudança aqui IMPACTA sistema inteiro — coordene com time",
      "Spread mínimo previne aprovações de margem ruim",
    ],
    tourId: "admin",
  },
  "admin-custos": {
    titulo: "Custos & Desenvolvimento",
    resumo:
      "Quanto a plataforma custou (investimento inicial), quanto custa manter todo mês e tudo que foi entregue depois do lançamento.",
    oQueFaz: [
      "Setup inicial: o valor contratado do projeto, já pago, fora do custo mensal",
      "Custos mensais: um card por mês com as contas fixas (hospedagem, banco, backup, e-mail, WhatsApp, firewall, proxies, VPS e IA)",
      "Desenvolvimento pós-entrega: uma linha por entrega, com data, descrição e valor",
      "APIs & serviços: o que é cobrado por uso (assinatura digital, login, armazenamento, mapas)",
    ],
    comoUsar: [
      "Clique no ✓ de cada conta para marcar como paga, ou use 'Marcar mês como pago'",
      "Clique no valor para ajustar quando a fatura vier diferente do estimado",
      "Use 'Registrar custo' para lançar uma despesa nova, avulsa ou recorrente",
    ],
    dicas: [
      "O chip 'estimado' indica conta em dólar ou média — confirme na fatura real",
      "As marcações ficam salvas neste navegador, não no banco de dados",
    ],
    tourId: "admin",
  },
  "admin-risco-global": {
    titulo: "Risco Global",
    resumo:
      "Visão sistêmica de risco do sistema todo — exposição agregada por construtora.",
    oQueFaz: [
      "Score por construtora",
      "Parcelas vencidas",
      "Inadimplência consolidada",
    ],
    tourId: "admin",
  },
  "admin-credito": {
    titulo: "Análise de Crédito",
    resumo:
      "Score detalhado por entidade + blacklist + histórico de crédito.",
    tourId: "admin",
  },
  "admin-convites": {
    titulo: "Convites de Operação",
    resumo:
      "Ops que construtoras criaram e mandaram pra corretores mas ainda não foram aceitas.",
    oQueFaz: [
      "Status: Aguardando cedente / Reivindicadas / Descartadas",
      "Tabela com cedente, construtora, comissão, parcelas",
    ],
    dicas: [
      "Convite parado há dias = ligue pra construtora confirmar destinatário",
    ],
    tourId: "admin",
  },
  "admin-webhooks": {
    titulo: "Webhooks Admin",
    resumo:
      "Gestão de webhooks da plataforma (CNAB de fundos, atualizações, integrações externas).",
    tourId: "admin",
  },
  "admin-backups": {
    titulo: "Backups & Exports",
    resumo:
      "Exporta dados do sistema (operações, users, documentos) — admin-only. Use pra DR, auditoria, migrações.",
    dicas: [
      "Exportar pode ser pesado — agende em horário de baixo uso",
    ],
    tourId: "admin",
  },
  "admin-faturas": {
    titulo: "Faturas dos Fundos",
    resumo:
      "Recebimentos de parcelas dos fundos (vinculado a CNAB / cobrança automática).",
    tourId: "admin",
  },
  "admin-interno-invoice": {
    titulo: "Invoice (faturamento AQ)",
    resumo:
      "Faturamento da Antecipaqui pros fundos — agregado mensal por fundo com custos + rateio + impostos.",
    oQueFaz: [
      "Tabela: fundo, período, ops processadas, juros, custos AQ, rateio (%), impostos, líquido",
      "Exportação pra planilha fiscal",
    ],
    tourId: "admin",
  },
};

