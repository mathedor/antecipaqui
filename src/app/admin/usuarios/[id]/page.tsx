import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import {
  approveUserOnboardingAction,
  getUserDetail,
  rejectUserOnboardingAction,
} from "@/lib/actions/admin";
import { blockUserAction, unblockUserAction } from "@/lib/actions/block";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Admin · Usuário",
};

const TIPO_LABEL: Record<string, string> = {
  contrato_social: "Contrato social",
  comprovante_endereco: "Comprovante de endereço",
  creci: "Comprovante CRECI",
};

type Params = { params: Promise<{ id: string }> };

export default async function AdminUsuarioDetail({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { user, imobiliaria, documentos, operacoes } = detail;
  const isPending = user.onboardingStatus === "documentos_enviados";

  async function approve() {
    "use server";
    await approveUserOnboardingAction(id);
  }

  async function block() {
    "use server";
    await blockUserAction(id);
  }

  async function unblock() {
    "use server";
    await unblockUserAction(id);
  }

  return (
    <AdminShell active="/admin/usuarios" userName={admin.nome}>
      <Link
        href="/admin/usuarios"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← usuários
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-display-md">{user.nome ?? user.email}</h1>
          <p className="mt-1 text-fg-muted font-mono text-sm">{user.email}</p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="chip">{user.role}</span>
            <span
              className={`chip ${
                user.onboardingStatus === "aprovado"
                  ? "chip-success"
                  : user.onboardingStatus === "documentos_enviados"
                    ? "chip-accent"
                    : ""
              }`}
            >
              {user.onboardingStatus}
            </span>
            {!user.isActive && (
              <span className="chip bg-red-50 border-danger/40 text-danger">
                ⛔ bloqueado
              </span>
            )}
            {user.telefone && (
              <span className="font-mono text-[11px] text-fg-muted">
                {user.telefone}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/usuarios/${id}/editar`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-medium text-sm transition-colors"
          >
            ✎ Editar
          </Link>
          {user.isActive ? (
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

      {/* Aprovar onboarding */}
      {isPending && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-3">
            ações administrativas
          </div>
          <h3 className="text-lg font-bold mb-1">Aprovar cadastro</h3>
          <p className="text-sm text-fg-muted mb-5">
            Confira o contrato social, comprovante de endereço e CRECI antes de aprovar.
          </p>
          <div className="flex gap-3 flex-wrap">
            <form action={approve}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-success text-white font-semibold text-sm hover:bg-green-700 transition-colors"
              >
                ✓ Aprovar cadastro
              </button>
            </form>
            <form action={rejectUserOnboardingAction}>
              <input type="hidden" name="userId" value={id} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-danger/40 text-danger hover:bg-red-50 font-semibold text-sm transition-colors"
              >
                ✕ Recusar
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-5">
          {imobiliaria && (
            <Card label="Empresa">
              <div className="text-base font-bold">{imobiliaria.razaoSocial}</div>
              <div className="mt-1 font-mono text-xs text-fg-muted">
                CNPJ {imobiliaria.cnpj}
              </div>
              {imobiliaria.creciResponsavel && (
                <div className="mt-1 text-sm text-fg-muted">
                  CRECI: {imobiliaria.creciResponsavel}
                </div>
              )}
              <div className="mt-3 text-sm text-fg-muted">
                {imobiliaria.endereco}, {imobiliaria.cidade}/{imobiliaria.uf} ·{" "}
                {imobiliaria.cep}
              </div>
            </Card>
          )}

          <Card label={`Operações (${operacoes.length})`}>
            {operacoes.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Nenhuma operação cadastrada.
              </p>
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
                        {formatBRL(parseFloat(op.valorPresente))}
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
          <Card label="Documentos KYC">
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
