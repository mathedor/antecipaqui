/**
 * Dados do relatório "Custos & Desenvolvimento" (/admin/custos).
 *
 * Fonte única de verdade do que o projeto custou (setup), do que custa manter
 * (contas fixas mensais) e do que foi entregue depois da v1 (desenvolvimento).
 *
 * Nada disso vem do banco — é registro histórico do projeto. O que o dono
 * marca como pago (e eventuais ajustes de valor) fica no localStorage
 * do navegador, chave `antecipaqui-custos-v1`.
 */

/** Câmbio de referência usado para converter as contas em dólar. */
export const CAMBIO = 5.45;

export const STORAGE_KEY = "antecipaqui-custos-v1";

/* =============================================================
   SETUP INICIAL (investimento contratado)
   ============================================================= */

export const SETUP = {
  valor: 388474.6,
  /** Go-live da v1 no domínio oficial www.antecipaqui.digital. */
  data: "11/05/2026",
  mes: "2026-05",
  titulo: "Plataforma Antecipaqui v1 — entrega completa",
  descricao:
    "Reescrita do zero da plataforma: site de captação com calculadora, cadastro e verificação de documentos, painel do corretor/imobiliária, painel da construtora, painel do fundo, esteira de aprovação do administrador, geração de contrato, assinatura digital e borderô da operação.",
  origem: "valor informado pelo dono",
};

/* =============================================================
   CONTAS FIXAS MENSAIS
   ============================================================= */

export type ContaFixa = {
  id: string;
  titulo: string;
  valor: number;
  obs: string;
  /** true = valor aproximado, ainda a confirmar. */
  estimado?: boolean;
  /** Mês (YYYY-MM) a partir do qual a conta passou a existir. */
  desde?: string;
};

export const CONTAS_FIXAS: ContaFixa[] = [
  {
    id: "vercel",
    titulo: "Hospedagem (Vercel)",
    valor: 109.0,
    obs: "USD 20 · câmbio R$ 5,45",
    estimado: true,
  },
  {
    id: "banco",
    titulo: "Banco de dados (Neon)",
    valor: 136.25,
    obs: "USD 25 · câmbio R$ 5,45",
    estimado: true,
  },
  {
    id: "backup",
    titulo: "Backup",
    valor: 440.0,
    obs: "cópia diária de todos os dados e documentos",
  },
  {
    id: "email",
    titulo: "E-mail transacional (Resend)",
    valor: 109.0,
    obs: "USD 20 · avisos, recaps e notificações",
    estimado: true,
  },
  {
    id: "whatsapp",
    titulo: "WhatsApp (API)",
    valor: 99.0,
    obs: "disparos de cobrança e aviso de vencimento",
    estimado: true,
  },
  {
    id: "firewall",
    titulo: "Firewall",
    valor: 125.35,
    obs: "USD 23 · proteção da aplicação",
  },
  {
    id: "proxies",
    titulo: "Proxies",
    valor: 103.55,
    obs: "USD 19 · consultas externas (CNPJ, CEP, mapas)",
  },
  {
    id: "vps-agentes",
    titulo: "VPS de agentes",
    valor: 590.0,
    obs: "robôs de cobrança, recaps e monitoramento",
  },
  {
    id: "ia",
    titulo: "Inteligência artificial em produção",
    valor: 250.0,
    obs: "Cícero (atendente) + leitura automática de documentos",
    estimado: true,
    desde: "2026-07",
  },
];

/* =============================================================
   DESENVOLVIMENTO PÓS-ENTREGA
   ============================================================= */

export type Tier = "P" | "M" | "G" | "X";

export const TIERS: Record<
  Tier,
  { tokens: number; valor: number; label: string }
> = {
  P: { tokens: 1_600_000, valor: 65.4, label: "Ajuste pontual" },
  M: { tokens: 4_400_000, valor: 163.5, label: "Funcionalidade" },
  G: { tokens: 8_800_000, valor: 327.0, label: "Sprint" },
  X: { tokens: 16_500_000, valor: 599.5, label: "Megasprint" },
};

