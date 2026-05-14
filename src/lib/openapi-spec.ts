/** Spec OpenAPI 3.1 da API externa do fundo.
 *  Mantida em sincronia manual com /api/external/fundo/*.
 *  Servida em /api/openapi (JSON) e renderizada em /admin/api-docs (Swagger UI). */

export function buildOpenApiSpec() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";

  return {
    openapi: "3.1.0",
    info: {
      title: "Antecipaqui · API do Fundo",
      version: "1.0.0",
      description:
        "API REST para fundos investidores consultarem operações, parcelas e tomarem decisões " +
        "(aprovar/recusar). Autenticação via Bearer token de API key (gerada em /painel/api). " +
        "Todas as respostas em JSON UTF-8.",
      contact: {
        name: "Antecipaqui",
        url: "https://www.antecipaqui.digital",
        email: "suporte@antecipaqui.digital",
      },
    },
    servers: [
      { url: `${baseUrl}/api/external`, description: "Produção" },
    ],
    security: [{ BearerApiKey: [] }],
    tags: [
      { name: "Fundo", description: "Dados do fundo autenticado" },
      { name: "Operações", description: "Listagem, detalhe e decisão" },
      { name: "Parcelas", description: "Parcelas de comissão" },
    ],
    paths: {
      "/fundo/me": {
        get: {
          tags: ["Fundo"],
          summary: "Dados do fundo + estatísticas",
          description:
            "Retorna informações do fundo autenticado (CNPJ, razão, taxa base) e estatísticas agregadas: " +
            "total de ops, ops ativas, ops pendentes de decisão e capital exposto.",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/MeResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/fundo/operacoes": {
        get: {
          tags: ["Operações"],
          summary: "Listar operações do fundo",
          description:
            "Lista operações que pertencem ao fundo autenticado. Aceita filtros por status, " +
            "decisão do fundo (`pendente|aprovada|recusada`) e paginação.",
          parameters: [
            {
              in: "query",
              name: "status",
              schema: { type: "string" },
              description:
                "Status da operação. Aceita CSV pra múltiplos. Valores: rascunho, aguardando_aprovacao, " +
                "documentos_incompletos, pre_aprovada, analise_final, enviada_para_assinatura, " +
                "enviada_para_pagamento, realizada, recusada, cancelada.",
              example: "pre_aprovada,enviada_para_pagamento",
            },
            {
              in: "query",
              name: "fundoAprovacao",
              schema: {
                type: "string",
                enum: ["pendente", "aprovada", "recusada"],
              },
            },
            {
              in: "query",
              name: "limit",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 200,
                default: 50,
              },
            },
            {
              in: "query",
              name: "offset",
              schema: { type: "integer", minimum: 0, default: 0 },
            },
          ],
          responses: {
            "200": {
              description: "Lista de operações",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OperacoesListResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/fundo/operacoes/{id}": {
        get: {
          tags: ["Operações"],
          summary: "Detalhe da operação",
          description:
            "Retorna detalhes completos da operação, incluindo parcelas de comissão e custos.",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Detalhe + parcelas + custos",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OperacaoDetailResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/fundo/operacoes/{id}/decisao": {
        post: {
          tags: ["Operações"],
          summary: "Aprovar ou recusar operação",
          description:
            "Marca a operação como aprovada ou recusada pelo fundo. Requer **escopo `read_write`** " +
            "na API key. Idempotente: chamar duas vezes com a mesma decisão não erra, só retorna " +
            "que já estava no estado.",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DecisaoRequest" },
                examples: {
                  aprovar: {
                    summary: "Aprovar",
                    value: { decisao: "aprovada" },
                  },
                  recusar: {
                    summary: "Recusar com motivo",
                    value: {
                      decisao: "recusada",
                      motivo: "Score da construtora abaixo do mínimo",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Decisão registrada",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DecisaoResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": {
              description: "Escopo insuficiente",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/fundo/parcelas": {
        get: {
          tags: ["Parcelas"],
          summary: "Listar parcelas",
          description:
            "Parcelas de comissão de operações do fundo. Filtros por status, intervalo de vencimento, operação específica.",
          parameters: [
            {
              in: "query",
              name: "status",
              schema: {
                type: "string",
                enum: ["a_vencer", "paga", "vencida"],
              },
            },
            {
              in: "query",
              name: "vencimentoDe",
              schema: { type: "string", format: "date" },
              example: "2026-05-01",
            },
            {
              in: "query",
              name: "vencimentoAte",
              schema: { type: "string", format: "date" },
              example: "2026-05-31",
            },
            {
              in: "query",
              name: "operacaoId",
              schema: { type: "string", format: "uuid" },
            },
            {
              in: "query",
              name: "limit",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 500,
                default: 100,
              },
            },
            {
              in: "query",
              name: "offset",
              schema: { type: "integer", minimum: 0, default: 0 },
            },
          ],
          responses: {
            "200": {
              description: "Lista de parcelas",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ParcelasListResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerApiKey: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API key prefixada (ex: aq_xxxxxxxx)",
          description:
            "Header: `Authorization: Bearer aq_xxxxxxxx`. Gere uma key em /painel/api (escopo `read_only` ou `read_write`).",
        },
      },
      responses: {
        Unauthorized: {
          description: "API key ausente, inválida, expirada ou revogada",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        BadRequest: {
          description: "Parâmetro inválido",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NotFound: {
          description: "Recurso não encontrado ou não pertence ao fundo",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string" } },
          required: ["error"],
        },
        MeResponse: {
          type: "object",
          properties: {
            fundo: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                cnpj: { type: "string" },
                razaoSocial: { type: "string" },
                nomeFantasia: { type: "string", nullable: true },
                taxaMensalBase: {
                  type: "number",
                  description: "Decimal: 0.06 = 6% a.m.",
                },
              },
            },
            apiKey: {
              type: "object",
              properties: {
                nome: { type: "string" },
                escopo: {
                  type: "string",
                  enum: ["read_only", "read_write"],
                },
                prefix: { type: "string", example: "aq_abcd1234" },
              },
            },
            stats: {
              type: "object",
              properties: {
                opsTotal: { type: "integer" },
                opsAtivas: { type: "integer" },
                opsPendentes: { type: "integer" },
                capitalExposto: { type: "number" },
              },
            },
          },
        },
        Operacao: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            numero: { type: "string" },
            status: { type: "string" },
            fundoAprovacao: {
              type: "string",
              enum: ["pendente", "aprovada", "recusada"],
              nullable: true,
            },
            fundoRecusaMotivo: { type: "string", nullable: true },
            valorComissao: { type: "number" },
            valorPresente: { type: "number" },
            juros: { type: "number" },
            taxaOpMensal: { type: "number" },
            numeroParcelas: { type: "integer" },
            dataVenda: { type: "string", format: "date" },
            aprovadoEm: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time", nullable: true },
            construtora: {
              type: "object",
              properties: {
                nome: { type: "string", nullable: true },
                cnpj: { type: "string", nullable: true },
              },
            },
          },
        },
        OperacoesListResponse: {
          type: "object",
          properties: {
            operacoes: {
              type: "array",
              items: { $ref: "#/components/schemas/Operacao" },
            },
            pagination: {
              type: "object",
              properties: {
                limit: { type: "integer" },
                offset: { type: "integer" },
                count: { type: "integer" },
              },
            },
          },
        },
        OperacaoDetailResponse: {
          type: "object",
          properties: {
            operacao: { $ref: "#/components/schemas/Operacao" },
            parcelas: {
              type: "array",
              items: { $ref: "#/components/schemas/Parcela" },
            },
            custos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  titulo: { type: "string" },
                  valor: { type: "number" },
                },
              },
            },
          },
        },
        Parcela: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            operacaoId: { type: "string", format: "uuid" },
            operacaoNumero: { type: "string" },
            construtoraNome: { type: "string", nullable: true },
            numero: { type: "integer" },
            valor: { type: "number" },
            vencimento: { type: "string", format: "date" },
            status: {
              type: "string",
              enum: ["a_vencer", "paga", "vencida"],
            },
            pagoEm: { type: "string", format: "date", nullable: true },
            pagoValor: { type: "number", nullable: true },
          },
        },
        ParcelasListResponse: {
          type: "object",
          properties: {
            parcelas: {
              type: "array",
              items: { $ref: "#/components/schemas/Parcela" },
            },
            pagination: {
              type: "object",
              properties: {
                limit: { type: "integer" },
                offset: { type: "integer" },
                count: { type: "integer" },
              },
            },
          },
        },
        DecisaoRequest: {
          type: "object",
          required: ["decisao"],
          properties: {
            decisao: {
              type: "string",
              enum: ["aprovada", "recusada"],
            },
            motivo: {
              type: "string",
              maxLength: 500,
              description: "Obrigatório quando decisao = recusada",
            },
          },
        },
        DecisaoResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            action: { type: "string", enum: ["aprovada", "recusada"] },
            operacaoId: { type: "string", format: "uuid" },
            numero: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
  } as const;
}
