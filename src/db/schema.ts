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
    /** Taxa de juros base do fundo (mensal, decimal — 0.06 = 6%). Pode ser
     *  sobrescrita por operação na aprovação admin. */
    taxaMensalBase: numeric("taxa_mensal_base", { precision: 6, scale: 4 })
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
  },
  (t) => [
    index("tickets_user_idx").on(t.userId),
    index("tickets_status_idx").on(t.status),
    index("tickets_categoria_idx").on(t.categoria),
    index("tickets_operacao_idx").on(t.operacaoId),
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
