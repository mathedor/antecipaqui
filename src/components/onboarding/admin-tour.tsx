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
    emoji: "🛡️",
    eyebrow: "bem-vindo, admin",
    titulo: "Você é a cabine de comando da plataforma",
    subtitulo: "Todo controle, toda alavanca, toda intervenção mora aqui",
    descricao:
      "Esse tour cobre TUDO — cada ferramenta, cadastro, relatório e ação manual que o admin tem na mão. São ~18 passos densos. Vou começar pela hierarquia de perfis (importante: você pode estar vendo um subset do menu se não for super-admin), depois mostrar o dashboard, a operação diária na Mesa de Decisão, e em seguida cada área (cadastros, fundos, comerciais, construtoras, imobs, suporte, mural, relatórios, auditoria, configurações). O tour é navegável — pule pra trás/frente quando quiser.",
    pontos: [
      "🎯 Decidir + Pendências: seu dia-a-dia operacional",
      "📋 Registros: tudo que existe no sistema",
      "🏗️ Cadastrar: criar fundos, comerciais, construtoras, imobs, ops",
      "📊 Relatórios: 12+ relatórios prontos",
      "👀 Visualizar como: impersonation segura pra suporte",
    ],
  },
  {
    emoji: "🧑‍✈️",
    eyebrow: "★ entenda primeiro: hierarquia",
    titulo: "Os 4 perfis de admin",
    subtitulo: "Cada um vê um subset do menu — esse tour mostra TUDO, ok?",
    descricao:
      "Existem 4 perfis de admin no sistema, configurados em users.adminProfile. O menu lateral é filtrado dinamicamente por perfil — se algum item desse tour não aparece pra você, é porque seu perfil não tem acesso. Pra mudar perfis, vá em Registros → Administradores (só super pode).",
    pontos: [
      "👑 SUPER — acesso total, único que gerencia outros admins, configurações globais, ações destrutivas. Default pra contas antigas (adminProfile null).",
      "💰 FINANCEIRO — dashboard, fundos, faturas, relatórios, comerciais, invoice. NÃO vê: tickets, mural, configurações.",
      "⚙️ OPERAÇÕES — dashboard, operações, construtoras, cadastrar imob/construtora, convites, pendências. NÃO vê: financeiro/fundos/configs.",
      "🎧 SUPORTE — tickets, mural, daily, usuários (read-only). NÃO vê: cadastrar nada, financeiro, configs.",
    ],
    visual: (
      <div className="rounded-xl border-2 border-accent/30 bg-accent-soft p-4 font-mono text-xs">
        <div className="text-[10px] text-fg-dim uppercase tracking-wider mb-2">
          hierarquia de admin
        </div>
        <div className="grid grid-cols-4 gap-2 text-[10px] text-center">
          <div className="rounded bg-accent text-white p-2 font-bold">
            👑 SUPER
            <div className="text-[9px] font-normal mt-1">tudo</div>
          </div>
          <div className="rounded bg-bg p-2 border border-border">
            💰 FIN
            <div className="text-[9px] text-fg-muted mt-1">fundos+$</div>
          </div>
          <div className="rounded bg-bg p-2 border border-border">
            ⚙️ OPS
            <div className="text-[9px] text-fg-muted mt-1">ops+cad</div>
          </div>
          <div className="rounded bg-bg p-2 border border-border">
            🎧 SUP
            <div className="text-[9px] text-fg-muted mt-1">tickets</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    emoji: "🏠",
    eyebrow: "ponto de partida",
    titulo: "Dashboard — Action Center + Pipeline + Sourcing",
    subtitulo: "O painel-mãe — KPIs, urgências e funil",
    descricao:
      "Em /admin você tem 4 blocos que viram seu radar diário:\n\n• KPIs no topo: VP comprado, antecipado, a vencer, vencidas, realizadas\n• Action Center: pendências URGENTES por severidade (precisa atuar HOJE)\n• Pipeline Funnel: onde estão as ops por status — gargalo aparece visualmente\n• Sourcing Board: ops direcionadas pra cada fundo (quem precisa decidir o quê)\n\nNo gráfico abaixo: movimento mensal de lucratividade, operações e comissão.",
    pontos: [
      "Use o Action Center como TO-DO list do dia",
      "Pipeline Funnel ajuda a ver onde está engargalando (ex: muitas em 'docs incompletos' = problema de comunicação)",
      "Cliques nos KPIs filtram a lista de ops correspondente",
    ],
    ctaHref: "/admin",
    ctaLabel: "Abrir Dashboard",
  },
  {
    emoji: "⚖️",
    eyebrow: "★ tela mais usada no dia-a-dia",
    titulo: "Mesa de Decisão (/admin/decidir)",
    subtitulo: "Fila consolidada — aprovar/rejeitar 10-15 ops em 30 min",
    descricao:
      "Cada op aparece como CARD INLINE com tudo que você precisa pra decidir sem clicar pra abrir: score da construtora (0-100 baseado em histórico), status de docs (OK/revisão IA/sem validação), decomposição financeira (comissão, VP, spread, resultado AQ), construtora/imob/corretor/fundo vinculados.\n\nFiltros por estado: Aguardando análise, Docs incompletos, Fundo pendente, Fundo recusou.\n\nAções inline: Pré-aprovar (com modal de ajuste de taxa), marcar 'Docs incompletos' (motivo vira pendência), Recusar (motivo obrigatório).",
    pontos: [
      "Score baixo + docs em revisão = abra antes de decidir",
      "Pré-aprovação abre modal com calculadora — pode ajustar taxa por op",
      "Recusa exige motivo (audit completo)",
      "Após pré-aprovar, op vai pra fila do fundo decidir",
    ],
    ctaHref: "/admin/decidir",
    ctaLabel: "Abrir Mesa de Decisão",
  },
  {
    emoji: "📥",
    eyebrow: "pedidos de construtoras",
    titulo: "Pendências — antecipações + renegociações",
    subtitulo: "Construtora pede pra adiantar ou reestruturar prazo",
    descricao:
      "Diferente da mesa (ops novas), aqui são ops JÁ APROVADAS onde a construtora pediu mudança:\n\n• Antecipação: 'quero aumentar comissão antes de pagar' — você analisa impacto e aprova/rejeita\n• Renegociação: 'preciso estender prazo' / 'reduzir parcelas' — calcula novo cronograma\n\nDepois da sua decisão admin, normalmente o fundo também precisa decidir (ele aparece em /painel/pendencias-decisao do fundo).",
    pontos: [
      "Cada pedido vem com motivação textual da construtora",
      "Aprovar renegociação aplica mudança automaticamente nas parcelas",
      "Aprovar antecipação dispara recálculo de VP",
      "Recusar mantém op intacta",
    ],
    ctaHref: "/admin/pendencias",
    ctaLabel: "Abrir Pendências",
  },
  {
    emoji: "🔬",
    eyebrow: "anatomia de uma operação",
    titulo: "Operação 360° (/admin/operacoes/[id])",
    subtitulo: "O detalhe completo onde você intervém em qualquer coisa",
    descricao:
      "Padrão 360 — toda info de uma op num lugar só, agrupada em seções:\n\n• Header: número, status, construtora, imob, corretor, fundo\n• Status flow: transições interativas com motivos + modais de ajuste\n• Contrato: versão atual, URL, botão regenerar\n• Documentos: tabela com tipo, status validação IA, link revisar\n• Parcelas: número, valor, vencimento, encargos calculados, botões (gerar boleto, marcar pago)\n• Custos: breakdown completo (taxa, spread, juros, multa)\n• Notas internas: chat admin↔admin privado (audit)\n• Timeline: TODOS os eventos da op (criação, aprovações, contrato, status)",
    pontos: [
      "Use as notas internas pra deixar contexto pra outros admins ('cliente pediu ligação, ver com Maria')",
      "Timeline é audit visual — clica num evento pra ver detalhes",
      "Cada parcela tem botão 'marcar como paga' pra baixa manual (modo cobrança manual)",
    ],
    ctaHref: "/admin/operacoes",
    ctaLabel: "Listar Operações",
  },
  {
    emoji: "🛠️",
    eyebrow: "★ ações exclusivas do admin",
    titulo: "Editar + Status Flow — o que SÓ admin pode fazer",
    subtitulo: "Forçar status, recalcular VP, ajustar parcelas",
    descricao:
      "Em /admin/operacoes/[id]/editar você tem acesso a coisas que ninguém mais consegue:\n\n• Editar valor venda, valor comissão, data venda → sistema RECALCULA o valor presente automaticamente\n• Alterar número de parcelas + valor + vencimento de cada uma\n• Regenerar contrato (se o anterior virou inválido)\n• Cancelar op com motivo (audit)\n• Forçar transição de status (mesmo as bloqueadas pela lógica normal)\n• Atribuir a outro fundo (recoloca em fila)\n• Marcar parcela como paga sem webhook (refundo manual)\n• Ajustar taxa por op (modal calculadora)\n\nTodo movimento aqui fica AUDITADO — admin + ação + before/after gravado em audit_logs.",
    pontos: [
      "Editar valores INVALIDA contrato — sistema avisa e exige regerar",
      "Mudar fundo recoloca op em 'fundo pendente' (mesmo se já tinha sido aprovada)",
      "Marcar paga manual deve ser último recurso — prefira webhook/CNAB",
      "Cada ação registra você como autor (use sua conta, não compartilhe)",
    ],
  },
  {
    emoji: "🏦",
    eyebrow: "★ feature mais pedida — parte 1/2",
    titulo: "Cadastrar Fundo (wizard de 6 passos)",
    subtitulo: "De CNPJ até cobrança automática — passo a passo",
    descricao:
      "Em /admin/fundos/novo você abre o wizard que cria o fundo do zero. 6 passos:\n\n1️⃣ CNPJ — auto-fetch na Receita Federal preenche razão, fantasia, endereço\n2️⃣ Dados da empresa — confirmar/ajustar tudo\n3️⃣ Contato responsável — nome PF que assina, WhatsApp, email comercial, **email para assinatura de contratos** (importante)\n4️⃣ Taxa & custos:\n   • Taxa mensal base (default 6% a.m.) — vira default das ops\n   • Custo financeiro % — % dos juros que fica com a AQ (rateio do invoice)\n   • Impostos % — PIS/COFINS/IR descontados automaticamente\n5️⃣ Sistema de assinatura — ZapSign (padrão) OU custom (D4Sign/Clicksign/AutentiQue com API URL+credenciais)\n6️⃣ Dados bancários — banco/agência/conta pra receber, e separadamente banco que emite boletos\n\nTem modo avançado em /admin/fundos/novo/avancado (form único com tudo, sem wizard).",
    pontos: [
      "Anote o email assinatura — ele recebe TODO contrato pra assinar",
      "Taxa base é só default — pode ajustar por op na Mesa de Decisão",
      "Custos % afetam fatura mensal que AQ cobra do fundo (Invoice)",
      "Banco recebimento ≠ banco boleto (alguns fundos usam bancos diferentes)",
    ],
    ctaHref: "/admin/fundos/novo",
    ctaLabel: "Cadastrar Fundo (wizard)",
  },
  {
    emoji: "🏦",
    eyebrow: "★ feature mais pedida — parte 2/2",
    titulo: "Detalhe do Fundo + Cobrança (manual/API/CNAB)",
    subtitulo: "Gerenciar boletos, integrações e gerar convite de login",
    descricao:
      "Em /admin/fundos/[id] você tem TUDO do fundo numa tela:\n\n• Contato + dados bancários + taxa + custos (editáveis)\n• Sistema de assinatura (ZapSign ou custom)\n• **Cobrança** — escolha o modo:\n   🟡 MANUAL: sistema só calcula multa+juros; você dá baixa manual\n   🟢 API: cadastra URL+auth+webhook do banco do fundo; baixa automática quando webhook chega\n   🔵 CNAB: gera arquivo remessa pra subir no internet banking; importa retorno em /admin/fundos/[id]/cnab\n• Operações associadas (volume, status)\n• **Convite**: gera link único pro fundo logar (manda pro email assinatura)\n\nA CNAB tem tela própria: /admin/fundos/[id]/cnab — botão baixar remessa, upload retorno, contador de parcelas pendentes de número.",
    pontos: [
      "Cobrança API é mais robusta — exige cooperação do banco do fundo",
      "CNAB é universal mas exige operação manual (upload retorno semanal)",
      "Convite gera link único de 1ª senha — fundo troca depois",
      "Operações sob esse fundo aparecem na seção do final",
    ],
    ctaHref: "/admin/fundos",
    ctaLabel: "Listar Fundos",
  },
  {
    emoji: "💼",
    eyebrow: "habilitar time comercial",
    titulo: "Cadastrar Comercial + vínculo a fundo",
    subtitulo: "Generalista (atende qualquer fundo) ou exclusivo de um",
    descricao:
      "Em /admin/cadastrar/comercial você cria o comercial. Form curto:\n\n• Tipo: PF ou PJ\n• Nome completo / razão social\n• Documento (CPF/CNPJ)\n• Email (será criado user + convite enviado)\n• Telefone WhatsApp\n• **Fundo (opcional)** — se preenchido, comercial é EXCLUSIVO daquele fundo (só vê ops daquele fundo, captação só pra ele); se vazio, é GENERALISTA (todos os fundos).\n\nComercial loga em /painel/comercial e usa o tour específico de comercial (já existe).",
    pontos: [
      "Decisão estratégica: comercial exclusivo dá foco; generalista dá flexibilidade",
      "Fundo exclusivo APARECE no painel do fundo (/painel/comerciais) com desempenho do comercial",
      "Comissão do comercial sai automática quando op vinculada vira realizada",
      "Lista em /admin/comerciais mostra todos com coluna 'fundo'",
    ],
    ctaHref: "/admin/cadastrar/comercial",
    ctaLabel: "Cadastrar Comercial",
  },
  {
    emoji: "🏗️",
    eyebrow: "onboarding manual de construtora",
    titulo: "Cadastrar Construtora + fundo fidelizado",
    subtitulo: "Direciona todas as futuras ops dela pra um fundo específico",
    descricao:
      "Em /admin/cadastrar/construtora você faz o onboarding manual (algumas vêm via cadastro próprio também). Form:\n\n• Razão, CNPJ, endereço\n• Email responsável (cria user role='construtora')\n• Documentação inicial (contrato social, comprovante endereço)\n• **Fundo fidelizado (opcional)** — se preenchido, TODAS as futuras ops dessa construtora são vinculadas AUTOMATICAMENTE àquele fundo e usam a taxa-base dele. Admin não escolhe op a op.\n\nDepois de criada, gerencie em /admin/construtoras (lista) ou /admin/construtoras/[id] (detalhe com score, ops, docs).",
    pontos: [
      "Fundo fidelizado é poderoso — usa pra parcerias estratégicas",
      "Bloquear construtora desativa novas ops mas mantém histórico",
      "Aprovar onboarding libera ela pra usar o painel",
      "Score de risco da construtora afeta priorização na Mesa de Decisão",
    ],
    ctaHref: "/admin/cadastrar/construtora",
    ctaLabel: "Cadastrar Construtora",
  },
  {
    emoji: "🏘️",
    eyebrow: "aprovar onboarding",
    titulo: "Imobiliárias / Corretores",
    subtitulo: "Aprovar docs, validar CRECI, gerenciar bloqueios",
    descricao:
      "Em /admin/usuarios você gerencia imobiliárias e corretores. Maioria chega via auto-cadastro (eles preenchem onboarding). Seu trabalho:\n\n• Status 'pendente' → revisa documentação → 'aprovado' (libera plataforma)\n• Edita nome/telefone/role se vier com erro\n• Bloqueia (isActive=false) se houver fraude ou inatividade prolongada\n• Pode cadastrar manualmente em /admin/cadastrar/imobiliaria (com dados bancários pra cláusula 3ª do contrato)\n\nFiltros: tipo (imob/corretor/construtora/admin), status (completo/pendente/bloqueado), busca por nome ou email.",
    pontos: [
      "Aprovação envia email automático confirmando",
      "Bloqueio mantém histórico visível mas user não loga",
      "Construtoras aparecem nessa lista também (filtro 'tipo')",
      "Detalhe do user (/admin/usuarios/[id]) tem auditoria de logins",
    ],
    ctaHref: "/admin/usuarios",
    ctaLabel: "Abrir Usuários",
  },
  {
    emoji: "👀",
    eyebrow: "★ poderoso e seguro",
    titulo: "Visualizar Como (impersonation)",
    subtitulo: "Entrar como outro user sem saber a senha — pra suporte",
    descricao:
      "Em /admin/visao você seleciona qualquer user (busca por email/role) e clica 'entrar como'. Sistema seta cookie httpOnly de 4h e te redireciona pro painel daquele user — você vê EXATAMENTE o que ele veria.\n\nFluxo seguro:\n• Cookie httpOnly + secure (HTTPS) + sameSite=lax\n• Sessão expira automaticamente em 4h\n• Banner amarelo no topo lembra que você está impersonando\n• Email/SMS suprimidos durante a sessão (cliente NÃO recebe notificação das suas ações)\n• Audit completo: 'impersonation_started' e 'impersonation_stopped' com admin ID + user target\n• Você NÃO pode impersonar outro admin (proteção)\n• Botão 'sair da impersonation' no banner\n\nUse pra resolver tickets, debugar layout, validar permissões. Histórico em /admin/visao/historico.",
    pontos: [
      "Não use em produção sem motivo justificado — fica registrado",
      "Mudanças que você fizer são REAIS — apareceram pro user",
      "Se precisar conversar com cliente, use ticket; impersonation é só pra debugar/ver",
      "Histórico mostra duração de cada sessão (qual admin entrou em quem, quanto tempo)",
    ],
    ctaHref: "/admin/visao",
    ctaLabel: "Abrir Visualizar Como",
  },
  {
    emoji: "🎫",
    eyebrow: "atendimento",
    titulo: "Tickets — chat multi-categoria",
    subtitulo: "Suporte, negociações, confirmações, documentos",
    descricao:
      "Em /admin/tickets você gerencia o suporte. Categorias:\n\n• suporte — cliente fala com admin\n• operacoes / negociacoes — fundo conversa sobre op\n• confirmacao — fundo fala com construtora\n• documentos — fundo pede doc pra imob/corretor\n• geral / cashback (legacy)\n\nFiltros: status (abertos/aguardando/finalizados), categoria, busca por assunto, arquivados, não lidos.\n\nNo detalhe do ticket: chat com timestamps, dropdown de status, botão 'nudge' (rate-limited) pra notificar participantes, arquivo de conversa.",
    pontos: [
      "Use 'nudge' quando ticket está parado há dias — manda push pra todos",
      "Arquivo mantém o ticket mas tira do filtro padrão",
      "Finalizar quando resolvido — fica como histórico",
      "Notas internas dentro do ticket: só admins veem (separado do chat com cliente)",
    ],
    ctaHref: "/admin/tickets",
    ctaLabel: "Abrir Tickets",
  },
  {
    emoji: "📢",
    eyebrow: "comunicação broadcast",
    titulo: "Mural — recados pra todo mundo (ou audience específica)",
    subtitulo: "Banner deslizante no dashboard dos clientes",
    descricao:
      "Em /admin/mural você cria mensagens que aparecem como banner no topo do painel dos clientes:\n\n• Título + body (texto)\n• Audience: admin / imobiliaria / construtora / all (escolhe quem vê)\n• Expira em (data/hora opcional — se vazio, fica até desativar)\n\nLista mostra todos ativos/inativos. Pode editar, desativar, deletar a qualquer momento.\n\nCasos de uso: 'Nova taxa de 7% a.m. a partir de segunda', 'Manutenção sábado 22h-2h', 'Treinamento gratuito quinta'.",
    pontos: [
      "Audience 'all' = todos os roles veem",
      "Use expiração pra recados temporários (evita esquecer no ar)",
      "Texto curto — banner é estreito",
      "Pré-visualize antes de salvar (vê como aparece pro cliente)",
    ],
    ctaHref: "/admin/mural",
    ctaLabel: "Abrir Mural",
  },
  {
    emoji: "📊",
    eyebrow: "★ relatórios — parte 1/2",
    titulo: "Relatórios essenciais — Daily, Índices, Recaps, Saúde",
    subtitulo: "Visão operacional e métricas do sistema",
    descricao:
      "Hub em /admin/relatorios com 12+ relatórios. Os essenciais do dia-a-dia:\n\n• Daily — cronograma de parcelas a vencer/vencidas, com cálculo automático de encargos. Filtros por período/fundo/construtora/imob. Use pra cobrar e priorizar contato.\n\n• Índices — KPIs gerais: valor médio das ops, distribuição por faixa, funil de conversão (% que sai de rascunho a realizada), taxa de recusa, inadimplência, gráficos por fundo.\n\n• Recaps — resumos diários/semanais/mensais enviados por email automaticamente. Histórico mostra os recaps anteriores; tem gerador on-demand pra qualquer período custom.\n\n• Saúde — status do sistema: Resend (email), Clerk (auth), Vercel Blob (storage), integrações ZapSign, e validação de configs críticas. Use quando algum cliente reclamar de erro — confirma se é problema externo.",
    pontos: [
      "Daily é a ferramenta de cobrança — abre todo dia",
      "Índices te dão visão estratégica (use semanalmente)",
      "Recaps já são enviados auto — gere on-demand quando precisar ad-hoc",
      "Saúde: o vermelho indica integração caída (chame suporte do provedor)",
    ],
    ctaHref: "/admin/relatorios",
    ctaLabel: "Abrir Relatórios",
  },
  {
    emoji: "🏆",
    eyebrow: "★ relatórios — parte 2/2",
    titulo: "Rankings, Borderôs, Inadimplentes, Logs",
    subtitulo: "Operacional, financeiro e auditoria",
    descricao:
      "• **Rankings** — quatro views (construtoras, imobiliárias, fundos, comerciais) com valor operado/pago/em aberto. Use pra premiar top performers e identificar quem caiu de produção.\n\n• **Borderôs** — operações com totais (bruto, deságio, líquido, custos). Exporta CSV/PDF. Filtros por período/fundo/construtora/cedente. Use pra fechamento financeiro mensal.\n\n• **Inadimplentes** — parcelas vencidas por período. Cruza com Daily mas tem foco específico de cobrança escalada.\n\n• **Logs (auditoria completa)** — toda ação registrada (login, view, create, update, delete, approve, change_status, impersonation, etc). Filtros por ação, tipo alvo, user ID, range de data. Código de cor visual (delete=red, create=blue, approve=green). Use pra investigar problemas ('quem mudou essa op ontem?').",
    pontos: [
      "Rankings: fórmula transparente, mesma lógica nas 4 views",
      "Borderôs: o relatório mais usado pra contabilidade do fundo",
      "Logs: o seu detetive — use quando algo 'sumiu' ou foi alterado",
    ],
    ctaHref: "/admin/relatorios/logs",
    ctaLabel: "Abrir Logs",
  },
  {
    emoji: "⚙️",
    eyebrow: "★ só super-admin",
    titulo: "Configurações + Risco Global + Análise de Crédito + Admins",
    subtitulo: "Parâmetros que mudam o comportamento do sistema inteiro",
    descricao:
      "• /admin/configuracoes — parâmetros globais:\n  • Taxa de juros sugerida (default 6% a.m.) — calculadora + default das novas ops\n  • Spread mínimo (gap taxa op − taxa fundo) — bloqueia aprovações abaixo\n  • CDI mensal (benchmark fundo) — comparativo no Daily\n  • Score de inadimplência — pesos pra construtoras, imobs, corretores\n\n• /admin/risco-global — exposição agregada por construtora (score, parcelas vencidas, inadimplência) — visão sistêmica de risco do sistema todo.\n\n• /admin/credito — análise de crédito detalhada por entidade, blacklist, histórico.\n\n• /admin/usuarios/admins — gerenciar OUTROS admins (só super pode). Convidar novo admin, mudar perfil (super/financeiro/operações/suporte), remover. CUIDADO: muito poder aqui.",
    pontos: [
      "Mudar configs IMPACTA o sistema inteiro — coordene com time antes",
      "Spread mínimo previne aprovações com margem ruim pra AQ",
      "Risco Global = bird's eye de toda a carteira do sistema",
      "Gerenciar admins: nunca remova SUPER se for o único restante",
    ],
    ctaHref: "/admin/configuracoes",
    ctaLabel: "Abrir Configurações",
  },
  {
    emoji: "🚀",
    eyebrow: "bora começar",
    titulo: "Tudo pronto, admin!",
    subtitulo: "Volta aqui quando precisar refrescar",
    descricao:
      "Esse tour fica disponível pra sempre no menu do seu user (canto superior direito) → 'Onboarding'. Reabra quando entrar admin novo, lançarmos feature nova, ou quando esquecer onde fica algo.\n\nSUGESTÃO DE ROTINA DIÁRIA:\n1. Dashboard → vê Action Center, prioriza o dia\n2. Mesa de Decisão → aprova/rejeita ops pendentes (30 min)\n3. Pendências → resolve antecipações/renegociações\n4. Tickets → responde suporte pendente\n5. Daily → cobra parcelas vencidas\n\nROTINA SEMANAL:\n- Segunda: Recaps + Rankings (entender semana anterior)\n- Sexta: Borderôs (fechamento financeiro)\n\nROTINA MENSAL:\n- Configurações: revisa taxa/spread/CDI\n- Risco Global: identifica concentração crítica\n- Invoice: fecha faturamento dos fundos",
    pontos: [
      "Dúvida? Tem chat de admin↔admin nas operações (notas internas)",
      "Cadastros novos? Cadastrar Imob/Construtora/Comercial/Fundo no menu",
      "Quer ver como um cliente vê? Use Visualizar Como (sempre auditado)",
      "Bug/feature? Repositorio interno em /admin/backups → arquivos compartilhados",
    ],
  },
];

export function AdminTour({
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
      await markTourCompleted("admin");
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
