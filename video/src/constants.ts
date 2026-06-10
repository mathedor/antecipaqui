/** Configurações globais do vídeo.
 *  60 segundos a 30fps = 1800 frames. */

export const FPS = 30;
export const SEGUNDOS = 60;
export const DURATION_FRAMES = FPS * SEGUNDOS;

// Vertical-friendly mas que funciona bem no LinkedIn também (1080x1920 reel
// ou 1920x1080 horizontal). Padrão Insta Reel / TikTok / Shorts.
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Paleta da marca Antecipaqui — branco, preto, azul. Cinematográfica e
 *  sofisticada, sem cores chamativas. Accent emerald sutil só pra valor
 *  positivo ("recebe hoje"). */
export const COLORS = {
  // Base — alternância entre cenas claras e escuras
  white: "#ffffff",
  whiteBg: "#fafafc",
  dark: "#0a0e1a", // preto profundo (não puro)
  darkAlt: "#141925",

  // Textos
  fgOnDark: "#ffffff",
  fgOnLight: "#0a0e1a",
  fgMutedOnDark: "rgba(255,255,255,0.7)",
  fgMutedOnLight: "rgba(10,14,26,0.65)",
  fgDimOnDark: "rgba(255,255,255,0.45)",
  fgDimOnLight: "rgba(10,14,26,0.4)",

  // Brand
  accent: "#1c6dd0", // azul Antecipaqui
  accentDark: "#0d4e9e",
  accentLight: "#3b82f6",

  // Highlight sutil de "valor positivo" (recebe / aprovado)
  emerald: "#10b981",

  // Sinal de problema (uso restrito, só na cena 'problema')
  danger: "#dc2626",

  // Borders
  borderOnDark: "rgba(255,255,255,0.1)",
  borderOnLight: "rgba(10,14,26,0.08)",

  // Aliases compat (cenas legadas)
  bg: "#ffffff",
  bgAlt: "#fafafc",
  fg: "#0a0e1a",
  fgMuted: "rgba(10,14,26,0.65)",
  fgDim: "rgba(10,14,26,0.4)",
  border: "rgba(10,14,26,0.08)",
};

/** Timing de cada cena (em frames, 30 fps).
 *  Total = 1800 frames = 60s exato.
 *  Estrutura: 7 cenas originais (35s) + 2 cenas de features/benefícios (20s) + CTA expandido (5s extras).
 *  Cada composição mapeia essas keys pra suas próprias cenas (externas ou inline). */
export const SCENES = {
  hero: { start: 0, duration: 150 }, // 0-5s
  problema: { start: 150, duration: 165 }, // 5-10.5s
  solucao: { start: 315, duration: 165 }, // 10.5-16s
  mobile: { start: 480, duration: 195 }, // 16-22.5s
  calculadora: { start: 675, duration: 165 }, // 22.5-28s
  desktop: { start: 840, duration: 165 }, // 28-33.5s
  recursos: { start: 1005, duration: 300 }, // 33.5-43.5s (10s — grid de ferramentas)
  beneficios: { start: 1305, duration: 270 }, // 43.5-52.5s (9s — lista de ganhos)
  cta: { start: 1575, duration: 225 }, // 52.5-60s
} as const;

export type SceneKey = keyof typeof SCENES;

/** Conteúdo das cenas "recursos" e "beneficios" por role.
 *  Cada role customiza os itens mostrados nessas cenas genéricas. */
export type RoleTourContent = {
  /** Etiqueta de role no topo da cena ("PRA CORRETOR", "PRA FUNDO", etc) */
  eyebrow: string;
  /** Lista de 6-8 ferramentas mostradas em grid (emoji + nome + descrição curta) */
  recursos: Array<{ emoji: string; nome: string; desc: string }>;
  /** Lista de 4-5 benefícios mostrados sequencialmente */
  beneficios: Array<{ emoji: string; titulo: string; sub: string }>;
};

export const TOUR_CONTENT: Record<
  "imobiliaria" | "construtora" | "fundo" | "comercial",
  RoleTourContent
