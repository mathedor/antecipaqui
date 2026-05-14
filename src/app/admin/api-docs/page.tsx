import Link from "next/link";
import Script from "next/script";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";

export const metadata = { title: "Admin · API Docs" };
export const dynamic = "force-dynamic";

const SWAGGER_VERSION = "5.17.14";

export default async function AdminApiDocsPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <div className="mb-6">
        <Link
          href="/admin/relatorios"
          className="text-xs text-fg-muted hover:text-accent"
        >
          ← Relatórios
        </Link>
        <div className="eyebrow mt-2 mb-2">documentação</div>
        <h1 className="text-display-md">
          API <span className="text-gradient-blue">do fundo</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          REST API pra fundos investidores consultarem operações, parcelas e
          tomarem decisões. Spec OpenAPI 3.1 em{" "}
          <Link
            href="/api/openapi"
            className="text-accent hover:underline font-mono text-xs"
          >
            /api/openapi
          </Link>
          . Quem usa: integradores dos fundos parceiros. Auth via API key
          gerada em /painel/api.
        </p>
      </div>

      {/* Swagger UI assets via CDN — leve, sem dep extra no bundle */}
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
      <Script id="swagger-init" strategy="afterInteractive">
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
    </AdminShell>
  );
}