export type DevEntry = {
  /** dd/mm */
  data: string;
  titulo: string;
  desc: string;
  tier: Tier;
};

/** Chave = mês YYYY-MM. Do mês da entrega da v1 até o mês corrente. */
export const DESENVOLVIMENTO: Record<string, DevEntry[]> = {
  "2026-05": [
    {
      data: "12/05",
      titulo: "Modelo financeiro do negócio",
      desc: "Custo do dinheiro do fundo, spread e repasse passaram a ser calculados em toda operação — a margem da Antecipaqui e a do fundo nunca ficam negativas.",
      tier: "X",
    },
    {
      data: "12/05",
      titulo: "Faturas dos fundos e margem mínima",
      desc: "A cobrança da Antecipaqui para cada fundo é proporcional ao que foi efetivamente pago no mês, com trava que impede aprovar operação abaixo da margem mínima.",
      tier: "G",
    },
    {
      data: "12/05",
      titulo: "Margem efetiva, projeção e trava de custos",
      desc: "O painel passou a mostrar a margem real e a projeção de 6 meses; os custos da operação travam depois que a primeira parcela é paga.",
      tier: "M",
    },
    {
      data: "12/05",
      titulo: "Comissão do comercial automática",
      desc: "Registro operação a operação de 10% do lucro líquido, com o quanto cada comercial tem a receber e o quanto já recebeu.",
      tier: "M",
    },
    {
      data: "12/05",
      titulo: "Conferência de documentos por IA",
      desc: "Todo arquivo enviado é lido automaticamente e marcado para revisão quando não bate com o que foi declarado no cadastro.",
      tier: "M",
    },
    {
      data: "12/05",
      titulo: "Mesa de decisão do fundo",
      desc: "Fila das operações que aguardam o sim do fundo, com nota da construtora, exposição atual e decisão em um clique.",
      tier: "G",
    },
    {
      data: "12/05",
      titulo: "Regras de aprovação automática",
      desc: "Cada fundo define taxa, prazo, valor e construtoras que aprova sozinho — o resto continua caindo na mesa para análise.",
      tier: "M",
    },
    {
      data: "12/05",
      titulo: "Mapa de risco e concentração",
      desc: "Quanto do capital está parado em cada construtora, imobiliária e estado, com alerta amarelo acima de 25%, vermelho acima de 40% e lista de bloqueio.",
      tier: "G",
    },
    {
      data: "12/05",
      titulo: "Projeção de caixa e conta-corrente com a Antecipaqui",
      desc: "Previsão de entradas dos próximos 6 meses e espelho do que o fundo tem a receber e a repassar.",
      tier: "M",
    },
    {
      data: "12/05",
      titulo: "Cobrança automática, extrato contábil e comparativo com o CDI",
      desc: "Aviso antes do vencimento, cobrança no atraso, extrato para a contabilidade e rentabilidade do fundo comparada ao CDI.",
      tier: "G",
    },
    {
      data: "12/05",
      titulo: "Painel do corretor: previsão e simulador",
      desc: "Previsão pessoal de recebimentos, linha do tempo de cada operação, simulador embutido e repetir operação em um clique.",
      tier: "M",
    },
    {
      data: "12/05",
      titulo: "Mesa consolidada e risco global do administrador",
      desc: "Uma tela única com tudo que espera decisão e o retrato de risco da plataforma inteira.",
      tier: "G",
    },
    {
      data: "13/05",
      titulo: "Cadastro completo do fundo",
      desc: "Custos padrão clonados na operação, multa e juros de atraso, modo de cobrança (API do banco, arquivo CNAB ou manual) e baixa automática do pagamento.",
      tier: "X",
    },
    {
      data: "13/05",
      titulo: "Painel da construtora",
      desc: "Central de documentos, empreendimentos, pagamento de várias parcelas de uma vez, caixa de confirmação e extrato em PDF.",
      tier: "G",
    },
    {
      data: "13/05",
      titulo: "Cadastro de operação quase sem digitação",
      desc: "Leitura automática do contrato de venda, salvamento contínuo, coleta dos dados do comprador por link/QR Code e busca de CNPJ na Receita.",
      tier: "G",
    },
    {
      data: "13/05",
      titulo: "Conversa entre as partes",
      desc: "Anexos, busca, arquivamento e lembrete automático quando uma negociação fica parada.",
      tier: "M",
    },
    {
      data: "13/05",
      titulo: "Borderôs consolidados",
      desc: "Filtros por período e parceiro, totais agregados e exportação em lote em CSV e PDF.",
      tier: "M",
    },
    {
      data: "13/05",
      titulo: "API para os fundos",
      desc: "Chave de acesso própria para o fundo puxar operações e registrar decisões direto do sistema dele.",
      tier: "M",
    },
    {
      data: "13/05",
      titulo: "Auditoria, avisos externos e backup diário",
      desc: "Notas internas por operação, histórico de nota da construtora, avisos automáticos para sistemas parceiros e cópia de segurança todo dia.",
      tier: "G",
    },
    {
      data: "14/05",
      titulo: "Cadastro de fundo guiado e aplicativo instalável",
      desc: "Passo a passo para cadastrar um fundo novo sem esquecer nada, e a plataforma passou a poder ser instalada como aplicativo no celular.",
      tier: "M",
    },
    {
      data: "14/05",
      titulo: "Resumos automáticos por e-mail",
      desc: "Resumo diário, semanal e mensal do movimento da plataforma, com indicadores e comparativo, direto no e-mail.",
      tier: "M",
    },
    {
      data: "14/05",
      titulo: "Saúde do sistema e documentação da API",
      desc: "Painel que mostra rotinas automáticas, avisos externos e configurações faltando, mais a documentação pública da API.",
      tier: "M",
    },
    {
      data: "15/05",
      titulo: "Cinco painéis reformulados",
      desc: "Cada nível passou a abrir com o que precisa de ação hoje, o funil do momento e a origem dos negócios.",
      tier: "G",
    },
    {
      data: "16/05",
      titulo: "Painel do comercial — máquina de vendas",
      desc: "Foco do dia, meta calculada sozinha, carteira viva e projeção de comissão do mês.",
      tier: "G",
    },
    {
      data: "16/05",
      titulo: "Comercial: crescer carteira",
      desc: "Modelos de mensagem prontos, link de convite rastreável, funil de prospecção, holerite mensal e metas com conquistas.",
      tier: "G",
    },
    {
      data: "16/05",
      titulo: "Mapa de prospecção",
      desc: "Imobiliárias no mapa, busca por endereço, minha localização e cadastro express feito em campo.",
      tier: "M",
    },
    {
      data: "16/05",
      titulo: "Imobiliária com equipe e CRM",
      desc: "Vários corretores por imobiliária com permissões próprias, kanban de negociação e encaminhamento direto para antecipação.",
      tier: "G",
    },
    {
      data: "16/05",
      titulo: "Visualizar como",
      desc: "O administrador abre o sistema com os olhos de qualquer usuário, sem sair da conta dele e com tudo registrado.",
      tier: "M",
    },
    {
      data: "16/05",
      titulo: "Tours guiados e ajuda em todas as telas",
      desc: "Boas-vindas passo a passo para cada nível de acesso e mini-tutorial contextual em cerca de 65 páginas.",
      tier: "G",
    },
    {
      data: "16/05",
      titulo: "Apresentações por nível",
      desc: "Quatro páginas de apresentação e vídeos de 60 segundos para imobiliária, construtora, fundo e comercial.",
      tier: "G",
    },
    {
      data: "20/05",
      titulo: "Filtros na mesa e nota fiscal na operação",
      desc: "Período, construtora, imobiliária e comercial na tela de decisão; nota fiscal opcional na operação; site passou a mostrar só o valor líquido.",
      tier: "M",
    },
    {
      data: "25/05",
      titulo: "Envio de arquivos pesados pelo celular",
      desc: "Fotos e PDFs grandes de iPhone e iPad passaram a subir sem erro, e a leitura do contrato ficou mais precisa.",
      tier: "M",
    },
    {
      data: "26/05",
      titulo: "Sistema inteiro no celular",
      desc: "Todas as tabelas do administrador e dos painéis viram cards no celular, sem rolagem lateral.",
      tier: "M",
    },
  ],
  "2026-06": [
    {
      data: "08/06",
      titulo: "Ambiente de demonstração separado da produção",
      desc: "Duas instalações independentes: a de verdade, com dados reais, e a de demonstração, para apresentar o sistema a fundos e construtoras sem risco.",
      tier: "G",
    },
    {
      data: "08/06",
      titulo: "Modo operacional por fundo",
      desc: "Cada fundo define quem gera o contrato, quem envia para assinatura e quem cobra — com a Antecipaqui sempre como testemunha da assinatura.",
      tier: "G",
    },
    {
      data: "08/06",
      titulo: "Fluxos de contrato e cadastro da OPERA Securitizadora",
      desc: "Contrato gerado pela Antecipaqui ou pelo fundo, retorno automático da assinatura e a OPERA cadastrada (custo do dinheiro 2,4%, operação 6%).",
      tier: "M",
    },
    {
      data: "10/06",
      titulo: "Apresentações atualizadas e vídeos regravados",
      desc: "Todas as ferramentas novas entraram nas apresentações de cada nível e os quatro vídeos foram refeitos.",
      tier: "G",
    },
    {
      data: "10/06",
      titulo: "Busca de CNPJ à prova de queda",
      desc: "Três fontes em cascata para o cadastro nunca travar quando uma delas sai do ar.",
      tier: "P",
    },
  ],
  "2026-07": [
    {
      data: "03/07",
      titulo: "Apresentação institucional da plataforma",
      desc: "Apresentação navegável em duas versões — uma interna e uma pública para enviar a parceiros.",
      tier: "M",
    },
    {
      data: "07/07",
      titulo: "Apresentação no celular",
      desc: "Ajuste para a apresentação ficar legível na tela em pé do celular.",
      tier: "P",
    },
    {
      data: "14/07",
      titulo: "Identidade visual aplicada",
      desc: "Ícone oficial da marca em todos os tamanhos: aba do navegador, atalho no celular e aplicativo instalado.",
      tier: "P",
    },
    {
      data: "16/07",
      titulo: "Cícero — atendente com inteligência artificial",
      desc: "Assistente que responde no chat com dados reais e poderes diferentes por nível: consulta de operações, cálculo de antecipação, próximos vencimentos, dados para pagamento, disparo de cobrança com prévia e resumo da plataforma. Toda conversa fica registrada.",
      tier: "X",
    },
    {
      data: "16/07",
      titulo: "Cícero para o comercial",
      desc: "O comercial pergunta quanto tem a receber e o Cícero responde direto do registro de comissões.",
      tier: "P",
    },
    {
      data: "16/07",
      titulo: "Apresentação com telas reais do sistema",
      desc: "Trinta imagens reais do produto substituíram as ilustrações, e o Cícero virou o primeiro capítulo.",
      tier: "M",
    },
    {
      data: "22/07",
      titulo: "Conector de acompanhamento",
      desc: "A plataforma passou a publicar seus números de forma autenticada para o painel de acompanhamento da operação.",
      tier: "P",
    },
    {
      data: "27/07",
      titulo: "Acompanhamento completo e trava de manutenção",
      desc: "Cadastros por nível, operações efetivadas, tarefas e quem está online agora; e um botão que coloca a plataforma em manutenção com segurança.",
      tier: "M",
    },
    {
      data: "28/07",
      titulo: "Créditos e revisão de comunicação",
      desc: "Rodapé com o crédito da Diretório Web e revisão dos textos que citavam a tecnologia de IA usada.",
      tier: "P",
    },
  ],
  "2026-08": [
    {
      data: "03/08",
      titulo: "Chamados pelo conector",
      desc: "Abertura, consulta e baixa de chamados direto pelo painel de acompanhamento.",
      tier: "P",
    },
    {
      data: "04/08",
      titulo: "Custos & Desenvolvimento",
      desc: "Esta página: quanto o projeto custou, quanto custa manter por mês e tudo que foi entregue desde a v1, mês a mês.",
      tier: "M",
    },
  ],
};

