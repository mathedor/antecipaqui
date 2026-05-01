import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { UserCharts } from "@/components/dashboard-charts";
import { AdminCobrarButton } from "@/components/admin-cobrar-button";
import { IniciarContatoButton } from "@/components/iniciar-contato-button";
import {
  approveUserOnboardingAction,
  getUserDetail,
  getUserMonthlyStats,
  rejectUserOnboardingAction,
} from "@/lib/actions/admin";
import { blockUserAction, unblockUserAction } from "@/lib/actions/block";
import { audit, getAuditLogsByUser, getAuditLogsByTarget } from "@/lib/audit";
import { AuditLogTimeline } from "@/components/audit-log-timeline";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Admin · Usuário",
};

const TIPO_LABEL: Record<string, string> = {
  contrato_social: "Contrato social",
  comprovante_endereco: "Comprovante de endereço",
  creci: "Comprovante CRECI",
  rg: "RG",
  cpf: "CPF",
  outro: "Outro",
};

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Admin",
};

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Params = { params: Promise<{ id: string }> };

export default async function AdminUsuarioDetail({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [detail, monthly, logsActions, logsTarget] = await Promise.all([
    getUserDetail(id),
    getUserMonthlyStats(id),
    getAuditLogsByUser(id, 50),
    getAuditLogsByTarget("user", id, 50),
  ]);
  if (!detail) notFound();

  // Log da visualização (best-effort)
  audit({
    action: "view_user",
    targetType: "user",
    targetId: id,
    targetLabel: detail.user.nome ?? detail.user.email,
  }).catch(() => undefined);

  const { user, imobiliaria, documentos, operacoes, construtoras } = detail;
  const isPending = user.onboardingStatus === "documentos_enviados";

  const tipos = new Set(documentos.map((d) => d.tipo));
  const docsFaltando: string[] = [];
  if (user.role === "corretor" || user.role === "imobiliaria") {
    if (!tipos.has("contrato_social")) docsFaltando.push("Contrato social");
    if (!tipos.has("comprovante_endereco"))
      docsFaltando.push("Comprovante de endereço");
  }

  const totalAntecipado = operacoes.reduce(
    (s, op) => s + parseFloat(op.valorPresente),
    0,
  );
  const totalComissao = operacoes.reduce(
    (s, op) => s + parseFloat(op.valorComissao),
    0,
  );
  const totalLucro = operacoes.reduce(
    (s, op) => s + parseFloat(op.desagio),
    0,
  );

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
          <p className="mt-1 text-fg-muted font-mono text-sm">
            <a href={`mailto:${user.email}`} className="hover:text-accent">
              {user.email}
            </a>
            {user.telefone && (
              <>
                {" · "}
                <a href={`tel:${user.telefone}`} className="hover:text-accent">
                  {user.telefone}
                </a>
              </>
            )}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="chip">{ROLE_LABEL[user.role] ?? user.role}</span>
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
            {docsFaltando.length > 0 && (
              <span
                className="chip bg-yellow-50 text-warn border-yellow-200"
                title={`Falta: ${docsFaltando.join(", ")}`}
              >
                ⚠ docs pendentes
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <IniciarContatoButton telefone={user.telefone} nome={user.nome} />
          <Link
            href={`/admin/usuarios/${id}/editar`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-medium text-sm transition-colors"
          >
            ✎ Editar
          </Link>
          {docsFaltando.length > 0 && (
            <AdminCobrarButton target="user" id={id} variant="button" />
          )}
          {user.isActive ? (
            <form action={block}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-danger/40 text-danger hover:bg-red-50 font-medium text-sm transition-colors"
              >
                ⛔ Bloquear
              </button>
            </form>
          ) : (
            <form action={unblock}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-success/40 text-success hover:bg-green-50 font-medium text-sm transition-colors"
              >
                ✓ Desbloquear
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Aprovar onboarding KYC */}
      {isPending && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-3">
            ações administrativas
          </div>
          <h3 className="text-lg font-bold mb-1">Aprovar cadastro</h3>
          <p className="text-sm text-fg-muted mb-5">
            Confira o contrato social, comprovante de endereço e CRECI antes de
            aprovar.
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

      {/* Stats agregados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Operações totais" value={String(operacoes.length)} />
        <Stat
          label="Valor antecipado"
          value={formatBRL(totalAntecipado)}
          highlight
        />
        <Stat label="Comissão total" value={formatBRL(totalComissao)} />
        <Stat label="Deságio (lucro AQ)" value={formatBRL(totalLucro)} />
      </div>

      {/* Gráficos 12 meses */}
      <div className="mb-8">
        <UserCharts data={monthly} />
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-5">
          <Card label="Dados pessoais">
            <Grid>
              <Field label="ID" value={user.id.slice(0, 16) + "..."} mono />
              <Field label="Email" value={user.email} mono />
              <Field label="Nome" value={user.nome} />
              <Field label="Telefone" value={user.telefone} mono />
              <Field
                label="Tipo de cadastro"
                value={ROLE_LABEL[user.role] ?? user.role}
              />
              <Field label="Onboarding" value={user.onboardingStatus} />
              <Field label="Cadastrado em" value={formatDateTime(user.createdAt)} />
              <Field
                label="Atualizado em"
                value={formatDateTime(user.updatedAt)}
              />
            </Grid>
          </Card>

          {imobiliaria && (
            <Card label="Imobiliária / empresa">
              <Grid>
                <Field label="Razão social" value={imobiliaria.razaoSocial} />
                <Field
                  label="Nome fantasia"
                  value={imobiliaria.nomeFantasia}
                />
                <Field label="CNPJ" value={imobiliaria.cnpj} mono />
                <Field
                  label="CRECI responsável"
                  value={imobiliaria.creciResponsavel}
                  mono
                />
                <Field label="Telefone" value={imobiliaria.telefone} mono />
                <Field label="CEP" value={imobiliaria.cep} mono />
                <Field
                  label="Endereço"
                  value={[
                    imobiliaria.endereco,
                    imobiliaria.cidade && `${imobiliaria.cidade}/${imobiliaria.uf ?? ""}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </Grid>
              <h4 className="mt-5 mb-3 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                dados bancários (cessão)
              </h4>
              <Grid>
                <Field label="Banco" value={imobiliaria.bancoNome} />
                <Field
                  label="Código"
                  value={imobiliaria.bancoCodigo}
                  mono
                />
                <Field
                  label="Agência"
                  value={imobiliaria.bancoAgencia}
                  mono
                />
                <Field label="Conta" value={imobiliaria.bancoConta} mono />
              </Grid>
            </Card>
          )}

          <Card label={`Construtoras com quem fez negócio (${construtoras.length})`}>
            {construtoras.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Nenhuma operação ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {construtoras.map((c) => (
                  <li
                    key={c.id}
                    className="grid grid-cols-12 gap-3 px-4 py-3 rounded-xl border border-border bg-bg hover:border-accent transition-colors items-center"
                  >
                    <Link
                      href={`/admin/construtoras/${c.id}`}
                      className="col-span-6 text-sm font-semibold text-fg truncate hover:text-accent"
                    >
                      {c.nome}
                    </Link>
                    <span className="col-span-3 font-mono text-[10px] text-fg-muted truncate">
                      {c.cnpj}
                    </span>
                    <span className="col-span-1 text-right text-xs font-mono text-fg-muted">
                      {c.operacoes}x
                    </span>
                    <span className="col-span-2 text-right font-mono tabular text-xs text-fg font-semibold">
                      {formatBRL(c.valorAntecipado)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card label={`Operações (${operacoes.length})`}>
            {operacoes.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Nenhuma operação cadastrada.
              </p>
            ) : (
              <ul className="space-y-1">
                {operacoes.map((op) => (
                  <li
                    key={op.id}
                    className="border-b border-border last:border-0"
                  >
                    <Link
                      href={`/admin/operacoes/${op.id}`}
                      className="grid grid-cols-12 gap-3 py-3 hover:bg-bg-card transition-colors items-center"
                    >
                      <div className="col-span-3 font-mono text-xs text-fg">
                        {op.numero}
                      </div>
                      <div className="col-span-4 text-xs text-fg-muted truncate">
                        {op.construtoraNome ?? "—"}
                      </div>
                      <div className="col-span-2 text-right font-mono tabular text-xs text-fg font-semibold">
                        {formatBRL(parseFloat(op.valorPresente))}
                      </div>
                      <div className="col-span-3">
                        <OperacaoStatusBadge status={op.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="lg:col-span-5 space-y-5">
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
                      download
                      className="text-accent text-sm font-semibold whitespace-nowrap shrink-0"
                    >
                      baixar ↓
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {docsFaltando.length > 0 && (
              <div className="mt-4 rounded-xl border border-warn/40 bg-yellow-50 px-4 py-3 text-xs">
                <div className="font-mono text-[10px] uppercase tracking-wider text-warn mb-1">
                  faltando
                </div>
                <ul className="space-y-0.5 text-fg">
                  {docsFaltando.map((d) => (
                    <li key={d}>• {d}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card label={`Histórico de ações deste usuário (${logsActions.length})`}>
            <AuditLogTimeline
              logs={logsActions}
              emptyLabel="Sem ações registradas ainda."
            />
          </Card>

          {logsTarget.length > 0 && (
            <Card label={`Ações sobre este cadastro (${logsTarget.length})`}>
              <AuditLogTimeline logs={logsTarget} />
            </Card>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
        {label}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">{children}</div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-0.5">
        {label}
      </div>
      <div
        className={`text-sm ${mono ? "font-mono" : ""} ${
          value ? "text-fg" : "text-fg-dim italic"
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : "border-border bg-bg-elev";
  const valueColor = highlight ? "text-accent" : "text-fg";
  return (
    <div className={`rounded-2xl border p-4 ${baseClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular text-xl md:text-2xl font-bold tracking-tight ${valueColor}`}
      >
        {value}
      </div>
    </div>
  );
}
