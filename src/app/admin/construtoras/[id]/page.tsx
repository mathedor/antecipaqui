import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import {
  approveConstrutoraOnboardingAction,
  getConstrutoraDetail,
} from "@/lib/actions/admin";
import {
  blockConstrutoraAction,
  unblockConstrutoraAction,
} from "@/lib/actions/block";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Admin · Construtora",
};

const TIPO_LABEL: Record<string, string> = {
  contrato_social: "Contrato social",
  comprovante_endereco: "Comprovante de endereço",
};

type Params = { params: Promise<{ id: string }> };

export default async function AdminConstrutoraDetail({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await getConstrutoraDetail(id);
  if (!detail) notFound();

  const { construtora, owner, documentos, operacoes } = detail;
  const isPending = construtora.onboardingStatus === "documentos_enviados";

  async function approve() {
    "use server";
    await approveConstrutoraOnboardingAction(id);
  }

  async function block() {
    "use server";
    await blockConstrutoraAction(id);
  }

  async function unblock() {
    "use server";
    await unblockConstrutoraAction(id);
  }

  return (
    <AdminShell active="/admin/construtoras" userName={admin.nome}>
      <Link
        href="/admin/construtoras"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← construtoras
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-display-md">{construtora.razaoSocial}</h1>
          {construtora.nomeFantasia && (
            <p className="mt-1 text-fg-muted">{construtora.nomeFantasia}</p>
          )}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs text-fg-muted">
              CNPJ {construtora.cnpj}
            </span>
            <span className="size-1 rounded-full bg-fg-dim" />
            <span
              className={`chip ${
                construtora.onboardingStatus === "aprovado"
                  ? "chip-success"
                  : construtora.onboardingStatus === "documentos_enviados"
                    ? "chip-accent"
                    : ""
              }`}
            >
              {construtora.onboardingStatus}
            </span>
            {!construtora.isActive && (
              <span className="chip bg-red-50 border-danger/40 text-danger">
                ⛔ bloqueada
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {construtora.isActive ? (
            <form action={block}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-danger/40 text-danger hover:bg-red-50 font-medium text-sm transition-colors"
              >
                ⛔ Bloquear cadastro
              </button>
            </form>
          ) : (
            <form action={unblock}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-success/40 text-success hover:bg-green-50 font-medium text-sm transition-colors"
              >
                ✓ Desbloquear cadastro
              </button>
            </form>
          )}
        </div>
      </div>

      {isPending && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-3">
            ações administrativas
          </div>
          <h3 className="text-lg font-bold mb-1">Aprovar construtora</h3>
          <p className="text-sm text-fg-muted mb-5">
            Confira o contrato social e comprovante de endereço.
          </p>
          <form action={approve}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-success text-white font-semibold text-sm hover:bg-green-700 transition-colors"
            >
              ✓ Aprovar construtora
            </button>
          </form>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-5">
          <Card label="Dados">
            {owner && (
              <>
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
                  responsável
                </div>
                <div className="text-fg">{owner.nome ?? owner.email}</div>
                <div className="font-mono text-xs text-fg-muted">{owner.email}</div>
                <div className="mt-3 pt-3 border-t border-border" />
              </>
            )}
            {!owner && (
              <div className="rounded-xl border border-warn/40 bg-yellow-50 p-3 text-sm text-warn mb-4">
                Sem dono — provavelmente cadastrada por um corretor durante operação.
              </div>
            )}
            {construtora.endereco && (
              <div className="text-sm text-fg-muted">
                {construtora.endereco}, {construtora.cidade}/{construtora.uf} ·{" "}
                {construtora.cep}
              </div>
            )}
            {construtora.telefone && (
              <div className="mt-1 font-mono text-sm text-fg-muted">
                {construtora.telefone}
              </div>
            )}
            {construtora.email && (
              <div className="mt-1 font-mono text-sm text-fg-muted">
                {construtora.email}
              </div>
            )}
          </Card>

          <Card label={`Operações (${operacoes.length})`}>
            {operacoes.length === 0 ? (
              <p className="text-sm text-fg-muted">Nenhuma operação ainda.</p>
            ) : (
              <ul className="space-y-1">
                {operacoes.map((op) => (
                  <li key={op.id} className="border-b border-border last:border-0">
                    <Link
                      href={`/admin/operacoes/${op.id}`}
                      className="grid grid-cols-12 gap-3 py-3 hover:bg-bg-card transition-colors items-center"
                    >
                      <div className="col-span-3 font-mono text-xs text-fg">
                        {op.numero}
                      </div>
                      <div className="col-span-5 text-right font-mono tabular text-sm text-fg">
                        {formatBRL(parseFloat(op.valorComissao))}
                      </div>
                      <div className="col-span-4">
                        <OperacaoStatusBadge status={op.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="lg:col-span-5">
          <Card label="Documentos">
            {documentos.length === 0 ? (
              <p className="text-sm text-fg-muted">Nenhum documento.</p>
            ) : (
              <ul className="space-y-2">
                {documentos.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-bg hover:border-accent transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-0.5">
                        {TIPO_LABEL[d.tipo] ?? d.tipo}
                      </div>
                      <div className="text-sm text-fg truncate">
                        {d.nomeOriginal}
                      </div>
                    </div>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener"
                      className="text-accent text-sm font-semibold whitespace-nowrap shrink-0"
                    >
                      abrir ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
        {label}
      </div>
      {children}
    </section>
  );
}
