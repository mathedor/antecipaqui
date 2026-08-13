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
      {
        url: baseUrl,
        description:
          "Raiz do site — use este servidor para os endpoints de Webhooks de integração",
      },
    ],
    security: [{ BearerApiKey: [] }],
    tags: [
      { name: "Fundo", description: "Dados do fundo autenticado" },
      { name: "Operações", description: "Listagem, detalhe e decisão" },
      { name: "Parcelas", description: "Parcelas de comissão" },
      {
        name: "Webhooks de integração",
        description:
          "Endereços que o FUNDO chama quando opera com sistema próprio (ex.: OPERA CAPITAL / QPROF). " +
          "Não usam Bearer token: são autenticados pela assinatura HMAC-SHA256 do corpo, com o segredo " +
          "compartilhado gerado no painel do fundo. O cabeçalho da assinatura é configurável por fundo " +
          "(padrão: x-opera-signature, formato sha256=<hex>). " +
          "Selecione o servidor da raiz do site para montar a URL completa.",
      },
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

      /* ─── Webhooks que o fundo integrado chama (OPERA CAPITAL / QPROF) ───
         Documentados aqui para que o fundo cadastre os endereços do lado
         deles. Autenticação é por assinatura HMAC, não por Bearer. */
      "/api/opera/webhook/cadastro/{fundoId}": {
        post: {
          tags: ["Webhooks de integração"],
          summary: "Peça 03 · Resultado da análise cadastral do cliente",
          description:
            "Chamado pelo fundo quando termina a análise cadastral de um cliente que enviamos. " +
            "É o portão da integração: nenhuma operação é enviada antes da aprovação. " +
            "Reprovação exige motivo — ele é repassado ao cliente. " +
            "Idempotente: o mesmo `eventoId` entregue várias vezes produz um efeito só.",
          security: [],
          parameters: [
            { $ref: "#/components/parameters/FundoIdPath" },
            { $ref: "#/components/parameters/AssinaturaHeader" },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WebhookCadastro" },
              },
            },
          },
          responses: {
            "200": { $ref: "#/components/responses/WebhookOk" },
            "401": { $ref: "#/components/responses/AssinaturaInvalida" },
            "409": { $ref: "#/components/responses/IntegracaoInativa" },
            "422": { $ref: "#/components/responses/NaoLocalizado" },
          },
        },
      },
      "/api/opera/webhook/status/{fundoId}": {
        post: {
          tags: ["Webhooks de integração"],
          summary: "Peça 05 · Mudança de status da operação",
          description:
            "Chamado a cada mudança na esteira do fundo. Cada evento aceito atualiza a esteira " +
            "que o cliente vê, registra na linha do tempo da operação e notifica todos os envolvidos. " +
            "Quando o status for de assinatura, envie o link em `linkAssinatura` — ele vai direto " +
            "para o cedente. Status fora do catálogo é registrado e sinalizado, sem alterar a esteira. " +
            "Eventos fora de ordem não retrocedem o estado: a data do evento manda.",
          security: [],
          parameters: [
            { $ref: "#/components/parameters/FundoIdPath" },
            { $ref: "#/components/parameters/AssinaturaHeader" },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WebhookStatus" },
              },
            },
          },
          responses: {
            "200": { $ref: "#/components/responses/WebhookOk" },
            "401": { $ref: "#/components/responses/AssinaturaInvalida" },
            "409": { $ref: "#/components/responses/IntegracaoInativa" },
            "422": { $ref: "#/components/responses/NaoLocalizado" },
          },
        },
      },
      "/api/opera/webhook/duplicatas/{fundoId}": {
        post: {
          tags: ["Webhooks de integração"],
          summary: "Peça 06 · Duplicatas emitidas da operação paga",
          description:
            "Chamado depois do pagamento, com os títulos da operação. Cada duplicata é casada com a " +
            "parcela de mesmo vencimento e publicada nos painéis da construtora e da imobiliária. " +
            "Pode ser chamado de novo com os mesmos números para atualizar valores ou links.",
          security: [],
          parameters: [
            { $ref: "#/components/parameters/FundoIdPath" },
            { $ref: "#/components/parameters/AssinaturaHeader" },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WebhookDuplicatas" },
              },
            },
          },
          responses: {
            "200": { $ref: "#/components/responses/WebhookOk" },
            "401": { $ref: "#/components/responses/AssinaturaInvalida" },
            "409": { $ref: "#/components/responses/IntegracaoInativa" },
            "422": { $ref: "#/components/responses/NaoLocalizado" },
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
        WebhookOk: {
          description:
            "Evento aceito e processado. `duplicado: true` significa que já tínhamos esse evento — nada foi refeito.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean" },
                  detalhe: { type: "string" },
                  duplicado: { type: "boolean" },
                },
              },
            },
          },
        },
        AssinaturaInvalida: {
          description:
            "Assinatura HMAC ausente ou incorreta. O corpo recebido fica registrado para auditoria.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        IntegracaoInativa: {
          description:
            "O fundo existe, mas está sem integração ativa ou sem segredo de assinatura configurado.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NaoLocalizado: {
          description:
            "Não encontramos a operação ou o cadastro pelos identificadores enviados. " +
            "Não reenvie o mesmo corpo: confira os identificadores.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", example: false },
                  detalhe: { type: "string" },
                },
              },
            },
          },
        },
      },
      parameters: {
        FundoIdPath: {
          in: "path",
          name: "fundoId",
          required: true,
          schema: { type: "string", format: "uuid" },
          description:
            "Identificador do fundo no Antecipaqui. Já vem embutido na URL entregue ao fundo.",
        },
        AssinaturaHeader: {
          in: "header",
          name: "x-opera-signature",
          required: true,
          schema: { type: "string" },
          example: "sha256=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b…",
          description:
            "HMAC-SHA256 do corpo cru da requisição, usando o segredo compartilhado. " +
            "O nome do cabeçalho e o formato (hex ou base64, com ou sem prefixo) são " +
            "configuráveis por fundo no contrato de integração.",
        },
      },
      schemas: {
        WebhookCadastro: {
          type: "object",
          description:
            "Identifique o cadastro por `protocolo`, `clienteId` ou `cnpj` — o primeiro que casar vale.",
          properties: {
            eventoId: {
              type: "string",
              description:
                "Identificador do evento no seu sistema. Usado para idempotência; se não vier, usamos o hash do corpo.",
              example: "evt_9f2c",
            },
            protocolo: { type: "string", example: "PROTO-9988" },
            clienteId: { type: "string", example: "CLI-4471" },
            cnpj: { type: "string", example: "12345678000190" },
            situacao: {
              type: "string",
              enum: ["aprovado", "reprovado"],
              example: "reprovado",
            },
            motivo: {
              type: "string",
              description: "Obrigatório quando reprovado — é o que o cliente lê.",
              example: "Contrato social sem a última alteração registrada",
            },
            dataEvento: { type: "string", format: "date-time" },
          },
          required: ["situacao"],
        },
        WebhookStatus: {
          type: "object",
          description:
            "Identifique a operação por `operacaoId` (o seu) ou `referenciaExterna` (o nosso, enviado no cadastro da operação).",
          properties: {
            eventoId: { type: "string", example: "evt_a71b" },
            operacaoId: { type: "string", example: "OPERA-1234" },
            referenciaExterna: {
              type: "string",
              format: "uuid",
              description: "O identificador que mandamos no envio da operação.",
            },
            status: {
              type: "string",
              description: "Estado da operação na sua esteira.",
              enum: [
                "aguardando aprovação",
                "reprovado",
                "preparando documentação",
                "aguardando confirmação do cedente",
                "enviado para assinatura",
                "aguardando pagamento",
                "pago",
              ],
              example: "enviado para assinatura",
            },
            observacao: {
              type: "string",
              description: "Texto livre — aparece para o cliente e no painel.",
            },
            linkAssinatura: {
              type: "string",
              format: "uri",
              description:
                "Envie quando o status for de assinatura. Vai direto para o cedente, por painel, e-mail e SMS.",
            },
            dataEvento: {
              type: "string",
              format: "date-time",
              description:
                "Momento em que o status mudou. É o que ordena os eventos — evento mais antigo que o último aplicado é ignorado.",
            },
          },
          required: ["status"],
        },
        WebhookDuplicatas: {
          type: "object",
          properties: {
            eventoId: { type: "string", example: "evt_c30d" },
            operacaoId: { type: "string", example: "OPERA-1234" },
            referenciaExterna: { type: "string", format: "uuid" },
            duplicatas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  numero: { type: "string", example: "0001" },
                  valor: { type: "number", example: 12500.0 },
                  vencimento: {
                    type: "string",
                    format: "date",
                    example: "2026-09-10",
                  },
                  sacado: { type: "string", example: "Construtora Exemplo Ltda" },
                  sacadoDocumento: { type: "string", example: "12345678000190" },
                  linhaDigitavel: { type: "string" },
                  codigoBarras: { type: "string" },
                  link: {
                    type: "string",
                    format: "uri",
                    description: "Link do arquivo. Guardamos uma cópia nossa.",
                  },
                },
                required: ["numero", "valor", "vencimento"],
              },
            },
          },
          required: ["duplicatas"],
        },
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
