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
    // Dados financeiros
    valorVenda: numeric("valor_venda", { precision: 15, scale: 2 }).notNull(),
    valorComissao: numeric("valor_comissao", { precision: 15, scale: 2 }).notNull(),
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
