import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listEventosWebhook } from "@/lib/actions/webhooks";
import { db } from "@/db";
import { webhooksSubscriptions } from "@/db/schema";

export const metadata = { title: "Logs do webhook" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  entregue: "bg-green-50 border-success/40 text-success",
  pendente: "bg-yellow-50 border-warn/40 text-warn",
  falhou: "bg-orange-50 border-orange-400/40 text-orange-700",
  desistido: "bg-red-50 border-danger/40 text-danger",
};

function fmtDT(d: Date | string | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type PageProps = { params: Promise<{ id: string }> };

export default async function WebhookLogsPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireActiveUser();
  if (user.role !== "fundo" && user.role !== "admin") redirect("/painel");

  const [sub] = await db
    .select()
    .from(webhooksSubscriptions)
    .where(eq(webhooksSubscriptions.id, id))
    .limit(1);
  if (!sub) notFound();
  if (user.role !== "admin" && sub.ownerUserId !== user.id) redirect("/painel");

  const eventos = await listEventosWebhook(id, 50);
  const stats = {
    total: eventos.length,
    entregues: eventos.filter((e) => e.status === "entregue").length,
    pendentes: eventos.filter((e) => e.status === "pendente").length,
    falhas: eventos.filter((e) => e.status === "falhou").length,
    desistidos: eventos.filter((e) => e.status === "desistido").length,
  };

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/webhooks">
      <div className="mb-6">
        <div className="eyebrow mb-2">webhooks · auditoria</div>
        <h1 className="text-display-md">
          Logs de <span className="text-gradient-blue">{sub.nome}</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-3xl text-sm">
          Histórico de entregas (últimos 50 eventos) com status, tentativas,
          erro retornado e horário. Use pra debugar problemas de integração no
          seu endpoint.
        </p>
        <code className="font-mono text-[10px] text-fg-muted block mt-2 break-all">
          {sub.targetUrl}
        </code>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="total" value={stats.total} />
        <Stat label="entregues" value={stats.entregues} tone="success" />
        <Stat label="pendentes" value={stats.pendentes} tone="warn" />
        <Stat label="falhas" value={stats.falhas} tone="orange" />
        <Stat label="desistidos" value={stats.desistidos} tone="danger" />
      </div>

      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
        <h2 className="text-lg font-bold tracking-tight mb-4">
          Últimos eventos ({eventos.length})
        </h2>
        {eventos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-bg p-6 text-center text-sm text-fg-muted">
            Nenhum evento entregue ainda. Quando houver atividade na sua conta
            ou você acionar &quot;testar webhook&quot;, vai aparecer aqui.
          </div>
        ) : (
          <ul className="space-y-2">
            {eventos.map((ev) => {
              const style =
                STATUS_STYLE[ev.status] ??
                "bg-bg-card border-border text-fg-muted";
              return (
                <li
                  key={ev.id}
                  className="rounded-xl border border-border bg-bg p-4"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider font-semibold ${style}`}
                        >
                          {ev.status}
                        </span>
                        <code className="font-mono text-xs text-fg font-semibold">
                          {ev.evento}
                        </code>
                        <span className="text-[10px] text-fg-dim font-mono">
                          {ev.tentativas} tentativa
                          {ev.tentativas === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="text-[10px] text-fg-dim font-mono mt-1">
                        criado {fmtDT(ev.createdAt)}
                        {ev.deliveredAt && (
                          <> · entregue {fmtDT(ev.deliveredAt)}</>
                        )}
                        {ev.proximaTentativaEm && ev.status === "falhou" && (
                          <> · próxima tentativa {fmtDT(ev.proximaTentativaEm)}</>
                        )}
                      </div>
                    </div>
                  </div>
                  {ev.ultimoErro && (
                    <div className="rounded-lg bg-red-50 border border-danger/30 p-2 mb-2">
                      <div className="text-[10px] uppercase tracking-wider font-mono text-danger mb-1">
                        último erro
                      </div>
                      <code className="font-mono text-[11px] text-danger break-words">
                        {ev.ultimoErro}
                      </code>
                    </div>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-fg-muted hover:text-fg select-none">
                      payload enviado
                    </summary>
                    <pre className="mt-2 rounded-lg bg-bg-soft border border-border-strong p-3 text-[11px] font-mono text-fg overflow-x-auto">
                      {JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-fg-muted">
        <Link href="/painel/webhooks" className="text-accent hover:underline">
          ← voltar pra lista de webhooks
        </Link>
      </p>
    </PainelShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warn" | "danger" | "orange";
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : tone === "danger"
          ? "text-danger"
          : tone === "orange"
            ? "text-orange-700"
            : "text-fg";
  return (
    <div className="rounded-xl border border-border bg-bg-elev p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className={`text-2xl font-bold tabular ${toneCls}`}>{value}</div>
    </div>
  );
}
