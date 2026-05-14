import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listApiKeys } from "@/lib/actions/fundo-api-keys";
import { CriarApiKeyForm } from "@/components/criar-api-key-form";
import { RevogarApiKeyButton } from "@/components/revogar-api-key-button";

export const metadata = { title: "API · Painel do fundo" };
export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PainelApiPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "fundo") redirect("/painel");

  const keys = await listApiKeys();

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/api">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel do fundo · integração</div>
        <h1 className="text-display-md">
          API de <span className="text-gradient-blue">integração</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-3xl">
          Use a API REST pra sincronizar operações, parcelas e decisões com o
          seu próprio sistema. Cada API key é vinculada exclusivamente ao seu
          fundo — não vê dados de outros fundos.
        </p>
      </div>

      <section className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6 mb-6 max-w-4xl">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="text-3xl shrink-0">📖</div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold">Documentação completa (Swagger UI)</h2>
            <p className="text-xs text-fg-muted mt-1">
              Todos os endpoints, parâmetros, respostas e botão{" "}
              <strong>Try it out</strong> pra testar direto no navegador (precisa
              colar sua API key no botão Authorize).
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <a
                href="/docs/api"
                target="_blank"
                rel="noreferrer"
                className="h-9 px-4 inline-flex items-center rounded-lg bg-accent text-white font-semibold text-xs hover:bg-accent-dark"
              >
                Abrir docs →
              </a>
              <a
                href="/api/openapi"
                target="_blank"
                rel="noreferrer"
                className="h-9 px-4 inline-flex items-center rounded-lg border border-border bg-white text-xs hover:border-accent font-mono"
              >
                Baixar OpenAPI JSON
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-8 mb-6 max-w-4xl">
        <h2 className="text-xl font-bold tracking-tight mb-1">
          Gerar nova API key
        </h2>
        <p className="text-sm text-fg-muted mb-5">
          O token completo só aparece UMA vez na criação. Guarde em local
          seguro — não conseguimos mostrar de novo.
        </p>
        <CriarApiKeyForm />
      </section>

      <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-8 mb-6 max-w-4xl">
        <h2 className="text-xl font-bold tracking-tight mb-4">
          Keys ativas ({keys.filter((k) => !k.revokedAt).length})
        </h2>
        {keys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-bg p-6 text-center text-fg-muted text-sm">
            Nenhuma key criada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div
                key={k.id}
                className={`rounded-xl border p-4 ${
                  k.revokedAt
                    ? "border-border bg-bg opacity-60"
                    : "border-border-strong bg-bg"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-fg">{k.nome}</strong>
                      <span className="font-mono text-xs text-fg-dim bg-bg-soft px-2 py-0.5 rounded border border-border">
                        {k.prefix}…
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          k.escopo === "read_write"
                            ? "bg-yellow-50 text-warn border-warn/30"
                            : "bg-blue-50 text-accent border-accent/30"
                        }`}
                      >
                        {k.escopo === "read_write"
                          ? "ler+escrever"
                          : "somente leitura"}
                      </span>
                      {k.revokedAt && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border bg-red-50 text-danger border-danger/30">
                          revogada
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-fg-muted mt-1 font-mono">
                      criada em {fmtDate(k.createdAt)} · último uso{" "}
                      {fmtDate(k.lastUsedAt)}
                      {k.revokedAt &&
                        ` · revogada em ${fmtDate(k.revokedAt)}`}
                    </div>
                  </div>
                  {!k.revokedAt && <RevogarApiKeyButton keyId={k.id} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-8 max-w-4xl">
        <h2 className="text-xl font-bold tracking-tight mb-3">Documentação</h2>
        <p className="text-sm text-fg-muted mb-5">
          Base URL: <code className="font-mono text-fg">https://www.antecipaqui.digital/api/external/fundo</code>
          {" · "}
          Auth: header <code className="font-mono text-fg">Authorization: Bearer aq_...</code>
        </p>

        <div className="space-y-4">
          <Endpoint
            method="GET"
            path="/me"
            desc="Dados do fundo autenticado + estatísticas resumidas."
            example={`curl -H "Authorization: Bearer $TOKEN" \\\n  https://www.antecipaqui.digital/api/external/fundo/me`}
          />
          <Endpoint
            method="GET"
            path="/operacoes"
            desc="Lista operações. Filtros: status, fundoAprovacao, limit, offset."
            example={`curl -H "Authorization: Bearer $TOKEN" \\\n  "https://www.antecipaqui.digital/api/external/fundo/operacoes?fundoAprovacao=pendente&limit=50"`}
          />
          <Endpoint
            method="GET"
            path="/operacoes/{id}"
            desc="Detalhe completo de uma operação + parcelas + custos."
            example={`curl -H "Authorization: Bearer $TOKEN" \\\n  https://www.antecipaqui.digital/api/external/fundo/operacoes/$ID`}
          />
          <Endpoint
            method="POST"
            path="/operacoes/{id}/decisao"
            desc="Aprovar ou recusar operação pendente. Requer escopo read_write."
            example={`curl -X POST -H "Authorization: Bearer $TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"decisao":"aprovada"}' \\\n  https://www.antecipaqui.digital/api/external/fundo/operacoes/$ID/decisao`}
          />
          <Endpoint
            method="GET"
            path="/parcelas"
            desc="Lista parcelas. Filtros: status, vencimentoDe/Ate, operacaoId, limit, offset."
            example={`curl -H "Authorization: Bearer $TOKEN" \\\n  "https://www.antecipaqui.digital/api/external/fundo/parcelas?status=a_vencer&vencimentoDe=2026-05-01&vencimentoAte=2026-05-31"`}
          />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-bg p-4 text-xs text-fg-muted">
          <strong className="text-fg">Códigos de erro:</strong> 401
          unauthorized · 403 forbidden (escopo insuficiente) · 404 not_found ·
          400 bad_request. Todas as respostas em JSON.
        </div>
      </section>
    </PainelShell>
  );
}

function Endpoint({
  method,
  path,
  desc,
  example,
}: {
  method: "GET" | "POST";
  path: string;
  desc: string;
  example: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
            method === "GET"
              ? "bg-blue-100 text-accent"
              : "bg-yellow-100 text-warn"
          }`}
        >
          {method}
        </span>
        <code className="font-mono text-sm text-fg">{path}</code>
      </div>
      <p className="text-xs text-fg-muted mb-2">{desc}</p>
      <pre className="rounded-lg bg-bg-soft border border-border-strong p-3 text-[11px] font-mono text-fg overflow-x-auto whitespace-pre">
        {example}
      </pre>
    </div>
  );
}
