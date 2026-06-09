/**
 * Database schema — Antecipaqui MVP
 *
 * Notas:
 * - `id` do user vem do Clerk (texto, ex: "user_xxx") — não geramos uuid pra users
 * - Valores monetários como numeric(15, 2) — Drizzle retorna como string (BRL)
 * - Datas/timestamps em UTC
 */

import {
  pgTable,
  text,
  uuid,
  numeric,
  integer,
  date,
  timestamp,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* =========================================
   ENUMS
   ========================================= */

export const userRoleEnum = pgEnum("user_role", [
  "corretor",
  "imobiliaria",
  "construtora",
  "admin",
  "fundo",
  "comercial",
]);

export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "pendente",
  "documentos_enviados",
  "aprovado",
  "recusado",
]);

/**
 * Fluxo de status:
 * rascunho → aguardando_aprovacao → (admin)
 *   ├→ documentos_incompletos (admin pediu correção; volta após reenvio)
 *   ├→ pre_aprovada (aguarda construtora — sistema notifica)
 *   │   └→ analise_final (construtora deu OK; admin decide final)
 *   │       └→ enviada_para_assinatura (ZapSign)
 *   │           └→ enviada_para_pagamento
 *   │               └→ realizada
 *   ├→ recusada
 *   └→ cancelada
 */
export const operacaoStatusEnum = pgEnum("operacao_status", [
  "rascunho",
  "aguardando_aprovacao",
  "documentos_incompletos",
  "pre_aprovada",
  "analise_final",
  "recusada",
  "enviada_para_assinatura",
  "enviada_para_pagamento",
  "realizada",
  "cancelada",
]);

export const parcelaStatusEnum = pgEnum("parcela_status", [
  "a_vencer",
  "vencida",
  "paga",
  "cancelada",
]);

export const contratoStatusEnum = pgEnum("contrato_status", [
  "gerado",
  "enviado_assinatura",
  "parcialmente_assinado",
  "totalmente_assinado",
  "cancelado",
]);

export const documentoTipoEnum = pgEnum("documento_tipo", [
  "contrato_social",
  "comprovante_endereco",
  "cartao_cnpj",
  "rg",
  "cpf",
  "creci",
  "contrato_venda",
  "contrato_comissao",
  "nota_fiscal",
  "comprovante_entrada",
  "outro",
]);

