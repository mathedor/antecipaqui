import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { AdminAprovarRecusar } from "@/components/admin-aprovar-recusar";
import { formatBRL, formatPercent } from "@/lib/format";
import { getAdminOperacaoDetail } from "@/lib/actions/admin";

export const metadata = {
  title: "Admin · Detalhe da operação",
};

const TIPO_LABEL: Record<string, string> = {
  contrato_venda: "Contrato de compra e venda",
  contrato_comissao: "Contrato de comissionamento",
  nota_fiscal: "Nota fiscal",
  contrato_social: "Contrato social",
  comprovante_endereco: "Comprovante de endereço",
  creci: "Comprovante CRECI",
};

const EVENT_LABEL: Record<string, string> = {
  operacao_created: "Operação criada",
  approved_by_admin: "Aprovada pelo admin",
  rejected_by_admin: "Recusada pelo admin",
};

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}
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

export default async function AdminOperacaoDetail({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const op = await getAdminOperacaoDetail(id);
  if (!op) notFound();

  const taxa = parseFloat(op.taxaMensal);

  return (
    <AdminShell active="/admin/operacoes" userName={admin.nome}>
      <Link
        href="/admin/operacoes"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← operações
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-display-md font-mono">{op.numero}</h1>
            <OperacaoStatusBadge status={op.status} />
          </div>
          <p className="text-fg-muted text-sm">
            Criada em {formatDateTime(op.createdAt)}
            {op.aprovadoEm && (
              <>
                {" · "}
                Decidida em {formatDateTime(op.aprovadoEm)}
              </>
            )}
          </p>
        </div>
      </div>

      {op.status === "recusada" && op.motivoRecusa && (
        <div className="rounded-2xl border border-danger/40 bg-red-50 p-5 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-danger mb-2">
            motivo da recusa
          </div>
          <p className="text-fg">{op.motivoRecusa}</p>
        </div>
      )}

      {/* Aprovar / recusar */}
      <div className="mb-8">
        <AdminAprovarRecusar
          operacaoId={op.id}
          isPending={op.status === "em_analise"}
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-5">
          <Card label="Cedente · corretor / imobiliária">
            <div className="text-base font-bold">
              {op.corretorNome ?? "—"}
            </div>
            <div className="mt-1 text-sm text-fg-muted">{op.corretorEmail}</div>
            {op.corretorTelefone && (
              <div className="text-sm text-fg-muted font-mono">
                {op.corretorTelefone}
              </div>
            )}
            <div className="mt-3 font-mono text-[10px] text-fg-dim">
              user · {op.corretorUserId.slice(0, 24)}
            </div>
          </Card>

          <Card label="Devedora · construtora">
            <div className="text-base font-bold">
              {op.construtoraNome ?? "—"}
            </div>
            <div className="mt-1 font-mono text-xs text-fg-muted">
              CNPJ {op.construtoraCnpj ?? "—"}
            </div>
            {op.construtoraTelefone && (
              <div className="text-sm text-fg-muted font-mono">
                {op.construtoraTelefone}
              </div>
            )}
          </Card>

          <Card label="Resumo financeiro">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Venda" value={formatBRL(parseFloat(op.valorVenda))} />
              <Stat
                label="Comissão"
                value={formatBRL(parseFloat(op.valorComissao))}
              />
              <Stat
                label="VP"
                value={formatBRL(parseFloat(op.valorPresente))}
                highlight
              />
              <Stat
                label="Deságio"
                value={formatBRL(parseFloat(op.desagio))}
                tone="warn"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
              <Stat label="Data venda" value={formatDate(op.dataVenda)} />
              <Stat label="Parcelas" value={`${op.numeroParcelas}x`} />
              <Stat label="Taxa" value={`${formatPercent(taxa)} a.m.`} />
              <Stat
                label="% deságio"
                value={`${(((parseFloat(op.desagio)) / parseFloat(op.valorComissao)) * 100).toFixed(2)}%`}
              />
            </div>
          </Card>

          <Card label={`Parcelas (${op.parcelas.length})`}>
            <ul className="space-y-2">
              {op.parcelas.map((p) => (
                <li
                  key={p.id}
                  className="grid grid-cols-12 gap-3 items-center text-sm py-2 border-b border-border last:border-0"
                >
                  <span className="col-span-1 font-mono text-xs text-fg-dim">
                    #{String(p.numero).padStart(2, "0")}
                  </span>
                  <span className="col-span-4 text-fg">
                    {formatDate(p.vencimento)}
                  </span>
                  <span className="col-span-4 text-right font-mono tabular text-fg-muted">
                    {formatBRL(parseFloat(p.valor))}
                  </span>
                  <span className="col-span-3 text-right font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="lg:col-span-5 space-y-5">
          <Card label="Documentos anexados">
            {op.documentos.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Nenhum documento anexado.
              </p>
            ) : (
              <ul className="space-y-2">
                {op.documentos.map((d) => (
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

          <Card label="Histórico de eventos">
            {op.events.length === 0 ? (
              <p className="text-sm text-fg-muted">Sem eventos.</p>
            ) : (
              <ol className="space-y-3 text-sm">
                {op.events.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="size-2 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="text-fg">
                        {EVENT_LABEL[e.type] ?? e.type}
                      </div>
                      <div className="text-xs text-fg-muted font-mono">
                        {formatDateTime(e.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
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

function Stat({
  label,
  value,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "warn";
}) {
  const valueColor =
    tone === "warn" ? "text-warn" : highlight ? "text-accent" : "text-fg";
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
        {label}
      </div>
      <div className={`font-mono tabular text-base font-bold ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
