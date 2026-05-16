import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { IniciarContatoButton } from "@/components/iniciar-contato-button";
import { getComercialDetail } from "@/lib/actions/comerciais";
import { audit } from "@/lib/audit";
import { maskCNPJ, maskCPF } from "@/lib/cnpj";

export const metadata = { title: "Admin · Comercial" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminComercialDetail({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await getComercialDetail(id);
  if (!detail) notFound();

  const { comercial, owner } = detail;
  const isPF = comercial.tipoPessoa === "fisica";
  const documento = isPF
    ? maskCPF(comercial.documento)
    : maskCNPJ(comercial.documento);

  audit({
    action: "view_comercial",
    targetType: "comercial",
    targetId: id,
    targetLabel: comercial.nomeCompleto,
  }).catch(() => undefined);

  const enderecoCompleto = [
    comercial.endereco,
    comercial.cidade,
    comercial.uf,
    comercial.cep && `CEP ${comercial.cep}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AdminShell active="/admin/comerciais" userName={admin.nome}>
      <Link
        href="/admin/comerciais"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← comerciais
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-display-md">{comercial.nomeCompleto}</h1>
          {comercial.apelido && (
            <p className="mt-1 text-fg-muted">{comercial.apelido}</p>
          )}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span
              className={`chip text-[10px] ${
                isPF
                  ? "bg-accent-soft text-accent border-accent/30"
                  : "bg-violet-50 text-violet-700 border-violet-200"
              }`}
            >
              {isPF ? "Pessoa Física" : "Pessoa Jurídica"}
            </span>
            <span className="font-mono text-xs text-fg-muted">
              {isPF ? "CPF" : "CNPJ"} {documento}
            </span>
            {!comercial.isActive && (
              <span className="chip bg-red-50 border-danger/40 text-danger">
                ⛔ inativo
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <IniciarContatoButton
            telefone={comercial.telefone}
            nome={comercial.nomeCompleto}
          />
          <Link
            href={`/admin/comerciais/${id}/desempenho`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-accent text-white hover:bg-accent-dark font-semibold text-sm transition-colors"
          >
            📊 Desempenho 360
          </Link>
          <Link
            href={`/admin/comerciais/${id}/editar`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-medium text-sm transition-colors"
          >
            ✎ Editar
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card label="Identificação">
          <Grid>
            <FieldR
              label={isPF ? "Nome completo" : "Razão social"}
              value={comercial.nomeCompleto}
            />
            <FieldR
              label={isPF ? "Apelido" : "Nome fantasia"}
              value={comercial.apelido}
            />
            <FieldR label={isPF ? "CPF" : "CNPJ"} value={documento} mono />
            <FieldR label="Endereço" value={enderecoCompleto || null} />
          </Grid>
        </Card>

        <Card label="Contato e login">
          <Grid>
            <FieldR label="Email" value={comercial.email} mono />
            <FieldR label="Telefone" value={comercial.telefone} mono />
            <FieldR
              label="Login Clerk"
              value={
                owner
                  ? `${owner.email} (${owner.id.startsWith("invited_") ? "convite enviado" : "ativo"})`
                  : "convite ainda não aceito"
              }
            />
          </Grid>
        </Card>
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

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}

function FieldR({
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
        className={`text-sm break-all ${mono ? "font-mono" : ""} ${
          value ? "text-fg" : "text-fg-dim italic"
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}
