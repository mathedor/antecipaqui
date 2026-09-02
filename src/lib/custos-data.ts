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
    id: "servidor-principal",
    titulo: "Servidor principal",
    valor: 1809.6,
    obs: "máquina que roda a plataforma em produção",
  },
  {
    id: "backup-primario",
    titulo: "Backup primário",
    valor: 486.0,
    obs: "cópia diária de todos os dados e documentos",
  },
  {
    id: "backup-secundario",
    titulo: "Backup secundário",
    valor: 486.0,
    obs: "segunda cópia, em local separado do backup primário",
  },
  {
    id: "proxies",
    titulo: "Proxies (4 ativas)",
    valor: 414.2,
    obs: "4 × USD 19 · consultas externas (CNPJ, CEP, mapas)",
  },
  {
    id: "firewall",
    titulo: "Firewall hot blind",
    valor: 648.55,
    obs: "USD 119 · proteção da aplicação contra ataques",
  },
  {
    id: "vps-agentes",
    titulo: "VPS de agentes",
    valor: 590.0,
    obs: "robôs de cobrança, recaps e monitoramento",
  },
  {
    id: "vps-cicero",
    titulo: "VPS do Cícero",
    valor: 590.0,
    obs: "máquina dedicada ao atendente com inteligência artificial",
  },
  {
    id: "servidor-demo",
    titulo: "Servidor de demonstração",
    valor: 388.0,
    obs: "ambiente de apresentação, separado da produção",
  },
  {
    id: "cloud-arquivos",
    titulo: "Cloud de arquivos da operação",
    valor: 485.05,
    obs: "USD 89 · contratos, comprovantes e documentos de cadastro",
  },
  {
    id: "d4sign",
    titulo: "Assinatura D4Sign",
    valor: 49.0,
    obs: "plano básico · a confirmar",
    estimado: true,
  },
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
    id: "email",
    titulo: "E-mail (Resend)",
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
    id: "ia",
    titulo: "I.A. em produção (Cícero)",
    valor: 250.0,
    obs: "atendente e leitura automática de documentos",
    estimado: true,
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

/**
 * Taxa de conversão entre valor e processamento, derivada dos próprios tiers:
 * 163,50 / 4,4 M = 327,00 / 8,8 M = R$ 37,16 por milhão de tokens.
 * Usada para converter entregas fechadas (com valor cheio) em tokens.
 */
export const REAIS_POR_MILHAO = 37.16;

/**
 * Uma entrega tem OU um tier (pacote padrão), OU valor e tokens explícitos
 * — o caso de entregas grandes fechadas por valor.
 */
export type DevEntry = {
  /** dd/mm */
  data: string;
  titulo: string;
  desc: string;
  tier?: Tier;
  /** Valor fechado, quando a entrega não se encaixa num tier. */
  valor?: number;
  /** Tokens equivalentes, quando a entrega não se encaixa num tier. */
  tokens?: number;
};

/** Valor de uma entrega — do tier ou do valor fechado. */
export function valorEntrega(e: DevEntry): number {
  return e.tier ? TIERS[e.tier].valor : (e.valor ?? 0);
}

/* Margem da casa (regra do dono, 25/08/2026): remuneração de desenvolvimento
   ganha 20% a partir da competência de SETEMBRO/2026 — mês fechado fica como
   estava. A tabela de tiers segue na régua base: a Ana lê ela crua e aplica
   a mesma margem do lado dela — a margem aqui é só de exibição/cálculo. */
export const MARGEM_DEV = 1.2;
export const MARGEM_DESDE = "2026-09";

/** Preço de um tier na competência: régua base até ago/2026, ×1,2 dali em diante. */
export function precoTier(mes: string, tier: Tier): number {
  const c = TIERS[tier].valor;
  return mes >= MARGEM_DESDE ? Math.round(c * MARGEM_DEV * 100) / 100 : c;
}

/** Preço de uma entrega na competência (tier ou valor fechado, com a margem). */
export function precoEntrega(mes: string, e: DevEntry): number {
  const c = valorEntrega(e);
  return mes >= MARGEM_DESDE ? Math.round(c * MARGEM_DEV * 100) / 100 : c;
}

/** Tokens de uma entrega — do tier ou dos tokens informados. */
export function tokensEntrega(e: DevEntry): number {
  return e.tier ? TIERS[e.tier].tokens : (e.tokens ?? 0);
}

/** Rótulo do pacote da entrega (tier) ou "Entrega fechada". */
export function labelEntrega(e: DevEntry): string {
  return e.tier ? TIERS[e.tier].label : "Entrega fechada";
}