> = {
  imobiliaria: {
    eyebrow: "PRA CORRETOR / IMOBILIÁRIA",
    recursos: [
      { emoji: "🧮", nome: "Simulador", desc: "quanto cai hoje" },
      { emoji: "🗂️", nome: "Kanban CRM", desc: "funil de vendas" },
      { emoji: "🔗", nome: "Link de dados", desc: "cliente preenche sozinho" },
      { emoji: "📄", nome: "OCR contrato", desc: "IA preenche op" },
      { emoji: "📊", nome: "Projeção 6m", desc: "previsibilidade total" },
      { emoji: "👥", nome: "Equipe + roles", desc: "owner · gerente · corretor" },
      { emoji: "💬", nome: "Chat suporte", desc: "resposta em minutos" },
      { emoji: "📱", nome: "PWA mobile", desc: "trabalha em qualquer lugar" },
    ],
    beneficios: [
      { emoji: "💰", titulo: "Comissão em 4 horas", sub: "não em 90 dias" },
      { emoji: "🚫", titulo: "Zero mensalidade", sub: "paga só quando usa" },
      { emoji: "📈", titulo: "Ranking + relatórios", sub: "performance por corretor" },
      { emoji: "🔒", titulo: "ZapSign integrado", sub: "contrato assinado em 1 clique" },
    ],
  },
  construtora: {
    eyebrow: "PRA CONSTRUTORA",
    recursos: [
      { emoji: "🤝", nome: "Atendimento parceiro", desc: "você opina ANTES" },
      { emoji: "📅", nome: "Duplicatas", desc: "cronograma transparente" },
      { emoji: "💸", nome: "Cashback auto", desc: "ganha pagando em dia" },
      { emoji: "⭐", nome: "Score público", desc: "fórmula transparente" },
      { emoji: "📊", nome: "Forecast 6m", desc: "previsão de tesouraria" },
      { emoji: "🏢", nome: "Empreendimentos", desc: "torres + unidades" },
      { emoji: "👥", nome: "Roles internas", desc: "fin · com · jur · owner" },
      { emoji: "📱", nome: "PWA mobile", desc: "aprove no celular" },
    ],
    beneficios: [
      { emoji: "💚", titulo: "Caixa intacto", sub: "mesmas datas, outro destinatário" },
      { emoji: "🎁", titulo: "Cashback por pagar em dia", sub: "liquidez extra grátis" },
      { emoji: "🚀", titulo: "Atrai corretores top", sub: "comissão à vista vs 90 dias" },
      { emoji: "🔍", titulo: "Auditoria por usuário", sub: "compliance pronto" },
    ],
  },
  fundo: {
    eyebrow: "PRA FUNDO INVESTIDOR",
    recursos: [
      { emoji: "⚖️", nome: "Mesa de decisão", desc: "aprove em segundos" },
      { emoji: "🤖", nome: "Regras auto", desc: "dry-run antes de salvar" },
      { emoji: "📈", nome: "Risco + blacklist", desc: "concentração proativa" },
      { emoji: "💳", nome: "Cobrança 3 modos", desc: "manual · API · CNAB" },
      { emoji: "🔌", nome: "API REST", desc: "5 endpoints + Bearer" },
      { emoji: "🔔", nome: "Webhooks HMAC", desc: "retry automático" },
      { emoji: "📆", nome: "Daily + Forecast", desc: "operacional + estratégico" },
      { emoji: "📑", nome: "Modo operacional", desc: "contrato e cobrança do seu jeito" },
    ],
    beneficios: [
      { emoji: "🎯", titulo: "Rendimento previsível", sub: "spread + custo capital calibrável" },
      { emoji: "🛡️", titulo: "Risco controlado", sub: "alertas em 25% / críticos em 40%" },
      { emoji: "⚡", titulo: "Operação enxuta", sub: "regras auto cobrem 70% das óbvias" },
      { emoji: "🔗", titulo: "Integra com seu ERP", sub: "API + webhooks prontos" },
    ],
  },
  comercial: {
    eyebrow: "PRA TIME COMERCIAL",
    recursos: [
      { emoji: "🗺️", nome: "Mapa prospects", desc: "captação por geo" },
      { emoji: "🎯", nome: "Pipeline leads", desc: "kanban por estágio" },
      { emoji: "📅", nome: "Daily", desc: "agenda do dia" },
      { emoji: "💬", nome: "Templates WA", desc: "vars preenchem sozinhas" },
      { emoji: "⚡", nome: "Cadastro express", desc: "imob em 2 min" },
      { emoji: "🔗", nome: "Link convite", desc: "QR + métricas" },
      { emoji: "💰", nome: "Comissões + holerite", desc: "PIX em 5 dias úteis" },
      { emoji: "📊", nome: "Relatórios", desc: "ranking + conversão" },
    ],
    beneficios: [
      { emoji: "🚀", titulo: "Captação na rua", sub: "PWA + GPS + QR + push" },
      { emoji: "💸", titulo: "Comissão recorrente", sub: "ganha em toda op aprovada" },
      { emoji: "🎓", titulo: "Programa Acelera", sub: "mentor + leads pré-aquecidos" },
      { emoji: "📈", titulo: "Holerite automático", sub: "PDF assinado + PIX no dia 5" },
    ],
  },
};
