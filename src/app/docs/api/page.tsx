import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "API Antecipaqui · Documentação",
  description:
    "Documentação pública (OpenAPI 3.1) da API REST do fundo investidor.",
};
export const dynamic = "force-static";

const SWAGGER_VERSION = "5.17.14";

export default function PublicApiDocsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs text-fg-muted hover:text-accent"
        >
          ← Antecipaqui
        </Link>
        <h1 className="text-display-md mt-3 mb-2">
          API <span className="text-gradient-blue">do fundo</span>
        </h1>
        <p className="text-fg-muted max-w-2xl mb-6">
          Documentação para fundos parceiros. Spec OpenAPI 3.1 em{" "}
          <Link
            href="/api/openapi"
            className="text-accent hover:underline font-mono text-xs"
          >
            /api/openapi
          </Link>
          . São duas partes independentes — use a que corresponde ao seu
          modelo de operação.
        </p>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
          <div className="rounded-2xl border border-border bg-bg-elev p-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-dim">
              parte 1 · você consulta
            </span>
            <h2 className="text-base font-semibold mt-2 mb-1">
              API de operações e parcelas
            </h2>
            <p className="text-sm text-fg-muted">
              Para o fundo que acompanha e decide pelo painel: listar
              operações, ver detalhe, consultar parcelas e aprovar ou recusar.
              Autenticação por Bearer token — gere a chave em{" "}
              <Link href="/painel/api" className="text-accent hover:underline">
                /painel/api
              </Link>{" "}
              (usuários com perfil de fundo).
            </p>
          </div>

          <div className="rounded-2xl border border-accent/40 bg-accent-soft p-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-dim">
              parte 2 · você nos avisa
            </span>
            <h2 className="text-base font-semibold mt-2 mb-1">
              Webhooks de integração
            </h2>
            <p className="text-sm text-fg-muted">
              Para o fundo que opera em sistema próprio: a operação nasce no
              Antecipaqui, roda no seu sistema e volta traduzida para o
              cliente. Três endereços — resultado do cadastro, mudança de
              status e duplicatas emitidas. Autenticação por assinatura
              HMAC-SHA256 do corpo, sem token. A URL de cada endereço, com o
              identificador do seu fundo, é entregue junto com o segredo
              compartilhado.
            </p>
          </div>
        </div>
      </div>

      <link
        rel="stylesheet"
        href={`https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`}
      />
      <div
        id="swagger-ui"
        className="rounded-2xl border border-border bg-white overflow-hidden"
      />
      <Script
        src={`https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`}
        strategy="afterInteractive"
      />
      <Script id="swagger-init-public" strategy="afterInteractive">
        {`
          (function init() {
            if (typeof window === 'undefined') return;
            if (!window.SwaggerUIBundle) {
              setTimeout(init, 50);
              return;
            }
            window.SwaggerUIBundle({
              url: '/api/openapi',
              dom_id: '#swagger-ui',
              deepLinking: true,
              displayRequestDuration: true,
              tryItOutEnabled: true,
              persistAuthorization: true,
              docExpansion: 'list',
              filter: true,
            });
          })();
        `}
      </Script>
    </div>
  );
}