/* =============================================================
   APIS & SERVIÇOS (informativo — não soma)
   ============================================================= */

export const APIS_SERVICOS: {
  nome: string;
  custo: string;
  obs: string;
}[] = [
  {
    nome: "ZapSign (assinatura digital)",
    custo: "R$ 0,50 por assinatura",
    obs: "cobrado por documento assinado em cada operação",
  },
  {
    nome: "Clerk (login e cadastro)",
    custo: "grátis até 10.000 usuários ativos/mês",
    obs: "acima disso, cobrado por usuário ativo",
  },
  {
    nome: "Armazenamento de documentos (Vercel Blob)",
    custo: "por GB guardado e transferido",
    obs: "contratos, comprovantes e documentos de cadastro",
  },
  {
    nome: "Inteligência artificial (Cícero e leitura de documentos)",
    custo: "por volume de texto processado",
    obs: "já incluído na linha mensal de IA em produção",
  },
  {
    nome: "WhatsApp / SMS (Twilio)",
    custo: "por mensagem enviada",
    obs: "avisos de vencimento e cobrança",
  },
  {
    nome: "Consulta de CNPJ (BrasilAPI · cnpj.ws · ReceitaWS)",
    custo: "gratuito",
    obs: "três fontes em cascata no cadastro",
  },
  {
    nome: "Google Places (mapa de prospecção)",
    custo: "por consulta",
    obs: "busca de imobiliárias no mapa do comercial",
  },
  {
    nome: "Correio eletrônico (Resend)",
    custo: "por e-mail enviado acima da franquia",
    obs: "já incluído na linha mensal de e-mail",
  },
];