/* =========================================
   USERS — espelha Clerk + papel
   ========================================= */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // Clerk userId
    email: text("email").notNull(),
    nome: text("nome"),
    telefone: text("telefone"),
    role: userRoleEnum("role").notNull().default("corretor"),
    /** Perfil de admin (só preenchido quando role='admin'):
     *  - 'super'      → tudo + gerencia outros admins
     *  - 'financeiro' → Interno (Invoice), Fundos, Relatórios, Comerciais
     *  - 'operacoes'  → Operações, Construtoras, Cadastrar, Convites
     *  - 'suporte'    → Tickets, Mural, Daily, Usuários (read)
     *
     *  null = comportamento legado (admins antigos = super). */
    adminProfile: text("admin_profile"),
    onboardingStatus: onboardingStatusEnum("onboarding_status")
      .notNull()
      .default("pendente"),
    /** Tours de onboarding já completados (por role). Mapa
     *  { "comercial": "2026-05-18T12:00Z", "fundo": "...", ... }
     *  Quando user pula ou conclui, marca a data aqui. Null = nunca abriu.
     *  Usado pra auto-trigger do tutorial no primeiro acesso. */
    tutorialsCompleted: jsonb("tutorials_completed").$type<
      Record<string, string>
    >(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

/* =========================================
   IMOBILIÁRIAS — empresa do corretor PJ
   ========================================= */

export const imobiliarias = pgTable(
  "imobiliarias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Comercial responsável pelo cadastro/relacionamento. */
    comercialId: uuid("comercial_id"),
    razaoSocial: text("razao_social").notNull(),
    nomeFantasia: text("nome_fantasia"),
    cnpj: text("cnpj").notNull(),
    creciResponsavel: text("creci_responsavel"),
    telefone: text("telefone"),
    cep: text("cep"),
    endereco: text("endereco"),
    cidade: text("cidade"),
    uf: text("uf"),
    // Dados bancários — usados na cláusula 3ª do contrato de cessão
    bancoNome: text("banco_nome"),
    bancoCodigo: text("banco_codigo"),
    bancoAgencia: text("banco_agencia"),
    bancoConta: text("banco_conta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("imobiliarias_cnpj_idx").on(t.cnpj)],
);

/* =========================================
   CONSTRUTORAS
   ========================================= */

export const construtoras = pgTable(
  "construtoras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }), // null se foi cadastrada por um corretor durante operação
    registeredByUserId: text("registered_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Comercial responsável pelo cadastro/relacionamento. */
    comercialId: uuid("comercial_id"),
    razaoSocial: text("razao_social").notNull(),
    nomeFantasia: text("nome_fantasia"),
    cnpj: text("cnpj").notNull(),
    telefone: text("telefone"),
    email: text("email"),
    cep: text("cep"),
    endereco: text("endereco"),
    cidade: text("cidade"),
    uf: text("uf"),
    onboardingStatus: onboardingStatusEnum("onboarding_status")
      .notNull()
      .default("pendente"),
    /** Fundo fidelizado: quando setado, todas as operações dessa construtora
     *  saem automaticamente vinculadas a esse fundo (e usam a taxa-base dele).
     *  Setado pelo admin na edição da construtora. */
    fundoFidelizadoId: uuid("fundo_fidelizado_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("construtoras_cnpj_idx").on(t.cnpj),
    index("construtoras_owner_idx").on(t.ownerUserId),
    index("construtoras_fundo_fidelizado_idx").on(t.fundoFidelizadoId),
  ],
);

/* =========================================
   COMERCIAIS — equipe comercial (interna ou parceira).
   Pode ser PF ou PJ. Tem login próprio.
   ========================================= */

export const tipoPessoaEnum = pgEnum("tipo_pessoa", ["fisica", "juridica"]);

export const comerciais = pgTable(
  "comerciais",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** User Clerk vinculado. NULL se ainda não foi aceito o convite. */
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    tipoPessoa: tipoPessoaEnum("tipo_pessoa").notNull(),
    /** Nome completo (PF) ou razão social (PJ). */
    nomeCompleto: text("nome_completo").notNull(),
    /** Apelido (PF) ou nome fantasia (PJ). */
    apelido: text("apelido"),
    /** CPF se PF, CNPJ se PJ. Sem máscara. */
    documento: text("documento").notNull(),
    cep: text("cep"),
    endereco: text("endereco"),
    cidade: text("cidade"),
    uf: text("uf"),
    email: text("email").notNull(),
    /** Telefone com WhatsApp. */
    telefone: text("telefone"),
    /** Se o comercial trabalha exclusivamente pra um fundo específico,
     *  esse campo guarda o fundo dono. NULL = comercial generalista
     *  (atende qualquer fundo). FK validada em runtime. Quando vinculado,
     *  o fundo vê o desempenho dele no painel próprio. */
    fundoId: uuid("fundo_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("comerciais_documento_idx").on(t.documento),
    index("comerciais_owner_idx").on(t.ownerUserId),
    index("comerciais_email_idx").on(t.email),
    index("comerciais_fundo_idx").on(t.fundoId),
  ],
);

export type Comercial = typeof comerciais.$inferSelect;

/* =========================================
   FUNDOS — investidores que aportam pra antecipar comissões.
   Cada fundo tem taxa-base própria, contrato próprio e responsável.
   Operações são vinculadas a um fundo escolhido na criação/aprovação.
   ========================================= */

export const fundos = pgTable(
  "fundos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** User Clerk vinculado (login do fundo). NULL se ainda não foi aceito. */
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    razaoSocial: text("razao_social").notNull(),
    nomeFantasia: text("nome_fantasia"),
    cnpj: text("cnpj").notNull(),
    cep: text("cep"),
    endereco: text("endereco"),
    cidade: text("cidade"),
    uf: text("uf"),
    /** Nome do contato responsável (pessoa física que assina/responde). */
    contatoResponsavel: text("contato_responsavel"),
    /** Telefone de WhatsApp do responsável. */
    telefone: text("telefone"),
    emailComercial: text("email_comercial"),
    /** Email pra envio do contrato pra assinatura digital. */
    emailAssinatura: text("email_assinatura"),
    /** URL do contrato modelo (Vercel Blob). Cada operação usa o contrato do fundo. */
    contratoUrl: text("contrato_url"),
    contratoNome: text("contrato_nome"),
    /** Sistema de assinatura digital usado pelo fundo. Quando null/true em
     *  assinaturaUsaPadrao, AQ usa ZapSign (padrão da plataforma). Quando
     *  o fundo tem o próprio (D4Sign, Clicksign, AutentiQue, etc), informa
     *  abaixo e o sistema chama essa API em vez do ZapSign na hora de
     *  enviar contrato pra assinatura. */
    assinaturaUsaPadrao: boolean("assinatura_usa_padrao")
      .notNull()
      .default(true),
    assinaturaSistema: text("assinatura_sistema"),
    assinaturaApiUrl: text("assinatura_api_url"),
    /** Credenciais em jsonb (api_key, client_id+secret, etc). */
    assinaturaApiCredenciais: jsonb("assinatura_api_credenciais"),
    /** Taxa de juros base do fundo (mensal, decimal — 0.06 = 6%). É o
     *  "custo do dinheiro" do fundo (taxa_fundo). Pode ser sobrescrita por
     *  operação na aprovação admin. */
    taxaMensalBase: numeric("taxa_mensal_base", { precision: 6, scale: 4 })
      .notNull()
      .default("0.0600"),
    /** "Valor da operação" padrão desse fundo (taxa_op mensal cobrada do
     *  cliente, decimal — 0.06 = 6%). Default sugerido ao criar operações
     *  desse fundo. O custo do dinheiro (taxaMensalBase) é o piso; o spread
     *  entre os dois é a margem dividida entre fundo e Antecipaqui. */
    taxaOperacaoPadrao: numeric("taxa_operacao_padrao", { precision: 6, scale: 4 })
      .notNull()
      .default("0.0600"),
    /** Custo financeiro / % de rateio — fatia do juros que vai pra
     *  Antecipaqui em cada operação desse fundo. Decimal 0–1 (ex 0.40 = 40%).
     *  Usado no relatório de invoice interno. */
    custoFinanceiroPct: numeric("custo_financeiro_pct", { precision: 6, scale: 4 })
      .notNull()
      .default("0.0000"),
    /** % de impostos que o fundo paga sobre os juros recebidos (PIS/COFINS/IR
     *  etc.). Decimal 0–1 (ex 0.045 = 4,5%). Descontado antes de aplicar
     *  o rateio. */
    impostosPct: numeric("impostos_pct", { precision: 6, scale: 4 })
      .notNull()
      .default("0.0000"),
    /* === Dados bancários — pra recebimento de pagamentos de duplicatas === */
    bancoNome: text("banco_nome"),
    /** Código do banco (3 dígitos: 001 BB, 341 Itaú, etc.) */
    bancoCodigo: text("banco_codigo"),
    bancoAgencia: text("banco_agencia"),
    bancoConta: text("banco_conta"),
    bancoPix: text("banco_pix"),
    /* === Banco emissor de boletos (pode ser diferente do banco principal) === */
    boletosBancoNome: text("boletos_banco_nome"),
    /** URL da API que gera os boletos. (legado — usar cobrancaApiUrl) */
    boletosApiUrl: text("boletos_api_url"),
    /* === Encargos de atraso === */
    /** Multa por atraso aplicada UMA vez quando a parcela vence (decimal 0–1).
     *  Default 2% (mercado). */
    multaAtrasoPct: numeric("multa_atraso_pct", { precision: 6, scale: 4 })
      .notNull()
      .default("0.02"),
    /** Juros de mora mensais (decimal 0–1). Cobrados pro rata die a partir do
     *  vencimento. Default 1%/mês (mercado). */
    jurosMoraMensalPct: numeric("juros_mora_mensal_pct", {
      precision: 6,
      scale: 4,
    })
      .notNull()
      .default("0.01"),
    /* === Modo de cobrança === */
    /** Como esse fundo emite e baixa boletos:
     *  - 'manual': admin marca pago no banco (default — fundo ainda não configurado)
     *  - 'api':    sistema chama API do banco pra emitir e recebe webhook pra baixar
     *  - 'cnab':   sistema gera arquivo de remessa; admin importa retorno em lote
     */
    boletosModo: text("boletos_modo").notNull().default("manual"),
    /* --- API mode --- */
    cobrancaApiUrl: text("cobranca_api_url"),
    /** Tipo de auth: 'api_key' | 'oauth' | 'basic' */
    cobrancaApiAuthTipo: text("cobranca_api_auth_tipo"),
    /** Credenciais em jsonb. Idealmente cifradas — pra MVP guardamos plain
     *  e o admin é quem cadastra. Estrutura depende do auth_tipo. */
    cobrancaApiCredenciais: jsonb("cobranca_api_credenciais"),
    /** Segredo compartilhado pra HMAC do webhook de retorno. */
    cobrancaWebhookSecret: text("cobranca_webhook_secret"),
    /* --- CNAB mode --- */
    /** '240' | '400' (FEBRABAN). MVP suporta só 240. */
    cnabLayout: text("cnab_layout"),
    /** Código do banco emissor (3 dígitos). Pode reaproveitar bancoCodigo. */
    cnabBancoCodigo: text("cnab_banco_codigo"),
    cnabCarteira: text("cnab_carteira"),
    cnabConvenio: text("cnab_convenio"),
    cnabCedenteCodigo: text("cnab_cedente_codigo"),
    /** Próximo "nosso número" disponível pra emitir boletos. Auto-incrementa. */
    cnabProximoNossoNumero: integer("cnab_proximo_nosso_numero")
      .notNull()
      .default(1),
    /* === Sistema de gestão (CRM/ERP) — pra integração de operações === */
    sistemaGestaoNome: text("sistema_gestao_nome"),
    /** URL da documentação da API do sistema de gestão. */
    sistemaGestaoDocsUrl: text("sistema_gestao_docs_url"),
    /* === Modo operacional do fundo (cada fundo opera diferente) ===
     *  A operação SEMPRE nasce no Antecipaqui. O que varia por fundo é quem
     *  cuida de cada etapa depois disso. */
    /** Quem GERA o contrato da operação: 'antecipa' (padrão) ou 'fundo'. */
    contratoGeradoPor: text("contrato_gerado_por").notNull().default("antecipa"),
    /** Quem ENVIA o contrato pra assinatura: 'antecipa' (padrão) ou 'fundo'. */
    contratoAssinaturaEnviadaPor: text("contrato_assinatura_enviada_por")
      .notNull()
      .default("antecipa"),
    /** Antecipaqui SEMPRE assina como testemunha (regra de negócio fixa).
     *  Mantido como flag pra ficar explícito no cadastro; sempre true. */
    antecipaAssinaTestemunha: boolean("antecipa_assina_testemunha")
      .notNull()
      .default(true),
    /** Quando o FUNDO envia pra assinatura, ele nos chama de volta neste
     *  webhook ao concluir. Segredo HMAC compartilhado pra validar o retorno.
     *  Endpoint: /api/contrato-assinatura/webhook/{fundoId}. */
    contratoAssinaturaWebhookSecret: text("contrato_assinatura_webhook_secret"),
    /** Quem GERA as cobranças (boletos/parcelas): 'antecipa' (padrão) ou
     *  'fundo'. Quando 'fundo', o COMO o fundo nos repassa segue boletosModo
     *  (api/cnab/manual). */
    cobrancaGeradaPor: text("cobranca_gerada_por").notNull().default("antecipa"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("fundos_cnpj_idx").on(t.cnpj),
    index("fundos_owner_idx").on(t.ownerUserId),
  ],
);

export type Fundo = typeof fundos.$inferSelect;

/** Templates de operação cadastrados pelo corretor pra agilizar o cadastro.
 *  Salva configuração padrão (nº parcelas, % comissão padrão, tipo pagador)
 *  por construtora — quando ele seleciona a mesma construtora de novo,
 *  oferece "Aplicar template" no form. Linkado ao user (corretor) E à
 *  construtora — cada par tem seus próprios templates. */
export const corretorOperacaoTemplates = pgTable(
  "corretor_operacao_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    corretorUserId: text("corretor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    construtoraId: uuid("construtora_id")
      .notNull()
      .references(() => construtoras.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    /** Config jsonb: { numeroParcelas, percentualComissao, pagadorTipo, ... } */
    config: jsonb("config").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("corretor_templates_user_idx").on(t.corretorUserId, t.construtoraId),
  ],
);

export type CorretorOperacaoTemplate =
  typeof corretorOperacaoTemplates.$inferSelect;

/** Tokens públicos pra coleta de dados do comprador. Corretor gera um
 *  token + link/QR e envia pro comprador, que abre uma página pública,
 *  preenche os dados dele e submete. Os dados ficam pendentes até o corretor
 *  aceitar e incorporar à operação. Token tem expiração curta (24h). */
export const compradorColetaTokens = pgTable(
  "comprador_coleta_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull(),
    corretorUserId: text("corretor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Operação opcional — pode ser pré-cadastro */
    operacaoId: uuid("operacao_id"),
    construtoraId: uuid("construtora_id").references(() => construtoras.id, {
      onDelete: "set null",
    }),
    /** Quando o comprador submeteu os dados (NULL = ainda não preencheu). */
    preenchidoEm: timestamp("preenchido_em", { withTimezone: true }),
    /** Payload do comprador (mesmos campos de operacao_compradores). */
    dadosColetados: jsonb("dados_coletados"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("comprador_coleta_token_unique").on(t.token),
    index("comprador_coleta_corretor_idx").on(t.corretorUserId, t.preenchidoEm),
  ],
);

export type CompradorColetaToken =
  typeof compradorColetaTokens.$inferSelect;

/** Membros da equipe de uma construtora. Cada construtora tem 1 owner
 *  principal (construtoras.ownerUserId) e pode convidar colegas como
 *  membros adicionais com roles internas (financeiro/comercial/juridico/
 *  outro). Permissões finas por role serão aplicadas nas actions/queries
 *  conforme a feature for usada — hoje todos veem tudo da construtora. */
export const construtoraMembros = pgTable(
  "construtora_membros",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    construtoraId: uuid("construtora_id")
      .notNull()
      .references(() => construtoras.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 'owner' | 'financeiro' | 'comercial' | 'juridico' | 'outro' */
    roleInterna: text("role_interna").notNull().default("outro"),
    convidadoPorUserId: text("convidado_por_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Marcado quando o convite foi aceito (user fez login). */
    aceitoEm: timestamp("aceito_em", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("construtora_membros_unique").on(t.construtoraId, t.userId),
    index("construtora_membros_user_idx").on(t.userId),
  ],
);

export type ConstrutoraMembro = typeof construtoraMembros.$inferSelect;

/** Notas internas sobre uma operação. Visíveis APENAS pra admin e comercial
 *  (NUNCA pra corretor/imobiliária, construtora ou fundo). Usado pra
 *  observações operacionais ("cliente difícil", "ja recusou no fundo X",
 *  "atrasou parcela na op Y do mês passado"). */
export const operacaoNotasInternas = pgTable(
  "operacao_notas_internas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operacaoId: uuid("operacao_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    autorRole: text("autor_role").notNull(),
    body: text("body").notNull(),
    flag: text("flag"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("op_notas_op_idx").on(t.operacaoId, t.createdAt)],
);

export type OperacaoNotaInterna = typeof operacaoNotasInternas.$inferSelect;

/** Histórico de score da construtora ao longo do tempo. Cada mudança gera
 *  uma row pra permitir gráfico de evolução. */
export const construtoraScoreHistorico = pgTable(
  "construtora_score_historico",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    construtoraId: uuid("construtora_id")
      .notNull()
      .references(() => construtoras.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    restricoes: integer("restricoes").notNull().default(0),
    alteracaoTipo: text("alteracao_tipo").notNull().default("sistema"),
    alteracaoMotivo: text("alteracao_motivo"),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("score_hist_construtora_idx").on(t.construtoraId, t.snapshotAt),
  ],
);

export type ConstrutoraScoreHistoricoRow =
  typeof construtoraScoreHistorico.$inferSelect;

/** Webhooks de notificação pra sistemas externos. Owner pode ser admin ou
 *  fundo. Eventos: op_status_change, parcela_paga, fundo_decisao,
 *  antecipacao_decisao, renegociacao_decisao. */
export const webhooksSubscriptions = pgTable(
  "webhooks_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    targetUrl: text("target_url").notNull(),
    secret: text("secret").notNull(),
    eventos: jsonb("eventos").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerRole: text("owner_role").notNull(),
    fundoId: uuid("fundo_id").references(() => fundos.id, {
      onDelete: "cascade",
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),
    lastDeliveryStatus: text("last_delivery_status"),
  },
  (t) => [
    index("webhooks_owner_idx").on(t.ownerUserId),
    index("webhooks_fundo_idx").on(t.fundoId, t.isActive),
  ],
);

export type WebhookSubscription =
  typeof webhooksSubscriptions.$inferSelect;

/** Fila de eventos a entregar. Idempotente — uma row por evento×subscription. */
export const webhooksEventos = pgTable(
  "webhooks_eventos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => webhooksSubscriptions.id, { onDelete: "cascade" }),
    evento: text("evento").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("pendente"),
    tentativas: integer("tentativas").notNull().default(0),
    ultimoErro: text("ultimo_erro"),
    proximaTentativaEm: timestamp("proxima_tentativa_em", {
      withTimezone: true,
    }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("webhooks_eventos_status_idx").on(
      t.status,
      t.proximaTentativaEm,
    ),
    index("webhooks_eventos_sub_idx").on(t.subscriptionId),
  ],
);

export type WebhookEvento = typeof webhooksEventos.$inferSelect;

/** Cache de consultas de análise de crédito.
 *  Provedor externo (Serasa, Boa Vista, etc) retorna score + restrições.
 *  Cacheamos por documento (CPF ou CNPJ) com TTL de 30 dias pra evitar
 *  re-consulta cara. */
export const consultasCredito = pgTable(
  "consultas_credito",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Documento consultado (só dígitos, CPF 11 ou CNPJ 14). */
    documento: text("documento").notNull(),
    tipoPessoa: text("tipo_pessoa").notNull(), // 'pf' | 'pj'
    /** Provedor consultado ('serasa', 'boavista', 'stub'). */
    provedor: text("provedor").notNull(),
    /** Score 0-1000 retornado pelo provedor. */
    score: integer("score").notNull(),
    /** 'baixo' | 'medio' | 'alto' | 'critico' — derivado do score. */
    risco: text("risco").notNull(),
    /** Restrições/apontamentos (SCPC, protestos, ações). Total. */
    restricoes: integer("restricoes").notNull().default(0),
    /** Payload bruto retornado pelo provedor (debug/auditoria). */
    payload: jsonb("payload"),
    /** Quem solicitou a consulta (admin/fundo). */
    solicitadoPorUserId: text("solicitado_por_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    /** Operação vinculada (opcional, pra contexto). */
    operacaoId: uuid("operacao_id"),
    consultadoEm: timestamp("consultado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("consultas_credito_doc_idx").on(t.documento, t.consultadoEm),
    index("consultas_credito_op_idx").on(t.operacaoId),
  ],
);

export type ConsultaCredito = typeof consultasCredito.$inferSelect;

/** Empreendimentos da construtora (torres/condomínios/projetos). Operações
 *  podem ser linkadas opcionalmente a um empreendimento, permitindo relatório
 *  agregado por projeto + filtro nas listagens. */
export const empreendimentos = pgTable(
  "empreendimentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    construtoraId: uuid("construtora_id")
      .notNull()
      .references(() => construtoras.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    cidade: text("cidade"),
    uf: text("uf"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("empreendimentos_construtora_idx").on(t.construtoraId, t.isActive),
  ],
);

export type Empreendimento = typeof empreendimentos.$inferSelect;

/** Solicitações de antecipação de pagamento da construtora. A construtora
 *  pede pra quitar antes do vencimento aceitando um desconto (deságio
 *  inverso). Admin/fundo aprova ou recusa. */
export const parcelaAntecipacoes = pgTable(
  "parcela_antecipacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parcelaId: uuid("parcela_id")
      .notNull()
      .references(() => parcelasComissao.id, { onDelete: "cascade" }),
    solicitadoPorUserId: text("solicitado_por_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    valorOriginal: numeric("valor_original", { precision: 15, scale: 2 })
      .notNull(),
    valorAntecipado: numeric("valor_antecipado", {
      precision: 15,
      scale: 2,
    }).notNull(),
    descontoPct: numeric("desconto_pct", { precision: 6, scale: 4 }).notNull(),
    dataPretendida: date("data_pretendida").notNull(),
    /** pendente | aprovada | recusada | quitada */
    status: text("status").notNull().default("pendente"),
    motivoRecusa: text("motivo_recusa"),
    decidoPorUserId: text("decido_por_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidoEm: timestamp("decido_em", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("parcela_antecipacoes_parcela_idx").on(t.parcelaId),
    index("parcela_antecipacoes_status_idx").on(t.status),
  ],
);

export type ParcelaAntecipacao = typeof parcelaAntecipacoes.$inferSelect;

/** Solicitações de renegociação de parcela. Construtora pede prorrogação
 *  (novo vencimento) ou parcelamento (split em N). Admin/fundo decide. */
export const parcelaRenegociacoes = pgTable(
  "parcela_renegociacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parcelaId: uuid("parcela_id")
      .notNull()
      .references(() => parcelasComissao.id, { onDelete: "cascade" }),
    solicitadoPorUserId: text("solicitado_por_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    motivo: text("motivo").notNull(),
    /** "prorrogar" → muda só o vencimento. "dividir" → split em N parcelas
     *  novas (jsonb com [{vencimento, valor}]). */
    tipo: text("tipo").notNull(),
    novoVencimento: date("novo_vencimento"),
    /** Array de splits: [{ vencimento: "2026-06-15", valor: 1500.00 }] */
    splitParcelas: jsonb("split_parcelas"),
    /** pendente | aprovada | recusada | aplicada */
    status: text("status").notNull().default("pendente"),
    motivoRecusa: text("motivo_recusa"),
    decidoPorUserId: text("decido_por_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidoEm: timestamp("decido_em", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("parcela_renegociacoes_parcela_idx").on(t.parcelaId),
    index("parcela_renegociacoes_status_idx").on(t.status),
  ],
);

export type ParcelaRenegociacao = typeof parcelaRenegociacoes.$inferSelect;

/** Pedidos de documento feitos pelo admin/fundo à construtora ou cedente.
 *  Exibido como to-do na home do destinatário. Atendido quando a outra
 *  parte anexa o doc solicitado. */
export const documentoSolicitacoes = pgTable(
  "documento_solicitacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Quem deve atender — construtora ou user específico */
    destConstrutoraId: uuid("dest_construtora_id").references(
      () => construtoras.id,
      { onDelete: "cascade" },
    ),
    destUserId: text("dest_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    /** Op opcional pra dar contexto */
    operacaoId: uuid("operacao_id"),
    tipoDocumento: text("tipo_documento").notNull(),
    mensagem: text("mensagem").notNull(),
    solicitadoPorUserId: text("solicitado_por_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** pendente | atendida | cancelada */
    status: text("status").notNull().default("pendente"),
    atendidaEm: timestamp("atendida_em", { withTimezone: true }),
    documentoIdAnexado: uuid("documento_id_anexado"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("doc_solic_dest_construtora_idx").on(t.destConstrutoraId, t.status),
    index("doc_solic_dest_user_idx").on(t.destUserId, t.status),
    index("doc_solic_op_idx").on(t.operacaoId),
  ],
);

export type DocumentoSolicitacao = typeof documentoSolicitacoes.$inferSelect;

/** Custos padrão cadastrados por fundo. Quando admin seleciona o fundo numa
 *  operação, esses custos são clonados pra custos_operacao (e o admin pode
 *  ajustar/adicionar). Cada linha = um custo nominal (ex: "Análise jurídica
 *  R$ 150,00"). */
export const fundoCustosPadrao = pgTable(
  "fundo_custos_padrao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundoId: uuid("fundo_id")
      .notNull()
      .references(() => fundos.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
    ordem: integer("ordem").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("fundo_custos_padrao_fundo_idx").on(t.fundoId, t.ordem)],
);

export type FundoCustoPadrao = typeof fundoCustosPadrao.$inferSelect;

/* =========================================
   DOCUMENTOS GERAIS — KYC + operação
   ========================================= */

export const documentos = pgTable(
  "documentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: documentoTipoEnum("tipo").notNull(),
    url: text("url").notNull(),
    nomeOriginal: text("nome_original").notNull(),
    sizeBytes: integer("size_bytes"),
    mimeType: text("mime_type"),
    // Owner pointers (só um deles preenchido, dependendo do contexto)
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    imobiliariaId: uuid("imobiliaria_id").references(() => imobiliarias.id, {
      onDelete: "cascade",
    }),
    construtoraId: uuid("construtora_id").references(() => construtoras.id, {
      onDelete: "cascade",
    }),
    operacaoId: uuid("operacao_id"),
    /** Resultado da validação por IA do conteúdo do arquivo no upload.
     *  - 'ok'      : conteúdo bate com o tipo, alta confiança
     *  - 'revisao' : conteúdo bate mas confiança baixa (admin revisa)
     *  NULL = upload anterior à validação por IA. */
    validacaoStatus: text("validacao_status"),
    /** Decimal 0–1 retornado pelo Claude (confiança da classificação). */
    validacaoConfianca: numeric("validacao_confianca", {
      precision: 3,
      scale: 2,
    }),
    /** Justificativa textual do Claude (mostra ao admin se revisão). */
    validacaoMotivo: text("validacao_motivo"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("documentos_user_idx").on(t.userId),
    index("documentos_operacao_idx").on(t.operacaoId),
    index("documentos_validacao_idx").on(t.validacaoStatus),
  ],
);

/* =========================================
   OPERAÇÕES (centro do sistema)
   ========================================= */

export const operacoes = pgTable(
  "operacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    numero: text("numero").notNull(), // ex: OP-2026-0001
    corretorUserId: text("corretor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    imobiliariaId: uuid("imobiliaria_id").references(() => imobiliarias.id, {
      onDelete: "set null",
    }),
    construtoraId: uuid("construtora_id")
      .notNull()
      .references(() => construtoras.id, { onDelete: "restrict" }),
    /** Empreendimento opcional pra agrupar ops por torre/projeto. Sem FK
     *  forte pra evitar criar dependência cíclica com a definição do schema —
     *  ID é validado em runtime. */
    empreendimentoId: uuid("empreendimento_id"),
    /** Fundo que vai aportar a antecipação. NULL pra operações antigas
     *  (criadas antes do conceito de fundo) — admin escolhe na aprovação. */
    fundoId: uuid("fundo_id").references(() => fundos.id, {
      onDelete: "set null",
    }),
    /** Comercial responsável pela operação (recebe ~10% do lucro líquido).
     *  Default: comercial "Antecipaqui" criado por seed. */
    comercialId: uuid("comercial_id").references(() => comerciais.id, {
      onDelete: "set null",
    }),
    // Dados financeiros
    valorVenda: numeric("valor_venda", { precision: 15, scale: 2 }).notNull(),
    valorComissao: numeric("valor_comissao", { precision: 15, scale: 2 }).notNull(),
    /** Valor da entrada paga pelo comprador. Documento de comprovante
     *  fica em `documentos` com tipo='comprovante_entrada'. */
    valorEntrada: numeric("valor_entrada", { precision: 15, scale: 2 }),
    dataVenda: date("data_venda").notNull(),
    numeroParcelas: integer("numero_parcelas").notNull(),
    taxaMensal: numeric("taxa_mensal", { precision: 6, scale: 4 })
      .notNull()
      .default("0.0600"),
    /** Snapshot da taxa mensal do fundo no momento da aprovação. Congela o
     *  custo de capital pra que mudanças futuras em fundos.taxa_mensal_base
     *  não distorçam o histórico financeiro. NULL = usar f.taxa_mensal_base
     *  como fallback (ops legadas pré-snapshot). */
    taxaFundoSnapshot: numeric("taxa_fundo_snapshot", {
      precision: 6,
      scale: 4,
    }),
    valorPresente: numeric("valor_presente", { precision: 15, scale: 2 }).notNull(),
    desagio: numeric("desagio", { precision: 15, scale: 2 }).notNull(),
    // Estado
    status: operacaoStatusEnum("status").notNull().default("rascunho"),
    motivoRecusa: text("motivo_recusa"),
    motivoPendencia: text("motivo_pendencia"),
    aprovadoPorUserId: text("aprovado_por_user_id").references(() => users.id),
    aprovadoEm: timestamp("aprovado_em", { withTimezone: true }),
    liquidadoEm: timestamp("liquidado_em", { withTimezone: true }),
    // Cashback pra construtora — decidido pelo admin na aprovação final.
    // Valor é congelado quando concedido. Visível só pra construtora + admin.
    cashbackPercent: numeric("cashback_percent", { precision: 5, scale: 4 }),
    cashbackValor: numeric("cashback_valor", { precision: 14, scale: 2 }),
    /** Marcado quando admin finaliza um ticket de saque que incluía esta op */
    cashbackSacadoEm: timestamp("cashback_sacado_em", { withTimezone: true }),
    /** Ticket que registrou o saque (audit + valor pago + data) */
    cashbackSacadoTicketId: uuid("cashback_sacado_ticket_id"),
    /** Quem é o "fiel devedor" (sacado) das parcelas — vai pra contrato e
     *  boletos. Construtora continua sempre presente como responsável.
     *  - 'construtora' (default) → boleto sai no nome da construtora
     *  - 'compradores' → boleto sai com vários sacados (lista em
     *    operacao_compradores). */
    pagadorTipo: text("pagador_tipo").notNull().default("construtora"),
    /** Decisão do FUNDO (camada paralela ao status admin).
     *  - 'pendente' / 'aprovada' / 'recusada' / NULL */
    fundoAprovacao: text("fundo_aprovacao"),
    fundoAprovadoEm: timestamp("fundo_aprovado_em", { withTimezone: true }),
    fundoAprovadoPorUserId: text("fundo_aprovado_por_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    fundoRecusaMotivo: text("fundo_recusa_motivo"),
    fundoRegraAutoId: uuid("fundo_regra_auto_id"),
    /** Assinatura interna da construtora (responsável pelas comissões).
     *  Independente do ZapSign (que é assinatura do cedente no contrato).
     *  Construtora confirma que reconhece o débito e se compromete a pagar
     *  as parcelas. Bloqueia op de avançar pra realizada se não assinada. */
    construtoraAssinadaEm: timestamp("construtora_assinada_em", {
      withTimezone: true,
    }),
    construtoraAssinadaPorUserId: text("construtora_assinada_por_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    /** IP capturado no momento da assinatura — registro legal best-effort. */
    construtoraAssinaturaIp: text("construtora_assinatura_ip"),
    construtoraRecusouAssinaturaEm: timestamp(
      "construtora_recusou_assinatura_em",
      { withTimezone: true },
    ),
    construtoraRecusaAssinaturaMotivo: text("construtora_recusa_assinatura_motivo"),
    /** Corretor atendente (membro da imob) responsável pelo atendimento que
     *  gerou essa op. Separado de corretor_user_id (cedente). Quando NULL,
     *  o atendente é o próprio cedente. Usado pra filtrar relatórios e ops
     *  visíveis no painel de cada corretor membro. */
    corretorAtendenteUserId: text("corretor_atendente_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("operacoes_numero_idx").on(t.numero),
    index("operacoes_corretor_idx").on(t.corretorUserId),
    index("operacoes_construtora_idx").on(t.construtoraId),
    index("operacoes_fundo_idx").on(t.fundoId),
    index("operacoes_status_idx").on(t.status),
  ],
);

/* =========================================
   PARCELAS DA COMISSÃO (cronograma de pagamento da construtora)
   ========================================= */

export const parcelasComissao = pgTable(
  "parcelas_comissao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operacaoId: uuid("operacao_id")
      .notNull()
      .references(() => operacoes.id, { onDelete: "cascade" }),
    numero: integer("numero").notNull(), // 1, 2, 3...
    valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
    vencimento: date("vencimento").notNull(),
    status: parcelaStatusEnum("status").notNull().default("a_vencer"),
    pagoEm: date("pago_em"),
    pagoValor: numeric("pago_valor", { precision: 15, scale: 2 }),
    /** Quando o lembrete de pré-vencimento foi enviado (NULL = não enviado). */
    cobrancaPreVencimentoEm: timestamp("cobranca_pre_vencimento_em", {
      withTimezone: true,
    }),
    /** Quando o lembrete de atraso foi enviado (NULL = não enviado). */
    cobrancaAtrasoEm: timestamp("cobranca_atraso_em", {
      withTimezone: true,
    }),
    /* === Boleto / cobrança === */
    /** Valor atualizado com multa + juros (cache; recalculado sob demanda).
     *  Se NULL ou desatualizado, recalcular via lib/cobranca-calculo.ts. */
    valorAtualizado: numeric("valor_atualizado", { precision: 15, scale: 2 }),
    valorAtualizadoEm: timestamp("valor_atualizado_em", { withTimezone: true }),
    /** Linha digitável do boleto emitido. */
    linhaDigitavel: text("linha_digitavel"),
    /** URL do PDF do boleto (Vercel Blob ou link do banco). */
    boletoUrl: text("boleto_url"),
    /** Identificador único da cobrança no sistema do banco (API retornou,
     *  CNAB usa nosso_numero). */
    nossoNumero: text("nosso_numero"),
    cobrancaIntegracaoId: text("cobranca_integracao_id"),
    /** 'pendente' | 'emitida' | 'paga' | 'cancelada' | 'erro' */
    cobrancaStatus: text("cobranca_status").default("pendente"),
    cobrancaErroUltimo: text("cobranca_erro_ultimo"),
    cobrancaUltimaTentativaEm: timestamp("cobranca_ultima_tentativa_em", {
      withTimezone: true,
    }),
    /** URL do comprovante de pagamento que a construtora anexou. Admin/fundo
     *  vê e confirma pra dar baixa final. */
    comprovanteUrl: text("comprovante_url"),
    comprovanteNome: text("comprovante_nome"),
    /** Quando construtora notificou que pagou (mesmo sem baixa confirmada). */
    pagoNotificacaoEm: timestamp("pago_notificacao_em", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("parcelas_operacao_idx").on(t.operacaoId),
    index("parcelas_vencimento_idx").on(t.vencimento),
    index("parcelas_nosso_numero_idx").on(t.nossoNumero),
  ],
);

/* =========================================
   COMPRADORES DA OPERAÇÃO — quando o pagador da comissão é o comprador
   do imóvel (em vez da construtora). Pode haver mais de um (responsabilidade
   solidária — boleto sai com todos como sacados).
   ========================================= */

export const operacaoCompradores = pgTable(
  "operacao_compradores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operacaoId: uuid("operacao_id")
      .notNull()
      .references(() => operacoes.id, { onDelete: "cascade" }),
    /** Ordem de exibição (sequência cadastrada). */
    ordem: integer("ordem").notNull().default(1),
    tipoPessoa: tipoPessoaEnum("tipo_pessoa").notNull(),
    /** Nome completo (PF) ou razão social (PJ). */
    nome: text("nome").notNull(),
    /** CPF (PF) ou CNPJ (PJ). Sem máscara. */
    documento: text("documento").notNull(),
    telefone: text("telefone").notNull(),
    email: text("email").notNull(),
    cep: text("cep"),
    endereco: text("endereco"),
    cidade: text("cidade"),
    uf: text("uf"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("operacao_compradores_op_idx").on(t.operacaoId),
    index("operacao_compradores_doc_idx").on(t.documento),
  ],
);

export type OperacaoComprador = typeof operacaoCompradores.$inferSelect;
export type NewOperacaoComprador = typeof operacaoCompradores.$inferInsert;

/* =========================================
   CUSTOS DA OPERAÇÃO — itens livres (título + valor) cadastrados pelo
   admin/fundo na aprovação final. Cada item é descontado do montante
   recebido pelo cedente. Mostrados detalhados no borderô e agrupados
   nos relatórios.
   ========================================= */

export const custosOperacao = pgTable(
  "custos_operacao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operacaoId: uuid("operacao_id")
      .notNull()
      .references(() => operacoes.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
    /** admin ou fundo que cadastrou. */
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("custos_operacao_op_idx").on(t.operacaoId)],
);

export type CustoOperacao = typeof custosOperacao.$inferSelect;
export type NewCustoOperacao = typeof custosOperacao.$inferInsert;

/* =========================================
   CONTRATOS (gerados após aprovação)
   ========================================= */

export type ContratoSignerRole = "cedente" | "construtora" | "antecipaqui";

export type ContratoSigner = {
  role: ContratoSignerRole;
  zapsignToken: string;
  name: string;
  email: string;
  signUrl: string;
  signedAt: string | null; // ISO string quando assinado
};

export const contratos = pgTable(
  "contratos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operacaoId: uuid("operacao_id")
      .notNull()
      .references(() => operacoes.id, { onDelete: "cascade" }),
    pdfUrl: text("pdf_url"),
    conteudoMd: text("conteudo_md"),
    status: contratoStatusEnum("status").notNull().default("gerado"),
    // ZapSign integration
    zapsignDocumentToken: text("zapsign_document_token"),
    corretorSignedAt: timestamp("corretor_signed_at", { withTimezone: true }),
    construtoraSignedAt: timestamp("construtora_signed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Cada signer (cedente, construtora, antecipaqui) com sign_url + signedAt
    signers: jsonb("signers").$type<ContratoSigner[]>(),
    /** URL do contrato JÁ ASSINADO devolvido por sistema externo do fundo
     *  (quando o fundo é quem envia pra assinatura). Preenchido pelo webhook
     *  /api/contrato-assinatura/webhook/{fundoId}. */
    assinaturaExternaUrl: text("assinatura_externa_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("contratos_operacao_idx").on(t.operacaoId)],
);

/* =========================================
   NOTIFICAÇÕES — todos os níveis
   ========================================= */

export const notificacoes = pgTable(
  "notificacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    operacaoId: uuid("operacao_id").references(() => operacoes.id, {
      onDelete: "cascade",
    }),
    read: boolean("read").notNull().default(false),
    emailSent: boolean("email_sent").notNull().default(false),
    smsSent: boolean("sms_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notificacoes_user_idx").on(t.userId),
    index("notificacoes_unread_idx").on(t.userId, t.read),
    index("notificacoes_created_idx").on(t.createdAt),
  ],
);

/* =========================================
   TICKETS — sistema de suporte
   ========================================= */

export const ticketStatusEnum = pgEnum("ticket_status", [
  "aberto",
  "aguardando_resposta",
  "finalizado",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assunto: text("assunto").notNull(),
    status: ticketStatusEnum("status").notNull().default("aberto"),
    /** Categoria do chat:
     * - "geral" / "cashback" — legado (suporte simples / saque cashback)
     * - "suporte" — fala com admin
     * - "operacoes" / "negociacoes" — fala com fundo da operação
     * - "confirmacao" — fundo fala com construtora
     * - "documentos" — fundo fala com imobiliária / corretor
     */
    categoria: text("categoria").notNull().default("geral"),
    /** Payload livre — usado pra cashback: { valorSolicitado, dadosBancarios } */
    extra: jsonb("extra"),
    /** Quando o chat tem contexto de operação (operacoes/negociacoes/confirmacao/documentos),
     *  fica vinculado a uma operação específica. Routing usa esse campo pra
     *  determinar quem entra no chat (fundo da op, construtora, imobiliária). */
    operacaoId: uuid("operacao_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finalizadoEm: timestamp("finalizado_em", { withTimezone: true }),
    /** Quando admin/dono arquivou o chat. Some das listas padrão; reaparece
     *  com filtro "arquivados". Não bloqueia escrita (admin pode desarquivar). */
    arquivadoEm: timestamp("arquivado_em", { withTimezone: true }),
    /** Última vez que alguém cutucou o chat (rate-limit de nudge). */
    ultimoNudgeEm: timestamp("ultimo_nudge_em", { withTimezone: true }),
  },
  (t) => [
    index("tickets_user_idx").on(t.userId),
    index("tickets_status_idx").on(t.status),
    index("tickets_categoria_idx").on(t.categoria),
    index("tickets_operacao_idx").on(t.operacaoId),
    index("tickets_arquivado_idx").on(t.arquivadoEm),
  ],
);

/** Participantes de um chat (multi-participante). Cada user pode ver e
 *  enviar mensagens. Quando admin troca fundo de uma operação, removemos o
 *  participante do fundo antigo e inserimos o novo (em chats com
 *  categoria=operacoes|negociacoes|confirmacao|documentos vinculados à op). */
export const ticketParticipants = pgTable(
  "ticket_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Role do participante na hora que foi adicionado (snapshot). */
    role: text("role").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Marcado quando o participante "saiu" do chat (ex: fundo trocado). */
    leftAt: timestamp("left_at", { withTimezone: true }),
    /** Última leitura do user — pra calcular badge de não lidas. */
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("ticket_participants_unique").on(t.ticketId, t.userId),
    index("ticket_participants_user_idx").on(t.userId, t.leftAt),
    index("ticket_participants_ticket_idx").on(t.ticketId),
  ],
);

export type TicketParticipant = typeof ticketParticipants.$inferSelect;

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromRole: text("from_role").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Discriminator: "user" (mensagem normal) | "system" (evento — reaberto,
     *  cutucão, arquivado, fundo trocado). System messages renderizam diferente
     *  (centralizadas, sem balão), e fromUserId é o ator que disparou o evento. */
    kind: text("kind").notNull().default("user"),
    /** Anexos da mensagem: array de { url, name, size, type }.
     *  Arquivos ficam em Vercel Blob private. Renderização inline para imagens,
     *  card clicável para PDF/outros. */
    attachments: jsonb("attachments"),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId)],
);

export type Ticket = typeof tickets.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;

/* =========================================
   AUDIT LOG por operação
   ========================================= */

export const operacaoEvents = pgTable(
  "operacao_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operacaoId: uuid("operacao_id")
      .notNull()
      .references(() => operacoes.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(), // ex: created | submitted_for_review | approved | rejected | contract_generated | signed
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("operacao_events_operacao_idx").on(t.operacaoId)],
);

/* =========================================
   AUDIT LOG — ações de TODOS os usuários
   (login, leitura, escrita, transições, etc.)
   ========================================= */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    userRole: text("user_role"),
    userEmail: text("user_email"),
    /** ex: "login" | "view_user" | "view_construtora" | "create_operacao" |
     *  "change_status" | "update_user" | etc. */
    action: text("action").notNull(),
    /** "user" | "construtora" | "operacao" | "ticket" | "mural" | etc. */
    targetType: text("target_type"),
    targetId: text("target_id"),
    /** Label legível pra UI (ex: nome do user, número da operação) */
    targetLabel: text("target_label"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_user_idx").on(t.userId, t.createdAt),
    index("audit_logs_target_idx").on(t.targetType, t.targetId, t.createdAt),
    index("audit_logs_action_idx").on(t.action, t.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;

/* =========================================
   PENDING OPERAÇÕES — lote da construtora
   (aguardando o corretor logar + completar)
   ========================================= */

export const pendingOperacaoStatusEnum = pgEnum("pending_operacao_status", [
  "aguardando_cedente",
  "reivindicada",
  "descartada",
]);

export const pendingOperacoes = pgTable(
  "pending_operacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    construtoraId: uuid("construtora_id")
      .notNull()
      .references(() => construtoras.id, { onDelete: "cascade" }),
    imobiliariaId: uuid("imobiliaria_id").references(() => imobiliarias.id, {
      onDelete: "set null",
    }),
    corretorEmail: text("corretor_email").notNull(),
    corretorNome: text("corretor_nome"),
    corretorCnpj: text("corretor_cnpj"),
    corretorTelefone: text("corretor_telefone"),
    valorVenda: numeric("valor_venda", { precision: 15, scale: 2 }).notNull(),
    valorComissao: numeric("valor_comissao", { precision: 15, scale: 2 })
      .notNull(),
    numeroParcelas: integer("numero_parcelas").notNull(),
    dataPrimeiraParcela: date("data_primeira_parcela").notNull(),
    dataVenda: date("data_venda"),
    observacoes: text("observacoes"),
    status: pendingOperacaoStatusEnum("status")
      .notNull()
      .default("aguardando_cedente"),
    reivindicadoPorUserId: text("reivindicado_por_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    reivindicadoEm: timestamp("reivindicado_em", { withTimezone: true }),
    operacaoId: uuid("operacao_id").references(() => operacoes.id, {
      onDelete: "set null",
    }),
    inviteToken: text("invite_token").notNull().unique(),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** 'construtora' (default) ou 'compradores' — quando vira operação, é
     *  copiado pra operacoes.pagadorTipo. */
    pagadorTipo: text("pagador_tipo").notNull().default("construtora"),
    /** Quando pagadorTipo='compradores', payload com a lista de compradores
     *  (estrutura idêntica a operacao_compradores, sem id/operacaoId).
     *  Copiado pra operacao_compradores quando vira operação. */
    compradores: jsonb("compradores").$type<
      Array<{
        tipoPessoa: "fisica" | "juridica";
        nome: string;
        documento: string;
        telefone: string;
        email: string;
        cep?: string | null;
        endereco?: string | null;
        cidade?: string | null;
        uf?: string | null;
      }>
    >(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pending_construtora_idx").on(t.construtoraId),
    index("pending_email_status_idx").on(t.corretorEmail, t.status),
  ],
);

export type PendingOperacao = typeof pendingOperacoes.$inferSelect;

/* =========================================
   MURAL DE RECADOS (admin → imob/construtora)
   ========================================= */

export const muralAudienceEnum = pgEnum("mural_audience", [
  "imobiliaria",
  "construtora",
  "comercial",
  "both",
]);

export const muralMessages = pgTable(
  "mural_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titulo: text("titulo"),
    body: text("body").notNull(),
    audience: muralAudienceEnum("audience").notNull(),
    active: boolean("active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("mural_audience_idx").on(t.audience, t.active)],
);
export type MuralMessage = typeof muralMessages.$inferSelect;

/* =========================================
   REPOSITÓRIO DE ARQUIVOS — admin sobe arquivos arbitrários
   sobre um usuário ou construtora (anotações internas, contratos,
   correspondências, comprovantes diversos, etc.)
   ========================================= */

export const repositorioFiles = pgTable(
  "repositorio_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Pelo menos um dos dois é preenchido. */
    targetUserId: text("target_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    targetConstrutoraId: uuid("target_construtora_id").references(
      () => construtoras.id,
      { onDelete: "cascade" },
    ),
    /** Quem fez upload (sempre admin). */
    uploadedByUserId: text("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    nomeOriginal: text("nome_original").notNull(),
    descricao: text("descricao"),
    url: text("url").notNull(),
    sizeBytes: integer("size_bytes"),
    mimeType: text("mime_type"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("repositorio_user_idx").on(t.targetUserId),
    index("repositorio_construtora_idx").on(t.targetConstrutoraId),
  ],
);

export type RepositorioFile = typeof repositorioFiles.$inferSelect;

/* =========================================
   SYSTEM SETTINGS — configurações administrativas (key/value)
   ========================================= */

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;

/* =========================================
   RECAPS — Resumo periódico (diário/semanal/mensal) de movimento.
   Cron gera 1x/dia. Cada row é um snapshot agregado de um período.
   Salva no DB pra acesso futuro pelo painel de relatórios.
   ========================================= */

export const recapsRelatorio = pgTable(
  "recaps_relatorio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 'diario' | 'semanal' | 'mensal' */
    periodo: text("periodo").notNull(),
    /** Início do período (inclusive). Sempre data sem hora. */
    inicio: date("inicio").notNull(),
    /** Fim do período (inclusive). */
    fim: date("fim").notNull(),
    /** Escopo: 'admin' (global) ou 'fundo'+fundoId. */
    escopo: text("escopo").notNull(), // 'admin' | 'fundo'
    fundoId: uuid("fundo_id").references(() => fundos.id, {
      onDelete: "cascade",
    }),
    /** Payload do recap (JSON estruturado — ver makeRecap). */
    dados: jsonb("dados").notNull(),
    geradoEm: timestamp("gerado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("recaps_unico_idx").on(t.periodo, t.inicio, t.escopo, t.fundoId),
    index("recaps_busca_idx").on(t.escopo, t.fundoId, t.periodo, t.inicio),
  ],
);

export type RecapRelatorio = typeof recapsRelatorio.$inferSelect;

/* =========================================
   FATURAS DO FUNDO — repasse mensal devido à Antecipaqui
   Uma fatura por (fundo, mês de referência). Gerada manualmente pelo admin
   a partir do Invoice; registra o valor devido naquele mês e o status do
   pagamento do fundo pra AQ.
   ========================================= */

export const faturaFundoStatusEnum = pgEnum("fatura_fundo_status", [
  "pendente",
  "parcial",
  "paga",
  "vencida",
  "cancelada",
]);

export const faturasFundo = pgTable(
  "faturas_fundo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundoId: uuid("fundo_id")
      .notNull()
      .references(() => fundos.id, { onDelete: "restrict" }),
    /** Mês de referência no formato YYYY-MM (ex: "2026-05"). */
    refMes: text("ref_mes").notNull(),
    /** Valor total devido pelo fundo (= soma dos repasses do mês). */
    valorDevido: numeric("valor_devido", { precision: 15, scale: 2 }).notNull(),
    /** Valor que já foi efetivamente pago. */
    valorPago: numeric("valor_pago", { precision: 15, scale: 2 })
      .notNull()
      .default("0.00"),
    status: faturaFundoStatusEnum("status").notNull().default("pendente"),
    emitidaEm: timestamp("emitida_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    vencimento: date("vencimento"),
    pagaEm: timestamp("paga_em", { withTimezone: true }),
    observacao: text("observacao"),
    geradaPorUserId: text("gerada_por_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("faturas_fundo_unico").on(t.fundoId, t.refMes),
    index("faturas_fundo_status_idx").on(t.status),
  ],
);

export type FaturaFundo = typeof faturasFundo.$inferSelect;

/* =========================================
   COMISSÕES DO COMERCIAL — ledger por operação
   Uma row por (operacao, comercial). Gerada quando a op é aprovada.
   Status pendente → paga conforme admin registra.
   ========================================= */

export const comissaoComercialStatusEnum = pgEnum("comissao_comercial_status", [
  "pendente",
  "paga",
  "cancelada",
]);

export const comissoesComercial = pgTable(
  "comissoes_comercial",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operacaoId: uuid("operacao_id")
      .notNull()
      .references(() => operacoes.id, { onDelete: "cascade" }),
    comercialId: uuid("comercial_id")
      .notNull()
      .references(() => comerciais.id, { onDelete: "restrict" }),
    /** Valor congelado no momento da criação (= 10% do lucro AQ líquido).
     *  Recalcula só se a op for editada antes do primeiro pagamento. */
    valorDevido: numeric("valor_devido", { precision: 15, scale: 2 }).notNull(),
    valorPago: numeric("valor_pago", { precision: 15, scale: 2 })
      .notNull()
      .default("0.00"),
    status: comissaoComercialStatusEnum("status").notNull().default("pendente"),
    geradaEm: timestamp("gerada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    pagaEm: timestamp("paga_em", { withTimezone: true }),
    pagaPorUserId: text("paga_por_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    observacao: text("observacao"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("comissoes_comercial_unica").on(t.operacaoId),
    index("comissoes_comercial_comercial_idx").on(t.comercialId),
    index("comissoes_comercial_status_idx").on(t.status),
  ],
);

export type ComissaoComercial = typeof comissoesComercial.$inferSelect;

/* =========================================
   FUNDO BLACKLIST — construtoras bloqueadas por um fundo específico
   Quando o fundo X bloqueia a construtora Y, novas ops Y → X são impedidas.
   ========================================= */

export const fundoBlacklist = pgTable(
  "fundo_blacklist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundoId: uuid("fundo_id")
      .notNull()
      .references(() => fundos.id, { onDelete: "cascade" }),
    construtoraId: uuid("construtora_id")
      .notNull()
      .references(() => construtoras.id, { onDelete: "cascade" }),
    motivo: text("motivo"),
    blockedByUserId: text("blocked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("fundo_blacklist_unico").on(t.fundoId, t.construtoraId),
    index("fundo_blacklist_fundo_idx").on(t.fundoId),
  ],
);

export type FundoBlacklist = typeof fundoBlacklist.$inferSelect;

/* =========================================
   FUNDO REGRAS DE AUTO-APROVAÇÃO
   Critérios configuráveis que aprovam ops automaticamente sem fundo decidir
   manualmente. Avaliadas em ordem de prioridade ASC.
   ========================================= */

export const fundoRegrasAutoAprovacao = pgTable(
  "fundo_regras_auto_aprovacao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundoId: uuid("fundo_id")
      .notNull()
      .references(() => fundos.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    ativa: boolean("ativa").notNull().default(true),
    prioridade: integer("prioridade").notNull().default(100),
    /** Critérios encadeados com AND. NULL = não aplica esse critério. */
    taxaMinima: numeric("taxa_minima", { precision: 6, scale: 4 }), // 0–1, ex 0.06 = 6%/m
    prazoMaximoMeses: integer("prazo_maximo_meses"), // numero_parcelas
    valorMaximoComissao: numeric("valor_maximo_comissao", {
      precision: 15,
      scale: 2,
    }),
    /** Lista de construtoraIds permitidas (NULL = qualquer). */
    construtorasIds: jsonb("construtoras_ids").$type<string[] | null>(),
    /** Quantas vezes essa regra já disparou (analytics). */
    contadorAcionamentos: integer("contador_acionamentos").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("fundo_regras_fundo_idx").on(t.fundoId),
    index("fundo_regras_ativa_idx").on(t.ativa),
  ],
);

export type FundoRegraAuto = typeof fundoRegrasAutoAprovacao.$inferSelect;

/* =========================================
   FUNDO API KEYS — autenticação de integrações externas
   Token plaintext só aparece uma vez (no momento da criação). Apenas o
   hash SHA-256 fica no banco.
   ========================================= */

export const fundoApiKeyEscopoEnum = pgEnum("fundo_api_key_escopo", [
  "read_only",
  "read_write",
]);

export const fundoApiKeys = pgTable(
  "fundo_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundoId: uuid("fundo_id")
      .notNull()
      .references(() => fundos.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    /** SHA-256 hex do token completo (sem prefixo `aq_`). */
    tokenHash: text("token_hash").notNull(),
    /** Primeiros 8 chars do token plaintext — só pra identificação visual. */
    prefix: text("prefix").notNull(),
    escopo: fundoApiKeyEscopoEnum("escopo").notNull().default("read_only"),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("fundo_api_keys_hash_idx").on(t.tokenHash),
    index("fundo_api_keys_fundo_idx").on(t.fundoId),
  ],
);

export type FundoApiKey = typeof fundoApiKeys.$inferSelect;

/* =========================================
   COMERCIAL — INTERAÇÕES (CRM básico)
   Cada vez que o comercial visita, liga, manda WhatsApp ou anota algo
   sobre uma imobiliária/construtora/corretor, gera uma linha aqui.
   Usado pra: histórico de relacionamento, "última visita", próximas
   ações, score de atenção da carteira viva.
   ========================================= */

export const comercialInteracoes = pgTable(
  "comercial_interacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    comercialId: uuid("comercial_id")
      .notNull()
      .references(() => comerciais.id, { onDelete: "cascade" }),
    /** 'imobiliaria' | 'construtora' | 'corretor' */
    alvoTipo: text("alvo_tipo").notNull(),
    /** UUID de imobiliarias/construtoras ou Clerk userId pra corretor.
     *  Sem FK forte porque o tipo varia. */
    alvoId: text("alvo_id").notNull(),
    /** Snapshot do nome do alvo no momento da interação — preserva contexto
     *  mesmo se o cadastro for renomeado depois. */
    alvoNome: text("alvo_nome"),
    /** 'visita' | 'ligacao' | 'whatsapp' | 'email' | 'anotacao' */
    tipo: text("tipo").notNull(),
    /** O que conversou / observou. */
    descricao: text("descricao"),
    /** Data marcada pro próximo follow-up (NULL = sem follow-up). */
    proximaAcaoEm: date("proxima_acao_em"),
    /** Texto do follow-up planejado. */
    proximaAcaoTexto: text("proxima_acao_texto"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("comercial_interacoes_comercial_idx").on(
      t.comercialId,
      t.createdAt,
    ),
    index("comercial_interacoes_alvo_idx").on(t.alvoTipo, t.alvoId),
    index("comercial_interacoes_followup_idx").on(t.proximaAcaoEm),
  ],
);

export type ComercialInteracao = typeof comercialInteracoes.$inferSelect;

/* =========================================
   COMERCIAL — LINK DE CONVITE (tracking de origem)
   Cada comercial gera 1+ links públicos. Quando alguém acessa /c/[token]
   o sistema seta cookie de origem; quando essa pessoa cria imobiliária no
   onboarding, vinculamos imobiliarias.comercial_id automaticamente.
   ========================================= */

export const comercialConviteLinks = pgTable(
  "comercial_convite_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    comercialId: uuid("comercial_id")
      .notNull()
      .references(() => comerciais.id, { onDelete: "cascade" }),
    /** Slug curto que vai na URL pública. Único globalmente. */
    token: text("token").notNull(),
    /** Label opcional ("evento RioImobi 2026", "indicacao joao", ...) */
    label: text("label"),
    /** Conta acessos ao /c/[token]. */
    cliques: integer("cliques").notNull().default(0),
    /** Conta imobs/corretores cadastrados via esse link. */
    conversoes: integer("conversoes").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("comercial_convite_links_token_idx").on(t.token),
    index("comercial_convite_links_comercial_idx").on(t.comercialId),
  ],
);

export type ComercialConviteLink =
  typeof comercialConviteLinks.$inferSelect;

/* =========================================
   COMERCIAL — LEADS DE PROSPECÇÃO (kanban)
   Contatos que o comercial ainda está trabalhando pra fechar. Quando o
   lead vira cliente (status="fechado"), pode ser vinculado à
   imobiliária criada (imobiliaria_id).
   ========================================= */

export const comercialLeads = pgTable(
  "comercial_leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    comercialId: uuid("comercial_id")
      .notNull()
      .references(() => comerciais.id, { onDelete: "cascade" }),
    /** Nome do contato pessoa. */
    nome: text("nome").notNull(),
    /** Nome da empresa (imob/construtora prospect). */
    empresa: text("empresa"),
    cnpjCpf: text("cnpj_cpf"),
    email: text("email"),
    telefone: text("telefone"),
    cidade: text("cidade"),
    uf: text("uf"),
    /** Origem do lead (indicacao, evento, linkedin, cold-call, etc) */
    origem: text("origem"),
    /** Estágios do funil:
     *  prospect → contato → reuniao → proposta → fechado | perdido */
    status: text("status").notNull().default("prospect"),
    valorEstimado: numeric("valor_estimado", { precision: 15, scale: 2 }),
    notas: text("notas"),
    /** Se virou imobiliária cadastrada, link aqui (= status fechado). */
    imobiliariaId: uuid("imobiliaria_id"),
    motivoPerda: text("motivo_perda"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    index("comercial_leads_comercial_idx").on(t.comercialId, t.status),
    index("comercial_leads_imob_idx").on(t.imobiliariaId),
  ],
);

export type ComercialLead = typeof comercialLeads.$inferSelect;

/* =========================================
   COMERCIAL — TEMPLATES DE MENSAGEM
   Cada comercial salva templates próprios de WhatsApp/email com
   variáveis ({nome}, {empresa}, {dias_inativa}, ...). Quando há template
   marcado como default pra um tipo de ação (reativar/empurrar/etc), o
   FocoDoDia usa ele em vez da mensagem padrão.
   ========================================= */

export const comercialTemplates = pgTable(
  "comercial_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    comercialId: uuid("comercial_id")
      .notNull()
      .references(() => comerciais.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    /** Tipo de ação onde aplicar: reativar | empurrar | parabenizar |
     *  investigar | followup | livre (uso manual). */
    tipo: text("tipo").notNull().default("livre"),
    /** Conteúdo da mensagem com {placeholders}. Suportados:
     *  {nome}, {empresa}, {dias_inativa}, {numero_op}, {valor_op}. */
    conteudo: text("conteudo").notNull(),
    /** Só um default por (comercial, tipo). Quando true, FocoDoDia usa
     *  esse em vez da mensagem hardcoded. */
    isDefault: boolean("is_default").notNull().default(false),
    usadoCount: integer("usado_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("comercial_templates_comercial_idx").on(t.comercialId),
    index("comercial_templates_default_idx").on(
      t.comercialId,
      t.tipo,
      t.isDefault,
    ),
  ],
);

export type ComercialTemplate = typeof comercialTemplates.$inferSelect;

/* =========================================
   COMERCIAL — PROSPECT PONTOS (mapa de prospecção geográfica)
   Pontos que o comercial salva no mapa pra prospectar — adicionados
   manualmente (via endereço → Nominatim) ou descobertos via Google
   Places. Cada ponto é tipicamente uma imob/construtora que ainda
   não é cliente AQ.
   ========================================= */

export const comercialProspectPontos = pgTable(
  "comercial_prospect_pontos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    comercialId: uuid("comercial_id")
      .notNull()
      .references(() => comerciais.id, { onDelete: "cascade" }),
    /** ID retornado pela Google Places API (se foi descoberto via API).
     *  null = adicionado manualmente. */
    googlePlaceId: text("google_place_id"),
    nome: text("nome").notNull(),
    /** 'imobiliaria' | 'construtora' | 'outro' */
    categoria: text("categoria").notNull().default("imobiliaria"),
    endereco: text("endereco"),
    cidade: text("cidade"),
    uf: text("uf"),
    /** Coordenadas geo. Lat/lng como numeric pra precisão. */
    lat: numeric("lat", { precision: 10, scale: 7 }),
    lng: numeric("lng", { precision: 10, scale: 7 }),
    telefone: text("telefone"),
    email: text("email"),
    website: text("website"),
    /** 'novo' | 'contactado' | 'reuniao_agendada' | 'descartado' | 'virou_lead' */
    status: text("status").notNull().default("novo"),
    /** Se virou lead no pipeline, link aqui. */
    leadId: uuid("lead_id"),
    /** Se já é cliente AQ (auto-detectado por match com imobiliarias/construtoras),
     *  guarda o id pra mostrar visualmente no mapa. */
    imobiliariaId: uuid("imobiliaria_id"),
    construtoraId: uuid("construtora_id"),
    notas: text("notas"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("comercial_prospect_pontos_comercial_idx").on(t.comercialId, t.status),
    index("comercial_prospect_pontos_geo_idx").on(t.lat, t.lng),
    index("comercial_prospect_pontos_google_idx").on(t.googlePlaceId),
  ],
);

export type ComercialProspectPonto =
  typeof comercialProspectPontos.$inferSelect;

/* =========================================
   IMOBILIÁRIA — MEMBROS (multi-corretor)
   A imob pode ter um time. Cada user adicional vira membro com role
   interna: owner (= ownerUserId), gerente (tudo menos config), corretor
   (atendimentos próprios + sem financeiro), financeiro (extrato sem CRM).
   ========================================= */

export const imobiliariaMembros = pgTable(
  "imobiliaria_membros",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    imobiliariaId: uuid("imobiliaria_id")
      .notNull()
      .references(() => imobiliarias.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 'owner' | 'gerente' | 'corretor' | 'financeiro' */
    roleInterna: text("role_interna").notNull().default("corretor"),
    invitedByUserId: text("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Email convidado (mesmo antes do user aceitar). Identifica o convite. */
    email: text("email").notNull(),
    /** Nome do convidado (snapshot). */
    nome: text("nome"),
    /** NULL = ativo. Quando dispensado, preencher. */
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("imobiliaria_membros_unique").on(t.imobiliariaId, t.userId),
    index("imobiliaria_membros_imob_idx").on(t.imobiliariaId, t.removedAt),
    index("imobiliaria_membros_user_idx").on(t.userId, t.removedAt),
  ],
);

export type ImobiliariaMembro = typeof imobiliariaMembros.$inferSelect;

/* =========================================
   ATENDIMENTOS — Kanban CRM da imobiliária
   Cada atendimento é uma negociação de venda em andamento. Tem um
   corretor responsável, dados do comprador (potencial), imóvel descrito,
   e uma timeline de eventos até virar uma operação (ou perder).
   ========================================= */

export const atendimentos = pgTable(
  "atendimentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    imobiliariaId: uuid("imobiliaria_id")
      .notNull()
      .references(() => imobiliarias.id, { onDelete: "cascade" }),
    /** Corretor responsável (vê esse atendimento sempre, mesmo se for
     *  só "corretor" membro). Owner/gerente vê todos da imob. */
    corretorUserId: text("corretor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Funil:
     *  contato_inicial → qualificado → visita → proposta → negociacao
     *  → fechado | perdido */
    status: text("status").notNull().default("contato_inicial"),

    /** Dados do comprador (snapshot, mesmo se veio via link de coleta) */
    compradorNome: text("comprador_nome").notNull(),
    compradorEmail: text("comprador_email"),
    compradorTelefone: text("comprador_telefone"),
    compradorDocumento: text("comprador_documento"),
    /** Se foi via link de coleta, guarda referência ao token usado.
     *  Sem FK forte porque comprador_coleta_tokens é volátil. */
    coletaToken: text("coleta_token"),

    /** Dados do imóvel — descrição livre por enquanto. */
    imovelDescricao: text("imovel_descricao"),
    imovelEndereco: text("imovel_endereco"),
    imovelCidade: text("imovel_cidade"),
    imovelUf: text("imovel_uf"),
    imovelValor: numeric("imovel_valor", { precision: 15, scale: 2 }),
    /** Comissão potencial estimada. Quando vira op, vira a comissão real. */
    comissaoEstimada: numeric("comissao_estimada", {
      precision: 15,
      scale: 2,
    }),

    /** Último score Serasa consultado (sob demanda). */
    scoreComprador: integer("score_comprador"),
    scoreRisco: text("score_risco"), // baixo | medio | alto | critico
    scoreConsultadoEm: timestamp("score_consultado_em", {
      withTimezone: true,
    }),

    /** Quando atendimento é encaminhado pra antecipação, guarda op gerada. */
    operacaoId: uuid("operacao_id"),

    /** Quando perdido, motivo. */
    motivoPerda: text("motivo_perda"),

    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("atendimentos_imob_idx").on(t.imobiliariaId, t.status),
    index("atendimentos_corretor_idx").on(t.corretorUserId, t.status),
    index("atendimentos_operacao_idx").on(t.operacaoId),
  ],
);

export type Atendimento = typeof atendimentos.$inferSelect;

/* =========================================
   ATENDIMENTO EVENTOS — timeline rica do atendimento
   ========================================= */

export const atendimentoEventos = pgTable(
  "atendimento_eventos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    atendimentoId: uuid("atendimento_id")
      .notNull()
      .references(() => atendimentos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Tipo do evento:
     *  visita_agendada | visita_realizada | ligacao | whatsapp | email |
     *  proposta_enviada | contraproposta | documentacao | anotacao |
     *  status_change | score_consultado | encaminhado_antecipacao */
    tipo: text("tipo").notNull(),
    descricao: text("descricao"),
    /** Para visita agendada — quando vai acontecer. */
    dataAgendada: timestamp("data_agendada", { withTimezone: true }),
    /** Para proposta/contraproposta — valor R$. */
    valor: numeric("valor", { precision: 15, scale: 2 }),
    /** Para status_change. */
    statusFrom: text("status_from"),
    statusTo: text("status_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("atendimento_eventos_atendimento_idx").on(
      t.atendimentoId,
      t.createdAt,
    ),
  ],
);

export type AtendimentoEvento = typeof atendimentoEventos.$inferSelect;

/* =========================================
   ATENDIMENTO ↔ CONSTRUTORAS (vínculo de acompanhamento)
   Corretor pode convidar uma ou mais construtoras pra acompanhar a
   negociação. Construtora vê o atendimento (read-only), pode comentar
   e responder pedidos formais de opinião.
   ========================================= */

export const atendimentoConstrutoras = pgTable(
  "atendimento_construtoras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    atendimentoId: uuid("atendimento_id")
      .notNull()
      .references(() => atendimentos.id, { onDelete: "cascade" }),
    construtoraId: uuid("construtora_id")
      .notNull()
      .references(() => construtoras.id, { onDelete: "cascade" }),
    convidadoPorUserId: text("convidado_por_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    /** Quando true, atendimento está "travado" aguardando resposta da
     *  construtora. Indicador visual no kanban. */
    aguardandoOpiniao: boolean("aguardando_opiniao")
      .notNull()
      .default(false),

    /** Tipo da última opinião solicitada:
     *  'aprovar_valor' | 'aprovar_condicoes' | 'liberar_desconto' |
     *  'confirmar_disponibilidade' | 'opiniao_geral' */
    tipoOpiniaoSolicitada: text("tipo_opiniao_solicitada"),
    opiniaoSolicitadaEm: timestamp("opiniao_solicitada_em", {
      withTimezone: true,
    }),
    opiniaoSolicitadaTexto: text("opiniao_solicitada_texto"),

    /** Resposta */
    opiniaoRecebidaEm: timestamp("opiniao_recebida_em", {
      withTimezone: true,
    }),
    opiniaoTexto: text("opiniao_texto"),
    /** Recomendação da construtora: true=prosseguir, false=não, null=condicional/texto. */
    opiniaoRecomenda: boolean("opiniao_recomenda"),

    /** Construtora ou corretor podem encerrar acompanhamento. */
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removedReason: text("removed_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("atendimento_construtoras_unique").on(
      t.atendimentoId,
      t.construtoraId,
    ),
    index("atendimento_construtoras_construtora_idx").on(
      t.construtoraId,
      t.removedAt,
    ),
    index("atendimento_construtoras_atendimento_idx").on(
      t.atendimentoId,
      t.removedAt,
    ),
    index("atendimento_construtoras_aguardando_idx").on(t.aguardandoOpiniao),
  ],
);

export type AtendimentoConstrutora =
  typeof atendimentoConstrutoras.$inferSelect;

/* =========================================
   RELATIONS (pra queries com joins fáceis)
   ========================================= */

export const usersRelations = relations(users, ({ one, many }) => ({
  imobiliaria: one(imobiliarias, {
    fields: [users.id],
    references: [imobiliarias.ownerUserId],
  }),
  construtora: one(construtoras, {
    fields: [users.id],
    references: [construtoras.ownerUserId],
  }),
  operacoes: many(operacoes),
}));

export const imobiliariaRelations = relations(imobiliarias, ({ one, many }) => ({
  owner: one(users, { fields: [imobiliarias.ownerUserId], references: [users.id] }),
  operacoes: many(operacoes),
}));

export const construtoraRelations = relations(construtoras, ({ one, many }) => ({
  owner: one(users, {
    fields: [construtoras.ownerUserId],
    references: [users.id],
  }),
  operacoes: many(operacoes),
}));

export const operacoesRelations = relations(operacoes, ({ one, many }) => ({
  corretor: one(users, {
    fields: [operacoes.corretorUserId],
    references: [users.id],
  }),
  imobiliaria: one(imobiliarias, {
    fields: [operacoes.imobiliariaId],
    references: [imobiliarias.id],
  }),
  construtora: one(construtoras, {
    fields: [operacoes.construtoraId],
    references: [construtoras.id],
  }),
  parcelas: many(parcelasComissao),
  contrato: one(contratos, {
    fields: [operacoes.id],
    references: [contratos.operacaoId],
  }),
  events: many(operacaoEvents),
}));

export const parcelasRelations = relations(parcelasComissao, ({ one }) => ({
  operacao: one(operacoes, {
    fields: [parcelasComissao.operacaoId],
    references: [operacoes.id],
  }),
}));

export const contratosRelations = relations(contratos, ({ one }) => ({
  operacao: one(operacoes, {
    fields: [contratos.operacaoId],
    references: [operacoes.id],
  }),
}));

/* =========================================
   TYPES inferidos pra usar no app
   ========================================= */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Imobiliaria = typeof imobiliarias.$inferSelect;
export type Construtora = typeof construtoras.$inferSelect;
export type Operacao = typeof operacoes.$inferSelect;
export type NewOperacao = typeof operacoes.$inferInsert;
export type ParcelaComissao = typeof parcelasComissao.$inferSelect;
export type Contrato = typeof contratos.$inferSelect;
export type Notificacao = typeof notificacoes.$inferSelect;
