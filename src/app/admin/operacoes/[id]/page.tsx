import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { AdminStatusFlow } from "@/components/admin-status-flow";
import { ContratoCard } from "@/components/contrato-card";
import { NotificarWhatsappButton } from "@/components/notificar-whatsapp-button";
import { formatBRL, formatPercent } from "@/lib/format";
import { getAdminOperacaoDetail } from "@/lib/actions/admin";
import { getContratoForOperacao } from "@/lib/actions/contract";
import { listFundosForSelector } from "@/lib/actions/fundos";

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
  cpf: "CPF",
  rg: "RG",
  outro: "Outro",
};

const EVENT_LABEL: Record<string, string> = {
  operacao_created: "Operação criada",
  approved_by_admin: "Aprovada pelo admin",
  rejected_by_admin: "Recusada pelo admin",
  contract_generated: "Contrato gerado",
  contract_regenerated: "Contrato regerado",
  contract_generation_failed: "Falha ao gerar contrato",
  status_changed_to_aguardando_aprovacao: "Status → aguardando aprovação",
  status_changed_to_documentos_incompletos: "Status → documentos incompletos",
  status_changed_to_pre_aprovada: "Status → pré-aprovada",
  status_changed_to_analise_final: "Status → análise final",
  status_changed_to_recusada: "Status → recusada",
  status_changed_to_enviada_para_assinatura: "Status → enviada p/ assinatura",
  status_changed_to_enviada_para_pagamento: "Status → enviada p/ pagamento",
  status_changed_to_realizada: "Status → realizada",
  status_changed_to_cancelada: "Status → cancelada",
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
  const [op, contrato, fundos] = await Promise.all([
    getAdminOperacaoDetail(id),
    getContratoForOperacao(id),
    listFundosForSelector(),
  ]);
  if (!op) notFound();

  const taxa = parseFloat(op.taxaMensal);

  const enderecoConstrutora = [
    op.construtoraEndereco,
    op.construtoraCidade,
    op.construtoraUf,
    op.construtoraCep && `CEP ${op.construtoraCep}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const enderecoImobiliaria = op.imobiliaria
    ? [
        op.imobiliaria.endereco,
        op.imobiliaria.cidade,
        op.imobiliaria.uf,
        op.imobiliaria.cep && `CEP ${op.imobiliaria.cep}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

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
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-display-md font-mono">{op.numero}</h1>
            <OperacaoStatusBadge status={op.status} />
            {op.fundoId ? (
              (() => {
                const f = fundos.find((x) => x.id === op.fundoId);
                return f ? (
                  <Link
                    href={`/admin/fundos/${f.id}`}
                    className="chip chip-accent hover:underline"
                  >
                    🏦 {f.nomeFantasia ?? f.razaoSocial}
                  </Link>
                ) : null;
              })()
            ) : (
              <span className="chip bg-yellow-50 text-warn border-yellow-200">
                ⚠ sem fundo
              </span>
            )}
          </div>
          <p className="text-fg-muted text-sm">
            Criada em {formatDateTime(op.createdAt)}
            {op.aprovadoEm && (
              <>
                {" · "}
                Decidida em {formatDateTime(op.aprovadoEm)}
              </>
            )}
            {op.liquidadoEm && (
              <>
                {" · "}
                Liquidada em {formatDateTime(op.liquidadoEm)}
              </>
            )}
          </p>
        </div>
        <Link
          href={`/admin/operacoes/${op.id}/editar`}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-medium text-sm transition-colors"
        >
          ✎ Editar valores
        </Link>
      </div>

      {/* Banners de motivo */}
      {op.status === "documentos_incompletos" && op.motivoPendencia && (
        <div className="rounded-2xl border border-orange-300 bg-orange-50 p-5 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-warn mb-2">
            pendência de documentos
          </div>
          <p className="text-fg whitespace-pre-line">{op.motivoPendencia}</p>
        </div>
      )}

      {(op.status === "recusada" || op.status === "cancelada") &&
        op.motivoRecusa && (
          <div className="rounded-2xl border border-danger/40 bg-red-50 p-5 mb-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-danger mb-2">
              motivo {op.status === "cancelada" ? "do cancelamento" : "da recusa"}
            </div>
            <p className="text-fg whitespace-pre-line">{op.motivoRecusa}</p>
          </div>
        )}

      {/* Fluxo de status (admin) */}
      <div className="mb-6">
        <AdminStatusFlow
          operacaoId={op.id}
          currentStatus={op.status}
          currentTaxaMensal={parseFloat(op.taxaMensal)}
          valorComissao={parseFloat(op.valorComissao)}
          valorPresente={parseFloat(op.valorPresente)}
          parcelas={op.parcelas.map((p) => ({
            valor: p.valor,
            vencimento: p.vencimento,
          }))}
          currentCashbackPercent={
            op.cashbackPercent ? parseFloat(op.cashbackPercent) : null
          }
          fundos={fundos}
          currentFundoId={op.fundoId}
        />
      </div>

      {contrato && (
        <div className="mb-6">
          <ContratoCard
            pdfUrl={contrato.pdfUrl}
            createdAt={contrato.createdAt}
            status={contrato.status}
            signers={contrato.signers}
            zapsignDocumentToken={contrato.zapsignDocumentToken}
            adminMode
            operacaoId={op.id}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-5">
          <Card label="Cedente · corretor / imobiliária">
            <div className="space-y-3">
              <div>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-fg-dim mb-0.5">
                      Responsável
                    </div>
                    <div className="text-base font-bold">
                      {op.corretorNome ?? "—"}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
                      <a
                        href={`mailto:${op.corretorEmail}`}
                        className="hover:text-accent"
                      >
                        {op.corretorEmail}
                      </a>
                      {op.corretorTelefone && (
                        <a
                          href={`tel:${op.corretorTelefone}`}
                          className="font-mono hover:text-accent"
                        >
                          {op.corretorTelefone}
                        </a>
                      )}
                    </div>
                  </div>
                  <NotificarWhatsappButton
                    target="corretor"
                    phone={op.corretorTelefone ?? op.imobiliaria?.telefone}
                    destinatarioNome={op.corretorNome}
                    operacao={{
                      numero: op.numero,
                      status: op.status,
                      valorPresente: parseFloat(op.valorPresente),
                      valorComissao: parseFloat(op.valorComissao),
                      construtoraNome: op.construtoraNome,
                      corretorNome: op.corretorNome,
                      motivoPendencia: op.motivoPendencia,
                      motivoRecusa: op.motivoRecusa,
                    }}
                  />
                </div>
              </div>

              {op.imobiliaria && (
                <>
                  <div className="border-t border-border pt-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-fg-dim mb-0.5">
                      Imobiliária PJ
                    </div>
                    <div className="text-base font-semibold">
                      {op.imobiliaria.razaoSocial}
                      {op.imobiliaria.nomeFantasia && (
                        <span className="text-fg-muted font-normal">
                          {" · "}
                          {op.imobiliaria.nomeFantasia}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
                      <span className="font-mono text-xs">
                        CNPJ {op.imobiliaria.cnpj}
                      </span>
                      {op.imobiliaria.creciResponsavel && (
                        <span className="font-mono text-xs">
                          CRECI {op.imobiliaria.creciResponsavel}
                        </span>
                      )}
                      {op.imobiliaria.telefone && (
                        <a
                          href={`tel:${op.imobiliaria.telefone}`}
                          className="font-mono text-xs hover:text-accent"
                        >
                          {op.imobiliaria.telefone}
                        </a>
                      )}
                    </div>
                    {enderecoImobiliaria && (
                      <div className="mt-1 text-sm text-fg-muted">
                        {enderecoImobiliaria}
                      </div>
                    )}
                  </div>

                  {(op.imobiliaria.bancoNome ||
                    op.imobiliaria.bancoAgencia ||
                    op.imobiliaria.bancoConta) && (
                    <div className="border-t border-border pt-3">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-fg-dim mb-1">
                        Dados bancários (cessão)
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <Field label="Banco" value={op.imobiliaria.bancoNome} />
                        <Field
                          label="Código"
                          value={op.imobiliaria.bancoCodigo}
                          mono
                        />
                        <Field
                          label="Agência"
                          value={op.imobiliaria.bancoAgencia}
                          mono
                        />
                        <Field
                          label="Conta"
                          value={op.imobiliaria.bancoConta}
                          mono
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card label="Devedora · construtora">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="text-base font-bold">
                  {op.construtoraNome ?? "—"}
                  {op.construtoraNomeFantasia && (
                    <span className="text-fg-muted font-normal">
                      {" · "}
                      {op.construtoraNomeFantasia}
                    </span>
                  )}
                </div>
                <NotificarWhatsappButton
                  target="construtora"
                  phone={
                    op.construtoraOwner?.telefone ?? op.construtoraTelefone
                  }
                  destinatarioNome={
                    op.construtoraOwner?.nome ?? op.construtoraNome
                  }
                  operacao={{
                    numero: op.numero,
                    status: op.status,
                    valorPresente: parseFloat(op.valorPresente),
                    valorComissao: parseFloat(op.valorComissao),
                    construtoraNome: op.construtoraNome,
                    corretorNome: op.corretorNome,
                    motivoPendencia: op.motivoPendencia,
                    motivoRecusa: op.motivoRecusa,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
                <span className="font-mono text-xs">
                  CNPJ {op.construtoraCnpj ?? "—"}
                </span>
                {op.construtoraEmail && (
                  <a
                    href={`mailto:${op.construtoraEmail}`}
                    className="hover:text-accent"
                  >
                    {op.construtoraEmail}
                  </a>
                )}
                {op.construtoraTelefone && (
                  <a
                    href={`tel:${op.construtoraTelefone}`}
                    className="font-mono hover:text-accent"
                  >
                    {op.construtoraTelefone}
                  </a>
                )}
              </div>
              {enderecoConstrutora && (
                <div className="text-sm text-fg-muted">{enderecoConstrutora}</div>
              )}
              {op.construtoraOwner ? (
                <div className="border-t border-border pt-3 mt-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-fg-dim mb-0.5">
                    Responsável cadastrado
                  </div>
                  <div className="text-sm font-semibold">
                    {op.construtoraOwner.nome ?? "—"}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
                    <a
                      href={`mailto:${op.construtoraOwner.email}`}
                      className="hover:text-accent"
                    >
                      {op.construtoraOwner.email}
                    </a>
                    {op.construtoraOwner.telefone && (
                      <a
                        href={`tel:${op.construtoraOwner.telefone}`}
                        className="font-mono hover:text-accent"
                      >
                        {op.construtoraOwner.telefone}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-t border-border pt-3 mt-2 text-sm text-fg-dim italic">
                  Construtora ainda sem usuário cadastrado — outreach manual via
                  email/telefone acima.
                </div>
              )}
            </div>
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
          <Card label={`Documentos anexados (${op.documentos.length})`}>
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
                      download
                      className="text-accent text-sm font-semibold whitespace-nowrap shrink-0"
                    >
                      baixar ↓
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
