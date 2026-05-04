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
    onboardingStatus: onboardingStatusEnum("onboarding_status")
      .notNull()
      .default("pendente"),
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
  ],
);

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
    /** Taxa de juros base do fundo (mensal, decimal — 0.06 = 6%). Pode ser
     *  sobrescrita por operação na aprovação admin. */
    taxaMensalBase: numeric("taxa_mensal_base", { precision: 6, scale: 4 })
      .notNull()
      .default("0.0600"),
    /* === Dados bancários — pra recebimento de pagamentos de duplicatas === */
    bancoNome: text("banco_nome"),
    /** Código do banco (3 dígitos: 001 BB, 341 Itaú, etc.) */
    bancoCodigo: text("banco_codigo"),
    bancoAgencia: text("banco_agencia"),
    bancoConta: text("banco_conta"),
    bancoPix: text("banco_pix"),
    /* === Banco emissor de boletos (pode ser diferente do banco principal) === */
    boletosBancoNome: text("boletos_banco_nome"),
    /** URL da API que gera os boletos. */
    boletosApiUrl: text("boletos_api_url"),
    /* === Sistema de gestão (CRM/ERP) — pra integração de operações === */
    sistemaGestaoNome: text("sistema_gestao_nome"),
    /** URL da documentação da API do sistema de gestão. */
    sistemaGestaoDocsUrl: text("sistema_gestao_docs_url"),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("documentos_user_idx").on(t.userId),
    index("documentos_operacao_idx").on(t.operacaoId),
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
    /** Fundo que vai aportar a antecipação. NULL pra operações antigas
     *  (criadas antes do conceito de fundo) — admin escolhe na aprovação. */
    fundoId: uuid("fundo_id").references(() => fundos.id, {
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("parcelas_operacao_idx").on(t.operacaoId),
    index("parcelas_vencimento_idx").on(t.vencimento),
  ],
);

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
    /** "geral" = ticket comum; "cashback" = solicitação de saque de cashback */
    categoria: text("categoria").notNull().default("geral"),
    /** Payload livre — usado pra cashback: { valorSolicitado, dadosBancarios } */
    extra: jsonb("extra"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finalizadoEm: timestamp("finalizado_em", { withTimezone: true }),
  },
  (t) => [
    index("tickets_user_idx").on(t.userId),
    index("tickets_status_idx").on(t.status),
    index("tickets_categoria_idx").on(t.categoria),
  ],
);

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
