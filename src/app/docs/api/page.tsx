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
        <p className="text-fg-muted max-w-2xl">
          REST API pra fundos parceiros consultarem operações, parcelas e
          tomarem decisões. Spec OpenAPI 3.1 em{" "}
          <Link
            href="/api/openapi"
            className="text-accent hover:underline font-mono text-xs"
          >
            /api/openapi
          </Link>
          . Gere sua API key em{" "}
          <Link href="/painel/api" className="text-accent hover:underline">
            /painel/api
          </Link>{" "}
          (apenas usuários com role fundo).
        </p>
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