/** Chave = mês YYYY-MM. Do mês da entrega da v1 até o mês corrente. */
export const DESENVOLVIMENTO: Record<string, DevEntry[]> = {
  "2026-04": [
    {
      data: "30/04",
      titulo: "Rebuild do front-end",
      desc: "Reconstrução completa da interface do sistema: todas as telas, a navegação e a identidade visual foram refeitas do zero, com o padrão que a plataforma usa hoje.",
      valor: 36554.0,
      tokens: 983_700_000,
    },
  ],
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
    {
      data: "05/08",
      titulo: "Cícero proativo por toda parte",
      desc: "O Cícero ganhou rosto próprio e parou de esperar pergunta: cada nível de acesso passou a ver conselhos do Cícero na própria tela, quem está com cadastro pela metade recebe a oferta de completar ali mesmo, e o painel abre com o 'Cícero sugere' no topo, apontando o que merece atenção hoje.",
      tier: "G",
    },
    {
      data: "05/08",
      titulo: "Regras de operação afinadas",
      desc: "Só parcela a vencer entra em operação, parcela longa demais vira prospect pra trabalhar depois, e atraso só conta contra o cliente se a parcela realmente foi operada. Os e-mails da plataforma ganharam um vigia diário que confere se estão saindo e chegando direito.",
      tier: "M",
    },
    {
      data: "05/08",
      titulo: "Grupo econômico: matriz e filiais",
      desc: "Construtoras que são um grupo passaram a ser cadastradas como matriz e filiais, com visão consolidada do grupo inteiro — números e operações de todas as casas somados num lugar só.",
      tier: "M",
    },
    {
      data: "11/08",
      titulo: "Prazo de antecipação: de 120 para 150 dias",
      desc: "O prazo máximo de uma operação subiu de 120 para 150 dias — dá pra parcelar em até 5 meses em vez de 4. Ajustado em todo o sistema: formulários de cadastro, as travas que conferem o prazo no servidor, o Cícero, a calculadora do site, a página de captação e os vídeos de apresentação da imobiliária e do comercial, que foram regravados com o novo prazo.",
      tier: "M",
    },
    {
      data: "11/08",
      titulo: "Kit de marketing para redes sociais — 3 campanhas",
      desc: "81 peças prontas pra postar no Instagram, divididas em três campanhas: uma para imobiliárias, uma para construtoras parceiras e uma para recrutar comerciais — cada uma com legendas, hashtags e calendário de postagem de 4 semanas, mais o plano de tráfego pago das três frentes. Central de aprovação nova na apresentação (antecipaqui-apresentacao.vercel.app/campanhas), com uma aba por campanha, aprovação peça a peça e download em lote.",
      tier: "G",
    },
    {
      data: "13/08",
      titulo: "Manual do Comercial e entrada de novos comerciais",
      desc: "Apresentação nova só para o time comercial (antecipaqui-comercial.vercel.app): 16 telas explicando a plataforma de ponta a ponta — o problema dos 150 dias, como o dinheiro anda, a conta de uma operação real, as objeções que aparecem na rua e o método de trabalho da semana. Duas telas são o coração: o kit de apresentação, onde o comercial escolhe se vai apresentar para uma imobiliária ou para uma construtora e já abre a apresentação certa, e a tela de entrada no time. Junto veio o cadastro público de comercial (antecipaqui.digital/quero-ser-comercial): o candidato preenche a ficha, o administrador recebe aviso na hora e aprova ou recusa numa fila nova dentro do painel — aprovou, o acesso dele já nasce liberado no perfil de comercial.",
      tier: "G",
    },
    {
      data: "13/08",
      titulo: "Ponte OPERA: fundos com sistema próprio",
      desc: "A estrutura pra um fundo que opera no sistema próprio dele — como a OPERA — conversar com a plataforma: o que acontece aqui é avisado lá, a resposta de lá volta pra cá, e ninguém precisa digitar a mesma coisa duas vezes.",
      tier: "G",
    },
    {
      data: "18/08",
      titulo: "Baixa de custos em mão dupla com o controle da casa",
      desc: "O descritivo de custos marcava pago só no navegador de quem clicava — o controle da Diretório Web (Ana) não ficava sabendo e seguia cobrando. Agora mês pago lá entra marcado aqui, mês fechado ou reaberto aqui dá baixa lá na hora (com aviso visível quando a ponte falha) e as marcações antigas deste navegador migram sozinhas uma única vez.",
      tier: "P",
    },
    {
      data: "18/08",
      titulo: "Integração real com a OperAPI",
      desc: "A ponte com a OPERA saiu do desenho e passou a falar a língua oficial do sistema deles: autenticação oficial, os formatos de dados que a OperAPI exige e a configuração de cada fundo feita direto no painel, sem mexer em código.",
      tier: "G",
    },
    {
      data: "18/08",
      titulo: "Pacote de segurança",
      desc: "Auditoria completa de quem fez o quê na plataforma, rotação de senha, limite de tentativas de login e proteção extra nas exportações financeiras.",
      tier: "G",
    },
    {
      data: "18/08",
      titulo: "Central de Diagnóstico",
      desc: "Robôs de verificação de 1 clique, no admin e no painel do fundo: apertou o botão, o sistema confere sozinho se está tudo em ordem e aponta o que precisa de atenção.",
      tier: "M",
    },
    {
      data: "18/08",
      titulo: "Fundo com vários usuários + saldo em caixa",
      desc: "O fundo deixou de ser uma conta só: pode ter vários usuários trabalhando ao mesmo tempo, e o painel passou a mostrar o saldo em caixa do fundo.",
      tier: "M",
    },
    {
      data: "19/08",
      titulo: "Login do site restaurado + cadastro por convite blindado",
      desc: "O sistema de login tinha sido apontado pra uma instância nova sem endereço configurado e sem os usuários — botões de entrar e cadastrar pararam no site inteiro e quem clicava em convite via tela em branco. Diagnóstico completo e reversão: login de volta pra todos os usuários. De quebra, o fluxo de convite ficou blindado: link leva direto à tela de criar conta, convite reenviado redireciona sozinho pro mais novo (o link antigo do e-mail continua valendo) e convite vencido mostra explicação em vez de tela vazia. O endereço da instância nova ficou pronto no DNS pra migração futura.",
      tier: "M",
    },
    {
      data: "19/08",
      titulo: "Login migrado pra infraestrutura definitiva de produção",
      desc: "O sistema de autenticação saiu do ambiente de testes e passou a rodar na infraestrutura definitiva, no domínio próprio da plataforma (clerk.antecipaqui.digital) — com endereços de e-mail autenticados (DKIM) pra os códigos de login chegarem com confiança. Migração completa sem perder ninguém: todas as contas foram recriadas no ambiente novo e o banco foi reescrito pra apontar pros novos registros, numa única operação reversível. Quem usava Google/Apple continua entrando pelo código de e-mail até as credenciais próprias serem configuradas.",
      tier: "M",
    },
    {
      data: "19/08",
      titulo: "Consulta da assistente direto no banco",
      desc: "A Ana, assistente da Diretório Web, passou a responder perguntas sobre a plataforma com dados ao vivo, direto da fonte — quantas operações, quem está devendo, o que venceu — sem ninguém precisar abrir tela pra conferir número.",
      tier: "M",
    },
    {
      data: "25/08",
      titulo: "Consumo do Cícero exposto pra Ana + linha de IA real no relatório",
      desc: "O quanto o Cícero gasta de inteligência artificial já ficava registrado conversa a conversa; agora esse consumo é publicado pra central de custos da Diretório Web (Ana) e a linha mensal de I.A. deste relatório deixou de ser um valor escrito à mão: passa a mostrar o gasto real do mês — e, se a central estiver fora do ar, uma estimativa calculada na hora sobre o consumo medido. Junto veio o medidor genérico pra qualquer uso futuro de IA fora do Cícero.",
      valor: 60.0,
      tokens: 1_600_000,
    },
    {
      data: "25/08",
      titulo: "Equipe do fundo: convites e níveis de acesso",
      desc: "O dono do fundo passou a convidar os membros da equipe por conta própria, cada um com o seu nível de acesso — quem só consulta, quem opera e quem manda.",
      tier: "M",
    },
    {
      data: "28/08",
      titulo: "Ficha de conexão do fundo — tudo que o time técnico precisa, num bloco só",
      desc: "Quando um fundo liga o sistema dele na plataforma, alguém precisa passar pro time técnico deles o número que identifica o fundo, os endereços que eles vão chamar e a chave que protege cada mensagem. Isso estava espalhado — e o número do fundo não aparecia em lugar nenhum no painel deles. Agora tem uma ficha única, no painel do fundo e na tela de integração do administrador: número do fundo em destaque, os cinco endereços de entrada com o cabeçalho de segurança de cada um, as chaves com o aviso de quais já estão prontas e um botão que copia a ficha inteira em texto pra mandar por e-mail. A chave também pode ser vista de novo (antes só aparecia uma vez, e quem perdesse tinha que refazer tudo) e gerada quando falta — cada consulta fica registrada no histórico de auditoria.",
      tier: "P",
    },
  ],
  "2026-09": [
    {
      data: "01/09",
      titulo: "Integração OPERA homologada",
      desc: "O cadastro de cliente e o de cedente foram validados contra a API real da OPERA, e a esteira do fundo foi mapeada de ponta a ponta — a ponte deixou de ser promessa e passou no teste com o sistema de verdade.",
      tier: "G",
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

/**
 * Primeiro mês do relatório. A infraestrutura do Antecipaqui já rodava antes
 * do go-live da v1 — o dono conta as contas fixas a partir de fevereiro/2026.
 */
export const MES_INICIAL = "2026-02";

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