/* =============================================================
   HELPERS
   ============================================================= */

export const MES_INICIAL = SETUP.mes;

const MESES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2026-05" → "maio de 2026" */
export function labelMes(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MESES_PT[Number(m) - 1]} de ${ano}`;
}

/** Lista de meses (YYYY-MM) do início até `ate`, do mais recente pro mais antigo. */
export function listarMeses(ate: string): string[] {
  const out: string[] = [];
  let [ano, m] = MES_INICIAL.split("-").map(Number);
  const [anoFim, mFim] = ate.split("-").map(Number);
  while (ano < anoFim || (ano === anoFim && m <= mFim)) {
    out.push(`${ano}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      ano += 1;
    }
  }
  return out.reverse();
}

/** Contas fixas vigentes num determinado mês. */
export function contasDoMes(mes: string): ContaFixa[] {
  return CONTAS_FIXAS.filter((c) => !c.desde || mes >= c.desde);
}

export function totalTierValor(tier: Tier) {
  return TIERS[tier].valor;
}

/** Formata tokens em milhões: 8_800_000 → "8,8 M" */
export function formatTokens(tokens: number): string {
  const mi = tokens / 1_000_000;
  return `${mi.toLocaleString("pt-BR", {
    minimumFractionDigits: mi >= 100 ? 0 : 1,
    maximumFractionDigits: 1,
  })} M`;
}
